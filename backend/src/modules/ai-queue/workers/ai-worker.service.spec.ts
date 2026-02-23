import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AiWorkerService } from './ai-worker.service';
import { AiJob, AiJobStatus } from '../entities';
import { AiQueueGateway } from '../ai-queue.gateway';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RateLimiterService } from './rate-limiter.service';
import { UseCaseFactory } from '../use-cases/use-case.factory';
import { RateLimitError, AiProviderError } from '../providers/gemini.provider';

describe('AiWorkerService', () => {
    let service: AiWorkerService;
    let jobRepo: { update: jest.Mock; findOne: jest.Mock };
    let dataSource: { transaction: jest.Mock };
    let gateway: { emitResultReady: jest.Mock; emitJobFailed: jest.Mock; emitJobUpdated: jest.Mock };
    let circuitBreaker: { isOpen: jest.Mock; recordSuccess: jest.Mock; recordFailure: jest.Mock };
    let rateLimiter: { canAcquireGlobal: jest.Mock; acquire: jest.Mock; release: jest.Mock };
    let useCaseFactory: { get: jest.Mock };
    let mockUseCase: { execute: jest.Mock; fallback: jest.Mock };

    const makeJob = (overrides: Partial<AiJob> = {}): AiJob => {
        const job = new AiJob();
        Object.assign(job, {
            id: 'job-1',
            missionSessionId: 'mission-1',
            useCaseId: 'report.summarize.v1',
            priority: 5,
            status: AiJobStatus.RUNNING,
            entityType: 'field_report',
            entityId: 'entity-1',
            attempt: 1,
            maxAttempts: 3,
            ...overrides,
        });
        return job;
    };

    beforeEach(async () => {
        // Prevent auto-start during tests
        process.env.AI_WORKER_ENABLED = 'false';

        jobRepo = { update: jest.fn().mockResolvedValue(undefined), findOne: jest.fn() };
        dataSource = {
            transaction: jest.fn().mockResolvedValue([]),
        };
        gateway = {
            emitResultReady: jest.fn(),
            emitJobFailed: jest.fn(),
            emitJobUpdated: jest.fn(),
        };
        circuitBreaker = {
            isOpen: jest.fn().mockResolvedValue(false),
            recordSuccess: jest.fn().mockResolvedValue(undefined),
            recordFailure: jest.fn().mockResolvedValue(undefined),
        };
        rateLimiter = {
            canAcquireGlobal: jest.fn().mockReturnValue(true),
            acquire: jest.fn().mockResolvedValue(true),
            release: jest.fn(),
        };
        mockUseCase = {
            execute: jest.fn().mockResolvedValue({ summary: 'AI generated' }),
            fallback: jest.fn().mockResolvedValue({ summary: 'Fallback result' }),
        };
        useCaseFactory = { get: jest.fn().mockReturnValue(mockUseCase) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiWorkerService,
                { provide: getRepositoryToken(AiJob), useValue: jobRepo },
                { provide: DataSource, useValue: dataSource },
                { provide: AiQueueGateway, useValue: gateway },
                { provide: CircuitBreakerService, useValue: circuitBreaker },
                { provide: RateLimiterService, useValue: rateLimiter },
                { provide: UseCaseFactory, useValue: useCaseFactory },
            ],
        }).compile();

        service = module.get<AiWorkerService>(AiWorkerService);
    });

    afterEach(() => {
        service.stop();
        delete process.env.AI_WORKER_ENABLED;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== start/stop =====
    describe('start/stop', () => {
        it('should not start when AI_WORKER_ENABLED=false', () => {
            // onModuleInit already called, but worker should NOT be running
            service.onModuleInit();
            // No errors - worker respects env flag
        });

        it('should start and stop cleanly', () => {
            service.start();
            service.stop();
            // No errors - lifecycle managed
        });

        it('should be idempotent on double start', () => {
            service.start();
            service.start(); // Should not throw
            service.stop();
        });
    });

    // ===== pollAndProcess =====
    describe('pollAndProcess', () => {
        it('should skip when global concurrency limit reached', async () => {
            rateLimiter.canAcquireGlobal.mockReturnValueOnce(false);
            await service.pollAndProcess();
            expect(dataSource.transaction).not.toHaveBeenCalled();
        });

        it('should do nothing when no jobs acquired', async () => {
            dataSource.transaction.mockResolvedValueOnce([]);
            await service.pollAndProcess();
            expect(useCaseFactory.get).not.toHaveBeenCalled();
        });
    });

    // ===== processJob (via pollAndProcess with injected jobs) =====
    describe('job processing', () => {
        it('should process job successfully and emit result', async () => {
            const job = makeJob();
            dataSource.transaction.mockResolvedValueOnce([job]);
            await service.pollAndProcess();

            expect(useCaseFactory.get).toHaveBeenCalledWith('report.summarize.v1');
            expect(mockUseCase.execute).toHaveBeenCalledWith(job);
            expect(jobRepo.update).toHaveBeenCalledWith('job-1', expect.objectContaining({
                status: AiJobStatus.SUCCEEDED,
            }));
            expect(circuitBreaker.recordSuccess).toHaveBeenCalled();
            expect(gateway.emitResultReady).toHaveBeenCalledWith('mission-1', expect.objectContaining({
                jobId: 'job-1',
                isFallback: false,
            }));
            expect(rateLimiter.release).toHaveBeenCalledWith(job);
        });

        it('should requeue when rate limiter denies acquire', async () => {
            const job = makeJob();
            dataSource.transaction.mockResolvedValueOnce([job]);
            rateLimiter.acquire.mockResolvedValueOnce(false);
            await service.pollAndProcess();

            expect(jobRepo.update).toHaveBeenCalledWith('job-1', expect.objectContaining({
                status: AiJobStatus.QUEUED,
            }));
        });

        it('should run fallback when circuit breaker is open', async () => {
            const job = makeJob();
            dataSource.transaction.mockResolvedValueOnce([job]);
            circuitBreaker.isOpen.mockResolvedValueOnce(true);
            await service.pollAndProcess();

            expect(mockUseCase.fallback).toHaveBeenCalledWith(job);
            expect(gateway.emitResultReady).toHaveBeenCalledWith('mission-1', expect.objectContaining({
                isFallback: true,
            }));
        });

        it('should handle RateLimitError with exponential backoff', async () => {
            const job = makeJob();
            dataSource.transaction.mockResolvedValueOnce([job]);
            mockUseCase.execute.mockRejectedValueOnce(new RateLimitError('Too many requests'));
            await service.pollAndProcess();

            expect(circuitBreaker.recordFailure).toHaveBeenCalled();
            expect(jobRepo.update).toHaveBeenCalledWith('job-1', expect.objectContaining({
                status: AiJobStatus.QUEUED,
            }));
            expect(gateway.emitJobFailed).toHaveBeenCalledWith('mission-1', expect.objectContaining({
                errorCode: 'RATE_LIMITED',
                willRetry: true,
            }));
        });

        it('should run fallback when max retries exceeded', async () => {
            const job = makeJob({ attempt: 3, maxAttempts: 3 });
            dataSource.transaction.mockResolvedValueOnce([job]);
            mockUseCase.execute.mockRejectedValueOnce(new Error('Fail'));
            await service.pollAndProcess();

            expect(mockUseCase.fallback).toHaveBeenCalledWith(job);
        });

        it('should requeue retryable AiProviderError', async () => {
            const job = makeJob({ attempt: 1 });
            dataSource.transaction.mockResolvedValueOnce([job]);
            const error = new AiProviderError('Server error', 'SERVER_ERROR', true);
            mockUseCase.execute.mockRejectedValueOnce(error);
            await service.pollAndProcess();

            expect(jobRepo.update).toHaveBeenCalledWith('job-1', expect.objectContaining({
                status: AiJobStatus.QUEUED,
            }));
            expect(gateway.emitJobFailed).toHaveBeenCalledWith('mission-1', expect.objectContaining({
                willRetry: true,
            }));
        });

        it('should skip invalid job without id', async () => {
            dataSource.transaction.mockResolvedValueOnce([{}]);
            rateLimiter.acquire.mockResolvedValueOnce(true);
            await service.pollAndProcess();
            // Should not throw, and no use case executed
            expect(useCaseFactory.get).not.toHaveBeenCalled();
        });
    });
});
