import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TaskClaim, TaskProgressUpdate } from './entities';
import { AuditService } from './audit.service';
import { FieldReportsGateway } from './field-reports.gateway';

interface AuthUser {
    uid: string;
    displayName?: string;
}

@Injectable()
export class TaskClaimsService {
    constructor(
        @InjectRepository(TaskClaim)
        private claimRepo: Repository<TaskClaim>,
        @InjectRepository(TaskProgressUpdate)
        private progressRepo: Repository<TaskProgressUpdate>,
        private auditService: AuditService,
        private gateway: FieldReportsGateway,
    ) { }

    /**
     * Claim a task for the current user
     */
    async claim(taskId: string, missionSessionId: string, user: AuthUser): Promise<TaskClaim> {
        // Check if task is already claimed
        const existingClaim = await this.claimRepo.findOne({
            where: { taskId, releasedAt: IsNull() },
        });

        if (existingClaim) {
            throw new ConflictException({
                error: 'ALREADY_CLAIMED',
                claimedBy: existingClaim.claimedBy,
            });
        }

        // Create claim
        const claim = this.claimRepo.create({
            taskId,
            claimedBy: user.uid,
        });

        const saved = await this.claimRepo.save(claim);

        // Audit
        await this.auditService.log({
            actorUserId: user.uid,
            actorName: user.displayName,
            action: 'task:claim',
            entityType: 'task',
            entityId: taskId,
            missionSessionId,
            afterSnapshot: { claimedBy: user.uid },
        });

        // Broadcast
        this.gateway.emitTaskClaimed(missionSessionId, taskId, user.uid, user.displayName || 'Unknown');

        return saved;
    }

    /**
     * Release a task claim
     */
    async release(taskId: string, missionSessionId: string, reason: string, user: AuthUser): Promise<void> {
        const claim = await this.claimRepo.findOne({
            where: { taskId, claimedBy: user.uid, releasedAt: IsNull() },
        });

        if (!claim) {
            throw new NotFoundException('No active claim found for this task');
        }

        claim.releasedAt = new Date();
        await this.claimRepo.save(claim);

        // Audit
        await this.auditService.log({
            actorUserId: user.uid,
            action: 'task:release',
            entityType: 'task',
            entityId: taskId,
            missionSessionId,
            beforeSnapshot: { claimedBy: user.uid },
            afterSnapshot: { releasedAt: claim.releasedAt, reason },
        });

        // Broadcast as task update
        this.gateway.broadcastToSession(missionSessionId, 'task:updated', {
            taskId,
            changes: { claimedBy: null },
        });
    }

    /**
     * Add progress update to a task
     */
    async addProgress(
        taskId: string,
        missionSessionId: string,
        progress: {
            status?: string;
            note?: string;
            percent?: number;
            attachmentId?: string;
        },
        user: AuthUser,
    ): Promise<TaskProgressUpdate> {
        // Verify user has claimed the task
        const claim = await this.claimRepo.findOne({
            where: { taskId, claimedBy: user.uid, releasedAt: IsNull() },
        });

        if (!claim) {
            throw new ConflictException('You must claim the task before adding progress');
        }

        const update = this.progressRepo.create({
            taskId,
            userId: user.uid,
            userName: user.displayName || 'Unknown',
            status: progress.status || 'update',
            note: progress.note,
            percent: progress.percent,
            attachmentId: progress.attachmentId,
        });

        const saved = await this.progressRepo.save(update);

        // Audit
        await this.auditService.log({
            actorUserId: user.uid,
            action: 'task:progress',
            entityType: 'task_progress',
            entityId: saved.id,
            missionSessionId,
            afterSnapshot: { id: saved.id, taskId, status: saved.status },
        });

        // Broadcast
        this.gateway.emitTaskProgress(missionSessionId, taskId, {
            id: saved.id,
            status: saved.status,
            note: saved.note,
            percent: saved.percent,
            userId: saved.userId,
            userName: saved.userName,
            createdAt: saved.createdAt,
        });

        return saved;
    }

    /**
     * Get progress updates for a task
     */
    async getProgress(taskId: string): Promise<TaskProgressUpdate[]> {
        return this.progressRepo.find({
            where: { taskId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get current claim for a task
     */
    async getCurrentClaim(taskId: string): Promise<TaskClaim | null> {
        return this.claimRepo.findOne({
            where: { taskId, releasedAt: IsNull() },
        });
    }
}
