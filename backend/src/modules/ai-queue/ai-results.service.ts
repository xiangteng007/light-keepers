import {
    Injectable,
    ConflictException,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AiJob, AiJobStatus, AiResult } from './entities';
import { AcceptAiResultDto, RejectAiResultDto, AcceptResultResponse, RejectResultResponse, AcceptAction } from './dto';
import { AiQueueGateway } from './ai-queue.gateway';
import { ACCEPT_ACTION_REQUIRED_LEVEL } from './constants/use-case-config';
import { AuditService } from '../field-reports/audit.service';

interface AuthUser {
    uid: string;
    roleLevel: number;
    displayName?: string;
}

@Injectable()
export class AiResultsService {
    constructor(
        @InjectRepository(AiJob)
        private jobRepo: Repository<AiJob>,
        @InjectRepository(AiResult)
        private resultRepo: Repository<AiResult>,
        private dataSource: DataSource,
        private gateway: AiQueueGateway,
        private auditService: AuditService,
    ) { }

    /**
     * Accept an AI result and apply the action
     */
    async accept(
        jobId: string,
        dto: AcceptAiResultDto,
        user: AuthUser,
    ): Promise<AcceptResultResponse> {
        // RBAC check
        if (user.roleLevel < ACCEPT_ACTION_REQUIRED_LEVEL) {
            throw new ForbiddenException({
                error: 'INSUFFICIENT_ROLE',
                requiredLevel: ACCEPT_ACTION_REQUIRED_LEVEL,
            });
        }

        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            relations: ['result'],
        });

        if (!job) {
            throw new NotFoundException(`Job ${jobId} not found`);
        }

        if (job.status !== AiJobStatus.SUCCEEDED) {
            throw new BadRequestException({
                error: 'JOB_NOT_READY',
                currentStatus: job.status,
            });
        }

        if (job.result?.acceptedAt || job.result?.rejectedAt) {
            throw new ConflictException({
                error: 'ALREADY_PROCESSED',
                processedAt: (job.result.acceptedAt || job.result.rejectedAt)?.toISOString(),
            });
        }

        // Execute action in transaction
        const affectedEntities = await this.dataSource.transaction(async (em) => {
            const jobRepo = em.getRepository(AiJob);
            const resultRepo = em.getRepository(AiResult);

            // Get or create result record
            let result = await resultRepo.findOne({ where: { jobId } });
            if (!result) {
                result = resultRepo.create({ jobId });
            }

            // Capture before state
            const beforeSnapshot = await this.captureBeforeState(job, dto.action, em);

            // Apply the action
            const affected = await this.applyAction(job, dto.action, dto.parameters, user, em);

            // Capture after state
            const afterSnapshot = await this.captureAfterState(job, dto.action, affected, em);

            // Update result record
            result.acceptedBy = user.uid;
            result.acceptedAt = new Date();
            result.appliedAction = dto.action;
            result.beforeSnapshot = beforeSnapshot;
            result.afterSnapshot = afterSnapshot;
            result.affectedEntities = affected;

            await resultRepo.save(result);

            // Audit log
            await this.auditService.log({
                actorUserId: user.uid,
                actorName: user.displayName,
                action: `ai:accept:${dto.action}`,
                entityType: 'ai_job',
                entityId: jobId,
                missionSessionId: job.missionSessionId,
                beforeSnapshot,
                afterSnapshot,
            });

            return affected;
        });

        return {
            success: true,
            appliedAction: dto.action,
            affectedEntities,
        };
    }

    /**
     * Reject an AI result
     */
    async reject(
        jobId: string,
        dto: RejectAiResultDto,
        user: AuthUser,
    ): Promise<RejectResultResponse> {
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            relations: ['result'],
        });

        if (!job) {
            throw new NotFoundException(`Job ${jobId} not found`);
        }

        if (job.result?.acceptedAt || job.result?.rejectedAt) {
            throw new ConflictException({
                error: 'ALREADY_PROCESSED',
                processedAt: (job.result.acceptedAt || job.result.rejectedAt)?.toISOString(),
            });
        }

        // Get or create result record
        let result = job.result;
        if (!result) {
            result = this.resultRepo.create({ jobId });
        }

        result.rejectedBy = user.uid;
        result.rejectedAt = new Date();
        result.rejectionReason = dto.reason ?? null;

        await this.resultRepo.save(result);

        // Audit log
        await this.auditService.log({
            actorUserId: user.uid,
            action: 'ai:reject',
            entityType: 'ai_job',
            entityId: jobId,
            missionSessionId: job.missionSessionId,
            afterSnapshot: { reason: dto.reason },
        });

        return {
            success: true,
            rejectedAt: result.rejectedAt.toISOString(),
        };
    }

    /**
     * Apply the accepted action
     */
    private async applyAction(
        job: AiJob,
        action: AcceptAction,
        parameters: object | undefined,
        user: AuthUser,
        em: any,
    ): Promise<Array<{ type: string; id: string }>> {
        switch (action) {
            case 'apply_summary':
                return this.applySummary(job, em);
            case 'merge_reports':
                return this.mergeReports(job, parameters, user, em);
            case 'create_task':
                return this.createTask(job, parameters, user, em);
            default:
                throw new BadRequestException(`Unknown action: ${action}`);
        }
    }

    /**
     * Apply summary to report metadata
     */
    private async applySummary(job: AiJob, em: any): Promise<Array<{ type: string; id: string }>> {
        const output = job.outputJson as any;

        // Update report's AI summary field
        await em.query(`
            UPDATE field_reports 
            SET metadata = jsonb_set(
                COALESCE(metadata, '{}')::jsonb, 
                '{ai_summary}', 
                $1::jsonb
            ),
            updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify(output), job.entityId]);

        return [{ type: 'report', id: job.entityId }];
    }

    /**
     * Merge clustered reports
     */
    private async mergeReports(
        job: AiJob,
        parameters: any,
        user: AuthUser,
        em: any,
    ): Promise<Array<{ type: string; id: string }>> {
        const output = job.outputJson as any;
        const affected: Array<{ type: string; id: string }> = [];

        // For each cluster, merge into primary report
        for (const cluster of output.clusters || []) {
            if (cluster.reportIds.length <= 1) continue;

            const primaryId = cluster.reportIds[0];
            const secondaryIds = cluster.reportIds.slice(1);

            // Mark secondary reports as merged
            await em.query(`
                UPDATE field_reports 
                SET status = 'merged', 
                    metadata = jsonb_set(
                        COALESCE(metadata, '{}')::jsonb, 
                        '{merged_into}', 
                        $1::jsonb
                    ),
                    updated_at = NOW()
                WHERE id = ANY($2::uuid[])
            `, [JSON.stringify(primaryId), secondaryIds]);

            // Update primary report with merge info
            await em.query(`
                UPDATE field_reports 
                SET metadata = jsonb_set(
                    COALESCE(metadata, '{}')::jsonb, 
                    '{merged_from}', 
                    $1::jsonb
                ),
                updated_at = NOW()
                WHERE id = $2
            `, [JSON.stringify(secondaryIds), primaryId]);

            affected.push({ type: 'report', id: primaryId });
            secondaryIds.forEach((id: string) => affected.push({ type: 'report', id }));
        }

        return affected;
    }

    /**
     * Create task from AI draft
     */
    private async createTask(
        job: AiJob,
        parameters: any,
        user: AuthUser,
        em: any,
    ): Promise<Array<{ type: string; id: string }>> {
        const output = job.outputJson as any;

        // Insert new task
        const result = await em.query(`
            INSERT INTO tasks (
                mission_session_id,
                title,
                description,
                priority,
                status,
                metadata,
                created_by,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, 'open', $5, $6, NOW(), NOW())
            RETURNING id
        `, [
            job.missionSessionId,
            output.title,
            output.objective,
            output.priority === 'urgent' ? 4 : output.priority === 'high' ? 3 : output.priority === 'normal' ? 2 : 1,
            JSON.stringify({
                source_report_id: job.entityId,
                ai_job_id: job.id,
                checklist: output.checklist,
                required_items: output.requiredItems,
                sop_slugs: output.sopSlugs,
                estimated_duration_min: output.estimatedDurationMin,
            }),
            user.uid,
        ]);

        const taskId = result[0].id;

        return [
            { type: 'task', id: taskId },
            { type: 'report', id: job.entityId },
        ];
    }

    /**
     * Capture state before action
     */
    private async captureBeforeState(job: AiJob, action: AcceptAction, em: any): Promise<object> {
        switch (action) {
            case 'apply_summary':
            case 'merge_reports':
            case 'create_task':
                const report = await em.query(
                    `SELECT id, status, metadata FROM field_reports WHERE id = $1`,
                    [job.entityId],
                );
                return report[0] || {};
            default:
                return {};
        }
    }

    /**
     * Capture state after action
     */
    private async captureAfterState(
        job: AiJob,
        action: AcceptAction,
        affected: Array<{ type: string; id: string }>,
        em: any,
    ): Promise<object> {
        const snapshots: any = {};

        for (const entity of affected) {
            if (entity.type === 'report') {
                const report = await em.query(
                    `SELECT id, status, metadata FROM field_reports WHERE id = $1`,
                    [entity.id],
                );
                snapshots[`report:${entity.id}`] = report[0];
            } else if (entity.type === 'task') {
                const task = await em.query(
                    `SELECT id, title, status, metadata FROM tasks WHERE id = $1`,
                    [entity.id],
                );
                snapshots[`task:${entity.id}`] = task[0];
            }
        }

        return snapshots;
    }
}
