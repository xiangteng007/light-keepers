import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AiJobsService } from './ai-jobs.service';
import { AiJob, AiJobStatus, AiResult } from './entities';
import { AiQueueGateway } from './ai-queue.gateway';
import { CircuitBreakerService } from './workers/circuit-breaker.service';

describe('AiJobsService', () => {
    let service: AiJobsService;
    let jobRepo: {
        findOne: jest.Mock;
        find: jest.Mock;
        count: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
    };
    let resultRepo: { findOne: jest.Mock };
    let gateway: { emitJobQueued: jest.Mock; emitJobUpdated: jest.Mock };
    let circuitBreaker: { get: jest.Mock };

    const mockUser = { uid: 'user-1', roleLevel: 5, displayName: 'Test User' };

    const baseDto = {
        missionSessionId: 'mission-1',
        useCaseId: 'report.summarize.v1' as const,
        entityType: 'field_report',
        entityId: 'entity-1',
    };

    beforeEach(async () => {
        jobRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockImplementation(data => ({
                id: 'job-1',
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: AiJobStatus.QUEUED,
            })),
            save: jest.fn().mockImplementation(job => Promise.resolve({ ...job, id: job.id || 'job-1' })),
        };
        resultRepo = { findOne: jest.fn() };
        gateway = {
            emitJobQueued: jest.fn(),
            emitJobUpdated: jest.fn(),
        };
        circuitBreaker = {
            get: jest.fn().mockResolvedValue(null),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiJobsService,
                { provide: getRepositoryToken(AiJob), useValue: jobRepo },
                { provide: getRepositoryToken(AiResult), useValue: resultRepo },
                { provide: AiQueueGateway, useValue: gateway },
                { provide: CircuitBreakerService, useValue: circuitBreaker },
            ],
        }).compile();

        service = module.get<AiJobsService>(AiJobsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== create =====
    describe('create', () => {
        it('should create job and emit event', async () => {
            const result = await service.create(baseDto as any, mockUser);
            expect(result.jobId).toBe('job-1');
            expect(result.status).toBe('queued');
            expect(result.estimatedWaitMs).toBeDefined();
            expect(gateway.emitJobQueued).toHaveBeenCalledWith(
                'mission-1',
                expect.objectContaining({ jobId: 'job-1' }),
            );
        });

        it('should reject insufficient role level', async () => {
            const lowUser = { uid: 'user-2', roleLevel: 0 };
            await expect(service.create(baseDto as any, lowUser as any))
                .rejects.toThrow(ForbiddenException);
        });

        it('should reject when circuit breaker is open', async () => {
            circuitBreaker.get.mockResolvedValueOnce({
                isOpen: () => true,
                getRemainingCooldownMs: () => 60000,
            });
            await expect(service.create(baseDto as any, mockUser))
                .rejects.toThrow(ServiceUnavailableException);
        });

        it('should reject duplicate idempotency key', async () => {
            jobRepo.findOne.mockResolvedValueOnce({ id: 'existing-job' });
            const dto = { ...baseDto, idempotencyKey: 'dup-key' };
            await expect(service.create(dto as any, mockUser))
                .rejects.toThrow(ConflictException);
        });

        it('should estimate wait time based on queue depth', async () => {
            jobRepo.count.mockResolvedValueOnce(10);
            const result = await service.create(baseDto as any, mockUser);
            expect(result.estimatedWaitMs).toBe(20000); // 10 * 2000
        });
    });

    // ===== findById =====
    describe('findById', () => {
        it('should throw for unknown job', async () => {
            await expect(service.findById('unknown'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return job detail', async () => {
            jobRepo.findOne.mockResolvedValueOnce({
                id: 'job-1',
                useCaseId: 'report.summarize.v1',
                status: AiJobStatus.SUCCEEDED,
                outputJson: { summary: 'test' },
                errorCode: null,
                errorMessage: null,
                attempt: 1,
                maxAttempts: 3,
                isFallback: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                result: null,
            });
            const result = await service.findById('job-1');
            expect(result.jobId).toBe('job-1');
            expect(result.status).toBe(AiJobStatus.SUCCEEDED);
        });
    });

    // ===== cancel =====
    describe('cancel', () => {
        it('should throw for unknown job', async () => {
            await expect(service.cancel('unknown', mockUser))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw if job not queued', async () => {
            jobRepo.findOne.mockResolvedValueOnce({
                id: 'job-1',
                status: AiJobStatus.RUNNING,
            });
            await expect(service.cancel('job-1', mockUser))
                .rejects.toThrow(ConflictException);
        });

        it('should cancel queued job', async () => {
            jobRepo.findOne.mockResolvedValueOnce({
                id: 'job-1',
                status: AiJobStatus.QUEUED,
                missionSessionId: 'mission-1',
            });
            await service.cancel('job-1', mockUser);
            expect(jobRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: AiJobStatus.CANCELLED }),
            );
            expect(gateway.emitJobUpdated).toHaveBeenCalledWith(
                'mission-1',
                expect.objectContaining({ status: 'cancelled' }),
            );
        });
    });

    // ===== findByMission =====
    describe('findByMission', () => {
        it('should return empty for mission with no jobs', async () => {
            const result = await service.findByMission('mission-1');
            expect(result).toEqual([]);
        });
    });
});
