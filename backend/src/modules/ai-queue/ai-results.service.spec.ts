import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiResultsService } from './ai-results.service';
import { AiJob, AiJobStatus, AiResult } from './entities';
import { AiQueueGateway } from './ai-queue.gateway';
import { AuditService } from '../field-reports/audit.service';

describe('AiResultsService', () => {
    let service: AiResultsService;
    let jobRepo: { findOne: jest.Mock };
    let resultRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
    let dataSource: { transaction: jest.Mock };
    let gateway: { emitJobUpdated: jest.Mock };
    let auditService: { log: jest.Mock };

    const mockUser = { uid: 'user-1', roleLevel: 5, displayName: 'Test User' };

    const makeJob = (overrides: Partial<AiJob> = {}): Partial<AiJob> => ({
        id: 'job-1',
        missionSessionId: 'mission-1',
        useCaseId: 'report.summarize.v1',
        entityType: 'field_report',
        entityId: 'entity-1',
        status: AiJobStatus.SUCCEEDED,
        outputJson: { summary: 'AI summary' },
        result: undefined,
        ...overrides,
    });

    beforeEach(async () => {
        jobRepo = { findOne: jest.fn().mockResolvedValue(null) };
        resultRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(data => ({ ...data })),
            save: jest.fn().mockImplementation(r => Promise.resolve(r)),
        };
        // Mock DataSource.transaction to execute the callback with a mock EntityManager
        dataSource = {
            transaction: jest.fn().mockImplementation(async (cb: Function) => {
                const mockEm = {
                    getRepository: jest.fn().mockImplementation((entity: any) => {
                        if (entity === AiJob) return jobRepo;
                        if (entity === AiResult) return {
                            findOne: jest.fn().mockResolvedValue(null),
                            create: resultRepo.create,
                            save: resultRepo.save,
                        };
                        return {};
                    }),
                    query: jest.fn().mockResolvedValue([{ id: 'entity-1', status: 'open', metadata: {} }]),
                };
                return cb(mockEm);
            }),
        };
        gateway = { emitJobUpdated: jest.fn() };
        auditService = { log: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiResultsService,
                { provide: getRepositoryToken(AiJob), useValue: jobRepo },
                { provide: getRepositoryToken(AiResult), useValue: resultRepo },
                { provide: DataSource, useValue: dataSource },
                { provide: AiQueueGateway, useValue: gateway },
                { provide: AuditService, useValue: auditService },
            ],
        }).compile();

        service = module.get<AiResultsService>(AiResultsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== accept =====
    describe('accept', () => {
        it('should throw for insufficient role', async () => {
            const lowUser = { uid: 'low', roleLevel: 0 };
            await expect(
                service.accept('job-1', { action: 'apply_summary' } as any, lowUser as any)
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw for unknown job', async () => {
            await expect(
                service.accept('unknown', { action: 'apply_summary' } as any, mockUser)
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw if job not succeeded', async () => {
            jobRepo.findOne.mockResolvedValueOnce(makeJob({ status: AiJobStatus.RUNNING }));
            await expect(
                service.accept('job-1', { action: 'apply_summary' } as any, mockUser)
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw if already processed', async () => {
            jobRepo.findOne.mockResolvedValueOnce(makeJob({
                result: { acceptedAt: new Date(), rejectedAt: null } as any,
            }));
            await expect(
                service.accept('job-1', { action: 'apply_summary' } as any, mockUser)
            ).rejects.toThrow(ConflictException);
        });

        it('should accept and apply summary action', async () => {
            jobRepo.findOne.mockResolvedValueOnce(makeJob());
            const result = await service.accept(
                'job-1',
                { action: 'apply_summary' } as any,
                mockUser,
            );
            expect(result.success).toBe(true);
            expect(result.appliedAction).toBe('apply_summary');
            expect(result.affectedEntities).toBeDefined();
        });
    });

    // ===== reject =====
    describe('reject', () => {
        it('should throw for unknown job', async () => {
            await expect(
                service.reject('unknown', { reason: 'bad quality' } as any, mockUser)
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw if already processed', async () => {
            jobRepo.findOne.mockResolvedValueOnce(makeJob({
                result: { rejectedAt: new Date(), acceptedAt: null } as any,
            }));
            await expect(
                service.reject('job-1', { reason: 'bad' } as any, mockUser)
            ).rejects.toThrow(ConflictException);
        });

        it('should reject with reason and audit log', async () => {
            jobRepo.findOne.mockResolvedValueOnce(makeJob());
            const result = await service.reject(
                'job-1',
                { reason: '品質不佳' } as any,
                mockUser,
            );
            expect(result.success).toBe(true);
            expect(result.rejectedAt).toBeDefined();
            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'ai:reject' }),
            );
        });
    });
});
