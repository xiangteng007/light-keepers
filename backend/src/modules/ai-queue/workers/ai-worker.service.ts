import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AiJob, AiJobStatus } from '../entities';
import { AiQueueGateway } from '../ai-queue.gateway';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RateLimiterService } from './rate-limiter.service';
import { UseCaseFactory } from '../use-cases/use-case.factory';
import { RATE_LIMIT_CONFIG } from '../constants/use-case-config';
import { RateLimitError, AiProviderError } from '../providers/gemini.provider';

/**
 * AI Worker Service
 * Polls and processes AI jobs with rate limiting, circuit breaking, and fallback
 */
@Injectable()
export class AiWorkerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AiWorkerService.name);
    private isRunning = false;
    private pollTimer: NodeJS.Timeout | null = null;

    constructor(
        @InjectRepository(AiJob)
        private jobRepo: Repository<AiJob>,
        private dataSource: DataSource,
        private gateway: AiQueueGateway,
        private circuitBreaker: CircuitBreakerService,
        private rateLimiter: RateLimiterService,
        private useCaseFactory: UseCaseFactory,
    ) { }

    onModuleInit() {
        // Start polling on module init (can be disabled via env)
        if (process.env.AI_WORKER_ENABLED !== 'false') {
            this.start();
        } else {
            this.logger.log('AI Worker disabled by AI_WORKER_ENABLED=false');
        }
    }

    onModuleDestroy() {
        this.stop();
    }

    /**
     * Start the worker polling loop
     */
    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.logger.log('🚀 AI Worker started - polling every ' + RATE_LIMIT_CONFIG.pollIntervalMs + 'ms');
        this.schedulePoll();
    }

    /**
     * Stop the worker
     */
    stop(): void {
        this.isRunning = false;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        this.logger.log('AI Worker stopped');
    }

    /**
     * Schedule next poll
     */
    private schedulePoll(): void {
        if (!this.isRunning) return;

        this.pollTimer = setTimeout(async () => {
            try {
                await this.pollAndProcess();
            } catch (error) {
                this.logger.error(`Poll error: ${error.message}`);
            }
            this.schedulePoll();
        }, RATE_LIMIT_CONFIG.pollIntervalMs);
    }

    /**
     * Poll for jobs and process them
     */
    async pollAndProcess(): Promise<void> {
        // Check global concurrency
        if (!this.rateLimiter.canAcquireGlobal()) {
            this.logger.debug('Skipping poll - global concurrency limit reached');
            return;
        }

        // Atomically acquire jobs using FOR UPDATE SKIP LOCKED
        const jobs = await this.acquireJobs();

        if (jobs.length === 0) {
            // Only log every 10 seconds to avoid spam
            return;
        }

        this.logger.log(`📋 Acquired ${jobs.length} jobs for processing`);

        // Process jobs with concurrency control
        await Promise.all(jobs.map(job => this.processJob(job)));
    }

    /**
     * Atomically acquire jobs from queue
     */
    private async acquireJobs(): Promise<AiJob[]> {
        try {
            return await this.dataSource.transaction(async (em) => {
                const result = await em.query(`
                    UPDATE ai_jobs
                    SET status = 'running',
                        attempt = attempt + 1,
                        updated_at = NOW()
                    WHERE id IN (
                        SELECT id FROM ai_jobs
                        WHERE status = 'queued'
                          AND (not_before IS NULL OR not_before <= NOW())
                        ORDER BY priority DESC, created_at ASC
                        LIMIT $1
                        FOR UPDATE SKIP LOCKED
                    )
                    RETURNING *
                `, [RATE_LIMIT_CONFIG.batchSize]);

                // PostgreSQL UPDATE RETURNING via em.query returns [rows, count] tuple
                // Extract actual rows from result[0] if it's a nested array
                let rows = result;
                if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0])) {
                    rows = result[0];
                }

                if (!Array.isArray(rows) || rows.length === 0) {
                    return [];
                }

                const jobs = rows
                    .filter((row: any) => row && row.id)
                    .map((row: any) => this.rowToEntity(row));

                if (jobs.length > 0) {
                    this.logger.debug(`Acquired ${jobs.length} jobs`);
                }
                return jobs;
            });
        } catch (error) {
            this.logger.error(`Failed to acquire jobs: ${error.message}`);
            return [];
        }
    }

    /**
     * Process a single job
     */
    private async processJob(job: AiJob): Promise<void> {
        // Validate job has required fields
        if (!job || !job.id) {
            this.logger.error('Invalid job received: missing id');
            return;
        }

        const acquired = await this.rateLimiter.acquire(job);
        if (!acquired) {
            // Put back in queue
            await this.requeueJob(job, 0);
            return;
        }

        this.logger.log(`Processing job ${job.id} (${job.useCaseId})`);

        try {
            // Check circuit breaker
            const isOpen = await this.circuitBreaker.isOpen(job.useCaseId);
            if (isOpen) {
                this.logger.warn(`Circuit breaker open for ${job.useCaseId}, running fallback`);
                await this.runFallbackAndSave(job);
                return;
            }

            // Execute use case
            const useCase = this.useCaseFactory.get(job.useCaseId);
            const startTime = Date.now();
            const result = await useCase.execute(job);
            const processingTimeMs = Date.now() - startTime;
            this.logger.log(`Job ${job.id} completed in ${processingTimeMs}ms`);

            // Save success
            await this.saveSuccess(job, result, processingTimeMs, false);

            // Reset circuit breaker on success
            await this.circuitBreaker.recordSuccess(job.useCaseId);

            // Broadcast result ready
            this.gateway.emitResultReady(job.missionSessionId, {
                jobId: job.id,
                useCaseId: job.useCaseId,
                entityId: job.entityId,
                outputJson: result,
                canAccept: true,
                isFallback: false,
            });

        } catch (error) {
            await this.handleError(job, error);
        } finally {
            this.rateLimiter.release(job);
        }
    }

    /**
     * Handle job processing error
     */
    private async handleError(job: AiJob, error: Error): Promise<void> {
        this.logger.error(`Job ${job.id} failed: ${error.message}`);

        if (error instanceof RateLimitError) {
            // Exponential backoff with jitter
            const backoffMs = Math.min(
                1000 * Math.pow(2, job.attempt) + Math.random() * 1000,
                300000, // max 5 min
            );

            await this.circuitBreaker.recordFailure(job.useCaseId);
            await this.requeueJob(job, backoffMs);

            this.gateway.emitJobFailed(job.missionSessionId, {
                jobId: job.id,
                errorCode: 'RATE_LIMITED',
                errorMessage: 'Rate limited, will retry',
                willRetry: true,
                nextAttemptAt: new Date(Date.now() + backoffMs).toISOString(),
            });

        } else if (job.attempt >= job.maxAttempts) {
            // Max retries reached, run fallback
            this.logger.warn(`Job ${job.id} max retries reached, running fallback`);
            await this.runFallbackAndSave(job);

        } else if (error instanceof AiProviderError && error.isRetryable) {
            // Retryable error
            const backoffMs = 5000 * job.attempt;
            await this.requeueJob(job, backoffMs);

            this.gateway.emitJobFailed(job.missionSessionId, {
                jobId: job.id,
                errorCode: error.code,
                errorMessage: error.message,
                willRetry: true,
                nextAttemptAt: new Date(Date.now() + backoffMs).toISOString(),
            });

        } else {
            // Non-retryable error, run fallback
            await this.runFallbackAndSave(job);
        }
    }

    /**
     * Run fallback and save result
     */
    private async runFallbackAndSave(job: AiJob): Promise<void> {
        try {
            const useCase = this.useCaseFactory.get(job.useCaseId);
            const fallbackResult = await useCase.fallback(job);
            await this.saveSuccess(job, fallbackResult, 0, true);

            this.gateway.emitResultReady(job.missionSessionId, {
                jobId: job.id,
                useCaseId: job.useCaseId,
                entityId: job.entityId,
                outputJson: fallbackResult,
                canAccept: true,
                isFallback: true,
            });

        } catch (fallbackError) {
            // Even fallback failed
            await this.saveFailed(job, 'FALLBACK_FAILED', fallbackError.message);

            this.gateway.emitJobFailed(job.missionSessionId, {
                jobId: job.id,
                errorCode: 'FALLBACK_FAILED',
                errorMessage: fallbackError.message,
                willRetry: false,
            });
        }
    }

    /**
     * Save successful result
     */
    private async saveSuccess(
        job: AiJob,
        outputJson: object,
        processingTimeMs: number,
        isFallback: boolean,
    ): Promise<void> {
        await this.jobRepo.update(job.id, {
            status: AiJobStatus.SUCCEEDED,
            outputJson,
            processingTimeMs,
            isFallback,
            updatedAt: new Date(),
        });
    }

    /**
     * Save failed job
     */
    private async saveFailed(job: AiJob, errorCode: string, errorMessage: string): Promise<void> {
        await this.jobRepo.update(job.id, {
            status: AiJobStatus.FAILED,
            errorCode,
            errorMessage,
            updatedAt: new Date(),
        });
    }

    /**
     * Requeue job with backoff
     */
    private async requeueJob(job: AiJob, backoffMs: number): Promise<void> {
        await this.jobRepo.update(job.id, {
            status: AiJobStatus.QUEUED,
            notBefore: new Date(Date.now() + backoffMs),
            updatedAt: new Date(),
        });

        this.gateway.emitJobUpdated(job.missionSessionId, {
            jobId: job.id,
            status: 'queued',
            attempt: job.attempt,
            estimatedCompleteAt: new Date(Date.now() + backoffMs + 5000).toISOString(),
        });
    }

    /**
     * Convert raw DB row to entity
     */
    private rowToEntity(row: any): AiJob {
        const job = new AiJob();
        job.id = row.id;
        job.missionSessionId = row.mission_session_id;
        job.useCaseId = row.use_case_id;
        job.priority = row.priority;
        job.status = row.status;
        job.entityType = row.entity_type;
        job.entityId = row.entity_id;
        job.attempt = row.attempt;
        job.maxAttempts = row.max_attempts;
        job.modelName = row.model_name;
        job.promptVersion = row.prompt_version;
        job.createdBy = row.created_by;
        return job;
    }
}
