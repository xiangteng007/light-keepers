import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AiCircuitBreaker } from '../entities';

describe('CircuitBreakerService', () => {
    let service: CircuitBreakerService;
    let breakerRepo: { findOne: jest.Mock; find: jest.Mock; query: jest.Mock; create: jest.Mock; save: jest.Mock };

    beforeEach(async () => {
        breakerRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            query: jest.fn().mockResolvedValue(undefined),
            create: jest.fn().mockImplementation((data) => ({
                useCaseId: data.useCaseId,
                consecutiveFailures: 0,
                totalFailures: 0,
                totalSuccesses: 0,
                lastFailureAt: null,
                cooldownUntil: null,
            })),
            save: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CircuitBreakerService,
                { provide: getRepositoryToken(AiCircuitBreaker), useValue: breakerRepo },
            ],
        }).compile();

        service = module.get<CircuitBreakerService>(CircuitBreakerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('get', () => {
        it('should return null when no breaker exists', async () => {
            const result = await service.get('unknown.v1');
            expect(result).toBeNull();
        });

        it('should return breaker entity', async () => {
            const breaker = { useCaseId: 'report.summarize.v1', consecutiveFailures: 2 };
            breakerRepo.findOne.mockResolvedValueOnce(breaker);
            const result = await service.get('report.summarize.v1');
            expect(result?.useCaseId).toBe('report.summarize.v1');
        });
    });

    describe('isOpen', () => {
        it('should return false when no breaker exists', async () => {
            const result = await service.isOpen('report.summarize.v1');
            expect(result).toBe(false);
        });

        it('should return true when breaker is open', async () => {
            const breaker = {
                useCaseId: 'report.summarize.v1',
                isOpen: jest.fn().mockReturnValue(true),
            };
            breakerRepo.findOne.mockResolvedValueOnce(breaker);
            expect(await service.isOpen('report.summarize.v1')).toBe(true);
        });

        it('should return false when breaker is closed', async () => {
            const breaker = {
                useCaseId: 'report.summarize.v1',
                isOpen: jest.fn().mockReturnValue(false),
            };
            breakerRepo.findOne.mockResolvedValueOnce(breaker);
            expect(await service.isOpen('report.summarize.v1')).toBe(false);
        });
    });

    describe('recordSuccess', () => {
        it('should execute upsert query', async () => {
            await service.recordSuccess('report.summarize.v1');
            expect(breakerRepo.query).toHaveBeenCalledWith(
                expect.stringContaining('ON CONFLICT'),
                ['report.summarize.v1'],
            );
        });
    });

    describe('recordFailure', () => {
        it('should skip unknown use case', async () => {
            await service.recordFailure('unknown.case.v99');
            expect(breakerRepo.save).not.toHaveBeenCalled();
        });

        it('should increment counters on existing breaker', async () => {
            const breaker = {
                useCaseId: 'report.summarize.v1',
                consecutiveFailures: 0,
                totalFailures: 0,
                lastFailureAt: null,
                cooldownUntil: null,
            };
            breakerRepo.findOne.mockResolvedValueOnce(breaker);
            await service.recordFailure('report.summarize.v1');

            expect(breaker.consecutiveFailures).toBe(1);
            expect(breaker.totalFailures).toBe(1);
            expect(breaker.lastFailureAt).toBeInstanceOf(Date);
            expect(breakerRepo.save).toHaveBeenCalledWith(breaker);
        });

        it('should open circuit when threshold reached', async () => {
            // report.summarize.v1 threshold = 5
            const breaker: {
                useCaseId: string;
                consecutiveFailures: number;
                totalFailures: number;
                lastFailureAt: Date | null;
                cooldownUntil: Date | null;
            } = {
                useCaseId: 'report.summarize.v1',
                consecutiveFailures: 4, // will become 5 after increment
                totalFailures: 10,
                lastFailureAt: null,
                cooldownUntil: null,
            };
            breakerRepo.findOne.mockResolvedValueOnce(breaker);
            await service.recordFailure('report.summarize.v1');

            expect(breaker.consecutiveFailures).toBe(5);
            expect(breaker.cooldownUntil).toBeInstanceOf(Date);
            expect(breaker.cooldownUntil!.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe('reset', () => {
        it('should execute reset query', async () => {
            await service.reset('report.summarize.v1');
            expect(breakerRepo.query).toHaveBeenCalledWith(
                expect.stringContaining('consecutive_failures = 0'),
                ['report.summarize.v1'],
            );
        });
    });

    describe('getAll', () => {
        it('should return all breaker states', async () => {
            breakerRepo.find.mockResolvedValueOnce([{ useCaseId: 'a' }, { useCaseId: 'b' }]);
            const result = await service.getAll();
            expect(result).toHaveLength(2);
        });
    });
});
