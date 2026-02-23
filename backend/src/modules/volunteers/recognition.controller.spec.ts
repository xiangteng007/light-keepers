import { Test, TestingModule } from '@nestjs/testing';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './entities/recognition.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('RecognitionController', () => {
    let controller: RecognitionController;

    beforeEach(async () => {
        const service = {
            getBadges: jest.fn().mockResolvedValue([]),
            getVolunteerBadges: jest.fn().mockResolvedValue([]),
            awardBadge: jest.fn().mockResolvedValue({ id: 'b1' }),
            getVolunteerRecognitions: jest.fn().mockResolvedValue([]),
            getPublicRecognitions: jest.fn().mockResolvedValue([]),
            createRecognition: jest.fn().mockResolvedValue({ id: 'r1' }),
            checkMilestones: jest.fn().mockResolvedValue([]),
            getLeaderboard: jest.fn().mockResolvedValue([]),
            getRecognitionStats: jest.fn().mockResolvedValue({}),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RecognitionController],
            providers: [{ provide: RecognitionService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<RecognitionController>(RecognitionController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getBadges', async () => expect((await controller.getBadges()).success).toBe(true));
    it('getVolunteerBadges', async () => expect((await controller.getVolunteerBadges('v1')).success).toBe(true));
    it('awardBadge', async () => expect((await controller.awardBadge({} as any)).success).toBe(true));
    it('getVolunteerRecognitions', async () => expect((await controller.getVolunteerRecognitions('v1')).success).toBe(true));
    it('getPublicRecognitions', async () => expect((await controller.getPublicRecognitions()).success).toBe(true));
    it('createRecognition', async () => expect((await controller.createRecognition({} as any)).success).toBe(true));
    it('checkMilestones', async () => expect((await controller.checkMilestones('v1')).success).toBe(true));
    it('getLeaderboard', async () => expect((await controller.getLeaderboard()).success).toBe(true));
    it('getStats', async () => expect((await controller.getStats()).success).toBe(true));
});
