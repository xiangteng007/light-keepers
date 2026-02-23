import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks-admin.controller';
import { WebhookSubscriptionService } from './services/webhook-subscription.service';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('WebhooksController (Admin)', () => {
    let controller: WebhooksController;

    beforeEach(async () => {
        const subService = {
            findAll: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue({ id: 's1' }),
            create: jest.fn().mockResolvedValue({ id: 's1' }),
            update: jest.fn().mockResolvedValue({ id: 's1' }),
            delete: jest.fn().mockResolvedValue(undefined),
            regenerateSecret: jest.fn().mockResolvedValue('new-secret'),
            testEndpoint: jest.fn().mockResolvedValue({ success: true }),
            getStats: jest.fn().mockResolvedValue({}),
        };
        const dispService = {
            dispatch: jest.fn().mockResolvedValue(['d1']),
            getRecentLogs: jest.fn().mockResolvedValue([]),
            getDeliveryStats: jest.fn().mockResolvedValue({}),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WebhooksController],
            providers: [
                { provide: WebhookSubscriptionService, useValue: subService },
                { provide: WebhookDispatcherService, useValue: dispService },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<WebhooksController>(WebhooksController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('listSubscriptions', async () => expect((await controller.listSubscriptions()).success).toBe(true));
    it('getSubscription', async () => expect((await controller.getSubscription('s1')).success).toBe(true));
    it('createSubscription', async () => expect((await controller.createSubscription({} as any)).success).toBe(true));
    it('updateSubscription', async () => expect((await controller.updateSubscription('s1', {} as any)).success).toBe(true));
    it('deleteSubscription', async () => expect((await controller.deleteSubscription('s1')).success).toBe(true));
    it('regenerateSecret', async () => expect((await controller.regenerateSecret('s1')).success).toBe(true));
    it('testSubscription', async () => expect((await controller.testSubscription('s1')).success).toBe(true));
    it('enableSubscription', async () => expect((await controller.enableSubscription('s1')).success).toBe(true));
    it('disableSubscription', async () => expect((await controller.disableSubscription('s1')).success).toBe(true));
    it('getEventTypes', async () => expect((await controller.getEventTypes()).success).toBe(true));
    it('getDeliveryLogs', async () => expect((await controller.getDeliveryLogs()).success).toBe(true));
    it('getStats', async () => expect((await controller.getStats()).success).toBe(true));
    it('manualDispatch', async () => expect((await controller.manualDispatch({} as any)).success).toBe(true));
});
