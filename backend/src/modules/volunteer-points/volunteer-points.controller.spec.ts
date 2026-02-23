import { Test, TestingModule } from '@nestjs/testing';
import { VolunteerPointsController } from './volunteer-points.controller';
import { VolunteerPointsService } from './volunteer-points.service';

describe('VolunteerPointsController', () => {
    let controller: VolunteerPointsController;

    beforeEach(async () => {
        const service = {
            getVolunteerPoints: jest.fn().mockReturnValue({ totalPoints: 100 }),
            initializeVolunteer: jest.fn().mockReturnValue({ id: 'v1' }),
            addPoints: jest.fn().mockReturnValue({ totalPoints: 150 }),
            recordServiceHours: jest.fn().mockReturnValue(20),
            getRewards: jest.fn().mockReturnValue([]),
            redeemReward: jest.fn().mockReturnValue({ id: 'r1' }),
            fulfillRedemption: jest.fn().mockReturnValue(true),
            getLeaderboard: jest.fn().mockReturnValue([]),
            generateAnnualReport: jest.fn().mockReturnValue({}),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VolunteerPointsController],
            providers: [{ provide: VolunteerPointsService, useValue: service }],
        }).compile();
        controller = module.get<VolunteerPointsController>(VolunteerPointsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getVolunteerPoints', () => expect(controller.getVolunteerPoints('v1')).toBeDefined());
    it('initializeVolunteer', () => expect(controller.initializeVolunteer('v1', 'Name')).toBeDefined());
    it('addPoints', () => expect(controller.addPoints('v1', { points: 50, reason: 'test' })).toBeDefined());
    it('recordServiceHours', () => expect(controller.recordServiceHours('v1', { hours: 5 })).toEqual({ earnedPoints: 20 }));
    it('getRewards', () => expect(controller.getRewards()).toEqual([]));
    it('redeemReward', () => expect(controller.redeemReward('v1', 'r1')).toBeDefined());
    it('fulfillRedemption', () => expect(controller.fulfillRedemption('v1', 'rd1')).toEqual({ success: true }));
    it('getLeaderboard', () => expect(controller.getLeaderboard()).toEqual([]));
    it('generateAnnualReport', () => expect(controller.generateAnnualReport('v1', 2024)).toBeDefined());
});
