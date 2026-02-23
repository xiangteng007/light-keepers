import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MoodTrackerService } from './mood-tracker.service';
import { MoodLog, BlessingMessage } from './entities/mood-log.entity';

describe('MoodTrackerService', () => {
    let service: MoodTrackerService;
    let moodLogRepo: any;
    let blessingRepo: any;
    let eventEmitter: { emit: jest.Mock };

    // Simulate QueryBuilder chain
    const createQB = (returnValue: any) => {
        const qb: any = {};
        const chain = ['select', 'addSelect', 'where', 'andWhere', 'orderBy', 'groupBy'];
        chain.forEach(m => { qb[m] = jest.fn().mockReturnValue(qb); });
        qb.getMany = jest.fn().mockResolvedValue(returnValue);
        qb.getRawMany = jest.fn().mockResolvedValue(returnValue);
        qb.getRawOne = jest.fn().mockResolvedValue(returnValue);
        return qb;
    };

    const mockMoodLogs: Partial<MoodLog>[] = [
        { id: '1', userId: 'user-1', score: 8, tags: ['active'], createdAt: new Date() },
        { id: '2', userId: 'user-1', score: 7, tags: ['calm'], createdAt: new Date(Date.now() - 86400000) },
        { id: '3', userId: 'user-1', score: 6, tags: ['tired'], createdAt: new Date(Date.now() - 172800000) },
    ];

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        moodLogRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'new-mood', ...d })),
            save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
            findOne: jest.fn().mockResolvedValue(null),
            count: jest.fn().mockResolvedValue(10),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            increment: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue(createQB(mockMoodLogs)),
        };

        blessingRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'bless-1', ...d })),
            save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(5),
            increment: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MoodTrackerService,
                { provide: getRepositoryToken(MoodLog), useValue: moodLogRepo },
                { provide: getRepositoryToken(BlessingMessage), useValue: blessingRepo },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<MoodTrackerService>(MoodTrackerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== logMood =====
    describe('logMood', () => {
        it('should create and save mood log', async () => {
            const entry = { userId: 'user-1', score: 7, tags: ['happy'], note: '心情不錯' };
            const result = await service.logMood(entry);
            expect(moodLogRepo.create).toHaveBeenCalledWith(entry);
            expect(moodLogRepo.save).toHaveBeenCalled();
            expect(result.userId).toBe('user-1');
        });
    });

    // ===== getUserMoodHistory =====
    describe('getUserMoodHistory', () => {
        it('should query mood history with date filter', async () => {
            const result = await service.getUserMoodHistory('user-1', 30);
            expect(moodLogRepo.createQueryBuilder).toHaveBeenCalledWith('mood');
            expect(result).toHaveLength(3);
        });
    });

    // ===== getUserMoodSummary =====
    describe('getUserMoodSummary', () => {
        it('should return summary with trend and alert level', async () => {
            const summary = await service.getUserMoodSummary('user-1');
            expect(summary.userId).toBe('user-1');
            expect(summary.currentScore).toBe(8);
            expect(summary.weeklyAverage).toBeGreaterThan(0);
            expect(['improving', 'stable', 'declining']).toContain(summary.trend);
            expect(['normal', 'attention', 'concern', 'critical']).toContain(summary.alertLevel);
        });

        it('should return default for user with no logs', async () => {
            moodLogRepo.createQueryBuilder.mockReturnValue(createQB([]));
            const summary = await service.getUserMoodSummary('no-logs');
            expect(summary.currentScore).toBe(0);
            expect(summary.trend).toBe('stable');
            expect(summary.alertLevel).toBe('normal');
        });

        it('should detect declining trend', async () => {
            // Recent 3 low, older 3 high => declining
            const decliningLogs = [
                { score: 3, tags: [], createdAt: new Date() },
                { score: 3, tags: [], createdAt: new Date(Date.now() - 86400000) },
                { score: 3, tags: [], createdAt: new Date(Date.now() - 172800000) },
                { score: 9, tags: [], createdAt: new Date(Date.now() - 259200000) },
                { score: 9, tags: [], createdAt: new Date(Date.now() - 345600000) },
                { score: 9, tags: [], createdAt: new Date(Date.now() - 432000000) },
            ];
            moodLogRepo.createQueryBuilder.mockReturnValue(createQB(decliningLogs));
            const summary = await service.getUserMoodSummary('user-declining');
            expect(summary.trend).toBe('declining');
        });

        it('should set concern alert for consecutive low scores', async () => {
            const lowLogs = [
                { score: 3, tags: [], createdAt: new Date() },
                { score: 3, tags: [], createdAt: new Date(Date.now() - 86400000) },
                { score: 3, tags: [], createdAt: new Date(Date.now() - 172800000) },
            ];
            moodLogRepo.createQueryBuilder.mockReturnValue(createQB(lowLogs));
            const summary = await service.getUserMoodSummary('user-low');
            expect(summary.alertLevel).toBe('concern');
        });

        it('should set critical alert for very low scores', async () => {
            const critLogs = [
                { score: 2, tags: [], createdAt: new Date() },
                { score: 2, tags: [], createdAt: new Date(Date.now() - 86400000) },
                { score: 1, tags: [], createdAt: new Date(Date.now() - 172800000) },
            ];
            moodLogRepo.createQueryBuilder.mockReturnValue(createQB(critLogs));
            const summary = await service.getUserMoodSummary('user-critical');
            expect(summary.alertLevel).toBe('critical');
        });

        it('should collect top tags', async () => {
            const tagLogs = [
                { score: 7, tags: ['tired', 'stress'], createdAt: new Date() },
                { score: 6, tags: ['tired', 'busy'], createdAt: new Date(Date.now() - 86400000) },
                { score: 7, tags: ['tired'], createdAt: new Date(Date.now() - 172800000) },
            ];
            moodLogRepo.createQueryBuilder.mockReturnValue(createQB(tagLogs));
            const summary = await service.getUserMoodSummary('user-tags');
            expect(summary.recentTags[0]).toBe('tired');
        });
    });

    // ===== Blessing Wall =====
    describe('postBlessing', () => {
        it('should create blessing with default icon', async () => {
            const result = await service.postBlessing({ displayName: 'Alice', message: '加油!' });
            expect(blessingRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                displayName: 'Alice',
                iconType: 'candle',
            }));
            expect(blessingRepo.save).toHaveBeenCalled();
        });

        it('should use custom icon type', async () => {
            await service.postBlessing({ displayName: 'Bob', message: '平安', iconType: 'heart' });
            expect(blessingRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                iconType: 'heart',
            }));
        });
    });

    describe('getBlessings', () => {
        it('should query visible blessings with limit', async () => {
            await service.getBlessings(20);
            expect(blessingRepo.find).toHaveBeenCalledWith({
                where: { isVisible: true },
                order: { createdAt: 'DESC' },
                take: 20,
            });
        });
    });

    describe('likeBlessing', () => {
        it('should increment like count', async () => {
            await service.likeBlessing('bless-1');
            expect(blessingRepo.increment).toHaveBeenCalledWith({ id: 'bless-1' }, 'likes', 1);
        });
    });

    // ===== getStats =====
    describe('getStats', () => {
        it('should return aggregated stats', async () => {
            moodLogRepo.createQueryBuilder.mockReturnValue(createQB({ avg: '7.5' }));
            // getUsersNeedingAttention needs internal QBs — mock them to return empty
            const emptyQB = createQB([]);
            moodLogRepo.createQueryBuilder.mockReturnValue(emptyQB);
            const stats = await service.getStats();
            expect(stats.totalLogs).toBe(10);
            expect(stats.totalBlessings).toBe(5);
        });
    });
});
