import { Test, TestingModule } from '@nestjs/testing';
import { LineBotController } from './line-bot.controller';
import { LineBotService } from './line-bot.service';
import { DisasterReportService } from './disaster-report';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('LineBotController', () => {
    let controller: LineBotController;
    let lineBotService: any;

    beforeEach(async () => {
        lineBotService = {
            verifySignature: jest.fn().mockReturnValue(true),
            replyMessage: jest.fn().mockResolvedValue(undefined),
            pushMessage: jest.fn().mockResolvedValue(undefined),
            broadcastMessage: jest.fn().mockResolvedValue(undefined),
            broadcastToRegion: jest.fn().mockResolvedValue(undefined),
            broadcast: jest.fn().mockResolvedValue(undefined),
            sendAlert: jest.fn().mockResolvedValue(undefined),
            sendDisasterAlert: jest.fn().mockResolvedValue(undefined),
            getConfig: jest.fn().mockReturnValue({}),
            getRichMenuConfig: jest.fn().mockReturnValue({}),
            isEnabled: jest.fn().mockReturnValue(true),
            getBoundUserCount: jest.fn().mockResolvedValue(50),
            bindAccount: jest.fn().mockResolvedValue(true),
            unbindAccount: jest.fn().mockResolvedValue(true),
            getBindingStatus: jest.fn().mockResolvedValue({ bound: true }),
            getStats: jest.fn().mockReturnValue({ totalUsers: 100 }),
        };

        const disasterReportService = {
            analyzeImage: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LineBotController],
            providers: [
                { provide: LineBotService, useValue: lineBotService },
                { provide: DisasterReportService, useValue: disasterReportService },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<LineBotController>(LineBotController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('sendAlert sends alerts to users', async () => {
        const result = await controller.sendAlert({
            userIds: ['u1'],
            title: 'Test',
            description: 'Alert',
            severity: 'warning',
        });
        expect(result).toBeDefined();
    });

    it('broadcast sends broadcast message', async () => {
        const result = await controller.broadcast({ message: 'Hello' });
        expect(result).toBeDefined();
    });

    it('getRichMenuConfig returns config', () => {
        const result = controller.getRichMenuConfig();
        expect(result).toBeDefined();
    });

    it('getStats returns stats', () => {
        const result = controller.getStats();
        expect(result).toBeDefined();
    });

    it('bindAccount binds account', async () => {
        const result = await controller.bindAccount({ accountId: 'a1', lineUserId: 'lu1' });
        expect(result).toBeDefined();
    });
});
