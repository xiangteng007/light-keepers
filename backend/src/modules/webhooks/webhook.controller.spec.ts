import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('WebhookController', () => {
    let controller: WebhookController;

    beforeEach(async () => {
        const service = {
            getAllWebhooks: jest.fn().mockResolvedValue([]),
            registerWebhook: jest.fn().mockResolvedValue({ id: 'w1' }),
            getWebhook: jest.fn().mockResolvedValue({ id: 'w1' }),
            updateWebhook: jest.fn().mockResolvedValue({ id: 'w1' }),
            deleteWebhook: jest.fn().mockResolvedValue(true),
            getDeliveries: jest.fn().mockResolvedValue([]),
            trigger: jest.fn().mockResolvedValue(undefined),
            retryDelivery: jest.fn().mockResolvedValue(true),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WebhookController],
            providers: [{ provide: WebhookService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<WebhookController>(WebhookController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getAllWebhooks', async () => expect((await controller.getAllWebhooks()).success).toBe(true));
    it('getEvents', async () => expect((await controller.getEvents()).success).toBe(true));
    it('createWebhook', async () => expect((await controller.createWebhook({ name: 'test', url: 'http://a', events: ['sos.created'] } as any)).success).toBe(true));
    it('getWebhook', async () => expect((await controller.getWebhook('w1')).success).toBe(true));
    it('updateWebhook', async () => expect((await controller.updateWebhook('w1', {})).success).toBe(true));
    it('deleteWebhook', async () => expect((await controller.deleteWebhook('w1')).success).toBe(true));
    it('getDeliveries', async () => expect((await controller.getDeliveries('w1')).success).toBe(true));
    it('testWebhook', async () => expect((await controller.testWebhook('w1')).success).toBe(true));
    it('retryDelivery', async () => expect((await controller.retryDelivery('d1')).success).toBe(true));
});
