import { Test, TestingModule } from '@nestjs/testing';
import { VolunteerPointsService } from './volunteer-points.service';

describe('VolunteerPointsService', () => {
    let service: VolunteerPointsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [VolunteerPointsService],
        }).compile();

        service = module.get<VolunteerPointsService>(VolunteerPointsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== initializeVolunteer =====
    describe('initializeVolunteer', () => {
        it('should create volunteer with zero points at level 1', () => {
            const v = service.initializeVolunteer('v1', '張三');
            expect(v.totalPoints).toBe(0);
            expect(v.currentLevel).toBe(1);
            expect(v.levelName).toBe('新手志工');
            expect(v.badges).toHaveLength(0);
        });
    });

    // ===== addPoints =====
    describe('addPoints', () => {
        it('should add points and create transaction', () => {
            service.initializeVolunteer('v1', '張三');
            const tx = service.addPoints('v1', 50, '完成培訓');
            expect(tx!.type).toBe('earn');
            expect(tx!.points).toBe(50);
            const v = service.getVolunteerPoints('v1');
            expect(v!.totalPoints).toBe(50);
        });

        it('should auto-initialize unknown volunteer', () => {
            service.addPoints('new-vol', 10, 'test');
            const v = service.getVolunteerPoints('new-vol');
            expect(v).toBeDefined();
            expect(v!.totalPoints).toBe(10);
        });

        it('should trigger level up at 100 points', () => {
            service.initializeVolunteer('v2', '李四');
            service.addPoints('v2', 100, '升級');
            const v = service.getVolunteerPoints('v2');
            expect(v!.currentLevel).toBe(2);
            expect(v!.levelName).toBe('見習志工');
            expect(v!.badges.some(b => b.id === 'level-2')).toBe(true);
        });

        it('should trigger multiple level ups for large points', () => {
            service.initializeVolunteer('v3', '王五');
            service.addPoints('v3', 5000, '特殊貢獻');
            const v = service.getVolunteerPoints('v3');
            expect(v!.currentLevel).toBe(5);
            expect(v!.levelName).toBe('精英志工');
        });
    });

    // ===== recordServiceHours =====
    describe('recordServiceHours', () => {
        it('should calculate base points per hour', () => {
            service.initializeVolunteer('v1', '張三');
            const pts = service.recordServiceHours('v1', 5, false, false, false);
            expect(pts).toBe(50); // 5h * 10
        });

        it('should add night shift bonus', () => {
            service.initializeVolunteer('v1', '張三');
            const pts = service.recordServiceHours('v1', 5, true, false, false);
            expect(pts).toBe(75); // 5*(10+5)
        });

        it('should add weekend bonus', () => {
            service.initializeVolunteer('v1', '張三');
            const pts = service.recordServiceHours('v1', 5, false, true, false);
            expect(pts).toBe(65); // 5*(10+3)
        });

        it('should add emergency bonus (flat)', () => {
            service.initializeVolunteer('v1', '張三');
            const pts = service.recordServiceHours('v1', 5, false, false, true);
            expect(pts).toBe(70); // 5*10 + 20
        });

        it('should stack all bonuses', () => {
            service.initializeVolunteer('v1', '張三');
            const pts = service.recordServiceHours('v1', 5, true, true, true);
            // 5*(10+5+3) + 20 = 110
            expect(pts).toBe(110);
        });

        it('should award service hour badge at 10h', () => {
            service.initializeVolunteer('v1', '張三');
            service.recordServiceHours('v1', 10, false, false, false);
            const v = service.getVolunteerPoints('v1');
            expect(v!.badges.some(b => b.id === 'hours-10')).toBe(true);
        });
    });

    // ===== Rewards =====
    describe('getRewards', () => {
        it('should return default active rewards', () => {
            const rewards = service.getRewards();
            expect(rewards.length).toBe(5);
            rewards.forEach(r => expect(r.active).toBe(true));
        });
    });

    describe('redeemReward', () => {
        it('should redeem reward and deduct points', () => {
            service.initializeVolunteer('v1', '張三');
            service.addPoints('v1', 500, 'test');
            const redemption = service.redeemReward('v1', 'r4'); // 志工帽 100pts
            expect(redemption).not.toBeNull();
            expect(redemption!.status).toBe('pending');
            expect(redemption!.pointsCost).toBe(100);
            const v = service.getVolunteerPoints('v1');
            expect(v!.totalPoints).toBe(400);
        });

        it('should return null for insufficient points', () => {
            service.initializeVolunteer('v1', '張三');
            service.addPoints('v1', 50, 'test');
            const result = service.redeemReward('v1', 'r5'); // 急救包 500pts
            expect(result).toBeNull();
        });

        it('should return null for unknown volunteer', () => {
            expect(service.redeemReward('unknown', 'r1')).toBeNull();
        });
    });

    describe('fulfillRedemption', () => {
        it('should mark redemption as fulfilled', () => {
            service.initializeVolunteer('v1', '張三');
            service.addPoints('v1', 200, 'test');
            const redemption = service.redeemReward('v1', 'r4')!;
            const result = service.fulfillRedemption('v1', redemption.id);
            expect(result).toBe(true);
            const v = service.getVolunteerPoints('v1');
            const fulfilled = v!.redemptions.find(r => r.id === redemption.id);
            expect(fulfilled!.status).toBe('fulfilled');
            expect(fulfilled!.fulfilledAt).toBeDefined();
        });

        it('should return false for non-pending redemption', () => {
            service.initializeVolunteer('v1', '張三');
            service.addPoints('v1', 200, 'test');
            const redemption = service.redeemReward('v1', 'r4')!;
            service.fulfillRedemption('v1', redemption.id);
            // Try again
            expect(service.fulfillRedemption('v1', redemption.id)).toBe(false);
        });
    });

    // ===== Leaderboard =====
    describe('getLeaderboard', () => {
        it('should sort by totalPoints descending', () => {
            service.initializeVolunteer('v1', 'A');
            service.initializeVolunteer('v2', 'B');
            service.addPoints('v1', 100, 'x');
            service.addPoints('v2', 200, 'x');
            const board = service.getLeaderboard();
            expect(board[0].volunteerId).toBe('v2');
            expect(board[0].rank).toBe(1);
            expect(board[1].volunteerId).toBe('v1');
        });

        it('should respect limit', () => {
            for (let i = 0; i < 15; i++) {
                service.addPoints(`v${i}`, i * 10, 'x');
            }
            const board = service.getLeaderboard(5);
            expect(board).toHaveLength(5);
        });
    });

    // ===== Annual Report =====
    describe('generateAnnualReport', () => {
        it('should generate annual report with earned/redeemed', () => {
            service.initializeVolunteer('v1', '張三');
            service.addPoints('v1', 300, '服務');
            service.redeemReward('v1', 'r4'); // -100
            const report = service.generateAnnualReport('v1', new Date().getFullYear());
            expect(report).not.toBeNull();
            expect(report!.totalEarned).toBe(300);
            expect(report!.totalRedeemed).toBe(100);
            expect(report!.netPoints).toBe(200);
            expect(report!.rank).toBe(1);
        });

        it('should return null for unknown volunteer', () => {
            expect(service.generateAnnualReport('fake', 2025)).toBeNull();
        });
    });
});
