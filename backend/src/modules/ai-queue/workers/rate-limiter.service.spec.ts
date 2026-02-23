import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';
import { AiJob } from '../entities';

describe('RateLimiterService', () => {
    let service: RateLimiterService;

    const makeJob = (overrides: Partial<AiJob> = {}): AiJob => {
        const job = new AiJob();
        Object.assign(job, {
            id: 'job-1',
            useCaseId: 'report.summarize.v1', // maxConcurrency: 3
            missionSessionId: 'mission-1',
            ...overrides,
        });
        return job;
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RateLimiterService],
        }).compile();
        service = module.get<RateLimiterService>(RateLimiterService);
    });

    afterEach(() => {
        service.reset();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('canAcquireGlobal', () => {
        it('should return true when under limit', () => {
            expect(service.canAcquireGlobal()).toBe(true);
        });

        it('should return false when global limit reached', async () => {
            // globalMaxConcurrency = 5, need to use different useCaseIds & missions
            // report.summarize.v1 maxConcurrency=3, report.cluster.v1 maxConcurrency=1, task.draftFromReport.v1 maxConcurrency=2
            // perMissionMaxConcurrency=2, so each mission can only have 2 jobs
            await service.acquire(makeJob({ id: 'j0', useCaseId: 'report.summarize.v1', missionSessionId: 'm-0' }));
            await service.acquire(makeJob({ id: 'j1', useCaseId: 'report.summarize.v1', missionSessionId: 'm-1' }));
            await service.acquire(makeJob({ id: 'j2', useCaseId: 'report.summarize.v1', missionSessionId: 'm-2' }));
            await service.acquire(makeJob({ id: 'j3', useCaseId: 'report.cluster.v1', missionSessionId: 'm-3' }));
            await service.acquire(makeJob({ id: 'j4', useCaseId: 'task.draftFromReport.v1', missionSessionId: 'm-4' }));
            expect(service.canAcquireGlobal()).toBe(false);
        });
    });

    describe('acquire', () => {
        it('should acquire slot for valid job', async () => {
            const result = await service.acquire(makeJob());
            expect(result).toBe(true);
        });

        it('should reject unknown use case', async () => {
            const job = makeJob({ useCaseId: 'unknown.v99' });
            const result = await service.acquire(job);
            expect(result).toBe(false);
        });

        it('should reject when per-use-case limit reached', async () => {
            // report.summarize.v1 maxConcurrency = 3
            for (let i = 0; i < 3; i++) {
                await service.acquire(makeJob({ id: `job-${i}`, missionSessionId: `m-${i}` }));
            }
            const result = await service.acquire(makeJob({ id: 'job-extra', missionSessionId: 'm-extra' }));
            expect(result).toBe(false);
        });

        it('should reject when per-mission limit reached', async () => {
            // perMissionMaxConcurrency = 2, same mission
            await service.acquire(makeJob({ id: 'j1' }));
            await service.acquire(makeJob({ id: 'j2' }));
            const result = await service.acquire(makeJob({ id: 'j3' }));
            expect(result).toBe(false);
        });
    });

    describe('release', () => {
        it('should release slot and allow new acquire', async () => {
            // Fill per-mission limit (2)
            const job1 = makeJob({ id: 'j1' });
            const job2 = makeJob({ id: 'j2' });
            await service.acquire(job1);
            await service.acquire(job2);
            expect(await service.acquire(makeJob({ id: 'j3' }))).toBe(false);

            service.release(job1);
            expect(await service.acquire(makeJob({ id: 'j3' }))).toBe(true);
        });

        it('should not go below zero', () => {
            service.release(makeJob()); // release without acquire
            const stats = service.getStats();
            expect(stats.globalRunning).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return current counters', async () => {
            await service.acquire(makeJob());
            const stats = service.getStats();
            expect(stats.globalRunning).toBe(1);
            expect(stats.perUseCase['report.summarize.v1']).toBe(1);
            expect(stats.perMission['mission-1']).toBe(1);
        });
    });

    describe('reset', () => {
        it('should clear all counters', async () => {
            await service.acquire(makeJob());
            service.reset();
            const stats = service.getStats();
            expect(stats.globalRunning).toBe(0);
            expect(Object.keys(stats.perUseCase)).toHaveLength(0);
        });
    });
});
