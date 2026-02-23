import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RewardsService } from './rewards.service';

describe('RewardsService', () => {
    let service: RewardsService;
    let eventEmitter: { emit: jest.Mock };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RewardsService,
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<RewardsService>(RewardsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getUserRewards', () => {
        it('should create default rewards for new user', () => {
            const rewards = service.getUserRewards('user-1');
            expect(rewards.userId).toBe('user-1');
            expect(rewards.points).toBe(0);
            expect(rewards.level).toBe(1);
            expect(rewards.badges).toEqual([]);
        });

        it('should return same object for existing user', () => {
            const r1 = service.getUserRewards('user-1');
            const r2 = service.getUserRewards('user-1');
            expect(r1).toBe(r2);
        });
    });

    describe('awardPoints', () => {
        it('should add points and history', () => {
            const rewards = service.awardPoints('user-1', 50, '災情回報');
            expect(rewards.points).toBe(50);
            expect(rewards.history).toHaveLength(1);
            expect(rewards.history[0].reason).toBe('災情回報');
        });

        it('should emit rewards.points.awarded event', () => {
            service.awardPoints('user-1', 50, '回報');
            expect(eventEmitter.emit).toHaveBeenCalledWith('rewards.points.awarded', expect.objectContaining({
                userId: 'user-1',
                amount: 50,
            }));
        });

        it('should accumulate points across calls', () => {
            service.awardPoints('user-1', 50, 'a');
            service.awardPoints('user-1', 60, 'b');
            const rewards = service.getUserRewards('user-1');
            expect(rewards.points).toBe(110);
            expect(rewards.history).toHaveLength(2);
        });

        it('should award badge when threshold reached', () => {
            service.awardPoints('user-1', 100, '批量積分');
            const rewards = service.getUserRewards('user-1');
            expect(rewards.badges).toContain('first_report');
            expect(rewards.badges).toContain('verified_10');
        });

        it('should emit badge earned event', () => {
            service.awardPoints('user-1', 500, '大量積分');
            expect(eventEmitter.emit).toHaveBeenCalledWith('rewards.badge.earned', expect.objectContaining({
                userId: 'user-1',
            }));
        });

        it('should update level based on points', () => {
            service.awardPoints('user-1', 250, '升級');
            const rewards = service.getUserRewards('user-1');
            expect(rewards.level).toBe(3); // floor(250/100) + 1 = 3
        });
    });

    describe('getLeaderboard', () => {
        it('should return sorted leaderboard', () => {
            service.awardPoints('user-1', 100, 'a');
            service.awardPoints('user-2', 200, 'b');
            service.awardPoints('user-3', 150, 'c');
            const board = service.getLeaderboard(3);
            expect(board[0].userId).toBe('user-2');
            expect(board[0].rank).toBe(1);
            expect(board[1].userId).toBe('user-3');
            expect(board[2].userId).toBe('user-1');
        });

        it('should limit results', () => {
            service.awardPoints('a', 10, 'x');
            service.awardPoints('b', 20, 'x');
            service.awardPoints('c', 30, 'x');
            const board = service.getLeaderboard(2);
            expect(board).toHaveLength(2);
        });
    });

    describe('redeemReward', () => {
        it('should deduct points and return reward', async () => {
            service.awardPoints('user-1', 200, '積分');
            const result = await service.redeemReward('user-1', 'coffee');
            expect(result.success).toBe(true);
            expect(result.reward?.name).toBe('咖啡券');
            expect(service.getUserRewards('user-1').points).toBe(100); // 200 - 100
        });

        it('should fail when insufficient points', async () => {
            service.awardPoints('user-1', 10, '少量');
            const result = await service.redeemReward('user-1', 'coffee');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Insufficient');
        });

        it('should fail when reward not found', async () => {
            service.awardPoints('user-1', 1000, '很多');
            const result = await service.redeemReward('user-1', 'nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('getRewardCatalog', () => {
        it('should return catalog with 4 items', () => {
            const catalog = service.getRewardCatalog();
            expect(catalog).toHaveLength(4);
            expect(catalog.map(r => r.id)).toEqual(['coffee', 'meal', 'certificate', 'tshirt']);
        });
    });

    describe('event handlers', () => {
        it('should award points on report verified', () => {
            service.handleReportVerified({ reporterId: 'user-1' });
            expect(service.getUserRewards('user-1').points).toBe(20);
        });

        it('should skip when no reporterId', () => {
            service.handleReportVerified({});
            // No error, no points awarded
        });

        it('should award points on microtask completed', () => {
            service.handleMicroTaskCompleted({ userId: 'user-1', points: 15 });
            expect(service.getUserRewards('user-1').points).toBe(15);
        });
    });
});
