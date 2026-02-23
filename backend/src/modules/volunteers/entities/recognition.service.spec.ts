import { RecognitionService } from './recognition.service';
import { NotFoundException } from '@nestjs/common';

describe('RecognitionService', () => {
    let service: RecognitionService;
    let badgeRepo: Record<string, jest.Mock>;
    let earnedBadgeRepo: Record<string, jest.Mock>;
    let recognitionRepo: Record<string, jest.Mock>;
    let volunteerRepo: Record<string, jest.Mock>;

    const mockBadge = { id: 'b1', name: '急救英雄', code: 'FIRST_AID_HERO', isActive: true };
    const mockEarnedBadge = { id: 'eb1', volunteerId: 'v1', badgeId: 'b1', badge: mockBadge };

    beforeEach(() => {
        badgeRepo = {
            create: jest.fn().mockImplementation(d => ({ id: 'b1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockBadge]),
            findOne: jest.fn().mockResolvedValue(mockBadge),
        };
        earnedBadgeRepo = {
            create: jest.fn().mockImplementation(d => ({ id: 'eb1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockEarnedBadge]),
            findOne: jest.fn().mockResolvedValue(null),
            count: jest.fn().mockResolvedValue(0),
        };
        recognitionRepo = {
            create: jest.fn().mockImplementation(d => ({ id: 'r1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            }),
        };
        volunteerRepo = {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            }),
        };
        service = new RecognitionService(
            badgeRepo as any, earnedBadgeRepo as any,
            recognitionRepo as any, volunteerRepo as any,
        );
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createBadge', () => {
        it('should create badge', async () => {
            await service.createBadge({ name: '新徽章', code: 'NEW' });
            expect(badgeRepo.save).toHaveBeenCalled();
        });
    });

    describe('getBadges', () => {
        it('should return all badges', async () => {
            const result = await service.getBadges();
            expect(result.length).toBe(1);
        });
    });

    describe('getBadge', () => {
        it('should return badge by id', async () => {
            const result = await service.getBadge('b1');
            expect(result.id).toBe('b1');
        });
    });

    describe('awardBadge', () => {
        it('should award badge to volunteer', async () => {
            const result = await service.awardBadge({
                volunteerId: 'v1', badgeId: 'b1', reason: '表現優異',
            });
            expect(earnedBadgeRepo.save).toHaveBeenCalled();
        });
    });

    describe('getVolunteerBadges', () => {
        it('should return volunteer earned badges', async () => {
            const result = await service.getVolunteerBadges('v1');
            expect(result.length).toBe(1);
        });
    });

    describe('createRecognition', () => {
        it('should create recognition', async () => {
            const result = await service.createRecognition({
                volunteerId: 'v1', type: 'monthly_star' as any,
                title: '月度之星', year: 2026, month: 2,
            });
            expect(recognitionRepo.create).toHaveBeenCalled();
        });
    });

    describe('getVolunteerRecognitions', () => {
        it('should return recognitions', async () => {
            const result = await service.getVolunteerRecognitions('v1');
            expect(recognitionRepo.find).toHaveBeenCalled();
        });
    });

    describe('getPublicRecognitions', () => {
        it('should return public recognitions', async () => {
            const result = await service.getPublicRecognitions(10);
            expect(recognitionRepo.find).toHaveBeenCalled();
        });
    });

    describe('getRecognitionStats', () => {
        it('should return stats', async () => {
            const stats = await service.getRecognitionStats();
            expect(stats.totalBadges).toBeDefined();
            expect(stats.totalRecognitions).toBeDefined();
        });
    });
});
