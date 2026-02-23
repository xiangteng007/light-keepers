import { Test, TestingModule } from '@nestjs/testing';
import { VoiceCallController } from './voice-call.controller';
import { VoiceCallService } from './voice-call.service';

describe('VoiceCallController', () => {
    let controller: VoiceCallController;

    beforeEach(async () => {
        const service = {
            getOnlineUsers: jest.fn().mockReturnValue([{ userId: 'u1' }]),
            getActiveCallsCount: jest.fn().mockReturnValue(2),
            initiateLineCall: jest.fn().mockResolvedValue({ success: true, callbackUrl: 'http://cb' }),
            broadcastToMission: jest.fn().mockResolvedValue(5),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VoiceCallController],
            providers: [{ provide: VoiceCallService, useValue: service }],
        }).compile();
        controller = module.get<VoiceCallController>(VoiceCallController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getOnlineUsers', async () => expect((await controller.getOnlineUsers()).success).toBe(true));
    it('getStats', async () => expect((await controller.getStats()).success).toBe(true));
    it('initiateLineCall', async () => expect((await controller.initiateLineCall({ lineUserId: 'u1', callerId: 'c1' })).success).toBe(true));
    it('broadcastToMission', async () => expect((await controller.broadcastToMission('m1', { message: 'test' })).success).toBe(true));
    it('getTurnCredentials', async () => expect((await controller.getTurnCredentials()).success).toBe(true));
});
