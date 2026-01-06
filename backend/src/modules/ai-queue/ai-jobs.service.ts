import {
    Injectable,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiJob, AiJobStatus, AiResult } from './entities';
import { CreateAiJobDto, AiJobCreatedResponse, AiJobDetailResponse, AiUseCaseId } from './dto';
import { USE_CASE_CONFIG, RATE_LIMIT_CONFIG } from './constants/use-case-config';
import { AiQueueGateway } from './ai-queue.gateway';
import { CircuitBreakerService } from './workers/circuit-breaker.service';
import { createHash } from 'crypto';

interface AuthUser {
    uid: string;
    roleLevel: number;
    displayName?: string;
}

@Injectable()
export class AiJobsService {
    constructor(
        @InjectRepository(AiJob)
        private jobRepo: Repository<AiJob>,
        @InjectRepository(AiResult)
        private resultRepo: Repository<AiResult>,
        private gateway: AiQueueGateway,
        private circuitBreaker: CircuitBreakerService,
    ) { }

    /**
     * Create a new AI job
     */
    async create(dto: CreateAiJobDto, user: AuthUser): Promise<AiJobCreatedResponse> {
        const config = USE_CASE_CONFIG[dto.useCaseId];

        // RBAC check
        if (user.roleLevel < config.requiredLevel) {
            throw new ForbiddenException({
                error: 'INSUFFICIENT_ROLE',
                requiredLevel: config.requiredLevel,
            });
        }

        // Circuit breaker check
        const breaker = await this.circuitBreaker.get(dto.useCaseId);
        if (breaker?.isOpen()) {
            throw new ServiceUnavailableException({
                error: 'AI_UNAVAILABLE',
                useCaseId: dto.useCaseId,
                retryAfterMs: breaker.getRemainingCooldownMs(),
            });
        }

        // Check idempotency
        if (dto.idempotencyKey) {
            const existing = await this.jobRepo.findOne({
                where: { idempotencyKey: dto.idempotencyKey },
            });
            if (existing) {
                throw new ConflictException({
                    error: 'DUPLICATE_JOB',
                    existingJobId: existing.id,
                });
            }
        }

        // Create job
        const job = this.jobRepo.create({
            missionSessionId: dto.missionSessionId,
            useCaseId: dto.useCaseId,
            entityType: dto.entityType,
            entityId: dto.entityId,
            priority: dto.priority ?? config.defaultPriority,
            maxAttempts: config.maxRetries,
            modelName: config.modelName,
            promptVersion: config.promptVersion,
            idempotencyKey: dto.idempotencyKey,
            inputFingerprint: this.generateFingerprint(dto),
            createdBy: user.uid,
        });

        const saved = await this.jobRepo.save(job);

        // Broadcast to mission room
        this.gateway.emitJobQueued(dto.missionSessionId, {
            jobId: saved.id,
            useCaseId: saved.useCaseId,
            entityType: saved.entityType,
            entityId: saved.entityId,
            priority: saved.priority,
        });

        // Estimate wait time based on queue depth
        const queueDepth = await this.jobRepo.count({
            where: { status: AiJobStatus.QUEUED },
        });
        const estimatedWaitMs = queueDepth * 2000; // ~2s per job

        return {
            jobId: saved.id,
            status: 'queued',
            estimatedWaitMs,
        };
    }

    /**
     * Get job by ID with optional result
     */
    async findById(jobId: string, includeResult = true): Promise<AiJobDetailResponse> {
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            relations: includeResult ? ['result'] : [],
        });

        if (!job) {
            throw new NotFoundException(`Job ${jobId} not found`);
        }

        return this.toDetailResponse(job);
    }

    /**
     * Cancel a queued job
     */
    async cancel(jobId: string, user: AuthUser): Promise<void> {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });

        if (!job) {
            throw new NotFoundException(`Job ${jobId} not found`);
        }

        if (job.status !== AiJobStatus.QUEUED) {
            throw new ConflictException({
                error: 'CANNOT_CANCEL',
                currentStatus: job.status,
            });
        }

        job.status = AiJobStatus.CANCELLED;
        await this.jobRepo.save(job);

        this.gateway.emitJobUpdated(job.missionSessionId, {
            jobId: job.id,
            status: 'cancelled',
        });
    }

    /**
     * Get jobs for a mission session
     */
    async findByMission(
        missionSessionId: string,
        status?: AiJobStatus,
        limit = 50,
    ): Promise<AiJobDetailResponse[]> {
        const where: any = { missionSessionId };
        if (status) where.status = status;

        const jobs = await this.jobRepo.find({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['result'],
        });

        return jobs.map(j => this.toDetailResponse(j));
    }

    /**
     * Generate input fingerprint for deduplication
     */
    private generateFingerprint(dto: CreateAiJobDto): string {
        const data = `${dto.useCaseId}:${dto.entityType}:${dto.entityId}`;
        return createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    /**
     * Convert entity to response DTO
     */
    private toDetailResponse(job: AiJob): AiJobDetailResponse {
        return {
            jobId: job.id,
            useCaseId: job.useCaseId,
            status: job.status,
            outputJson: job.outputJson,
            errorCode: job.errorCode,
            errorMessage: job.errorMessage,
            attempt: job.attempt,
            maxAttempts: job.maxAttempts,
            isFallback: job.isFallback,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            result: job.result ? {
                acceptedBy: job.result.acceptedBy,
                acceptedAt: job.result.acceptedAt?.toISOString(),
                rejectedBy: job.result.rejectedBy,
                rejectedAt: job.result.rejectedAt?.toISOString(),
            } : undefined,
        };
    }
}
