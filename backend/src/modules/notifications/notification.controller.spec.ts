import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationQueueService } from './notification-queue.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('NotificationController', () => {
    let controller: NotificationController;

    beforeEach(async () => {
        const service = {
            queue: jest.fn().mockResolvedValue('n-id-1'),
            getResult: jest.fn().mockResolvedValue({ status: 'sent' }),
            registerFcmToken: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationController],
            providers: [{ provide: NotificationQueueService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<NotificationController>(NotificationController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('sendNotification queues notification', async () => {
        const result = await controller.sendNotification({ title: 'T', body: 'B', recipients: ['u1'] } as any);
        expect(result.success).toBe(true);
    });
    it('getResult returns result', async () => {
        const result = await controller.getResult('n-id-1');
        expect(result.success).toBe(true);
    });
    it('registerToken registers', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.registerToken(req, { token: 'fcm-xyz' } as any);
        expect(result.success).toBe(true);
    });
    it('testNotification sends test', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.testNotification(req);
        expect(result.success).toBe(true);
    });
    it('getPreferences returns defaults', async () => {
        const req = {} as any;
        const result = await controller.getPreferences(req);
        expect(result.success).toBe(true);
    });
});
