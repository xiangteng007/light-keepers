import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
    let service: WebhookService;
    let httpService: Record<string, jest.Mock>;
    let cacheService: Record<string, jest.Mock>;

    beforeEach(() => {
        httpService = {
            post: jest.fn(),
        };
        cacheService = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };
        service = new WebhookService(httpService as any, cacheService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('registerWebhook', () => {
        it('should register a webhook', async () => {
            const wh = await service.registerWebhook({
                name: 'Test', url: 'https://example.com/hook',
                events: ['report.created'], enabled: true,
                retryCount: 3, retryDelayMs: 1000, timeoutMs: 5000,
            });
            expect(wh.id).toBeDefined();
            expect(wh.name).toBe('Test');
        });
    });

    describe('getAllWebhooks', () => {
        it('should return all registered webhooks', async () => {
            await service.registerWebhook({
                name: 'A', url: 'https://a.com/hook', events: ['x'], enabled: true,
                retryCount: 1, retryDelayMs: 500, timeoutMs: 3000,
            });
            const all = await service.getAllWebhooks();
            expect(all.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getWebhook', () => {
        it('should find webhook by ID', async () => {
            const wh = await service.registerWebhook({
                name: 'Find', url: 'https://b.com', events: ['y'], enabled: true,
                retryCount: 1, retryDelayMs: 500, timeoutMs: 3000,
            });
            const found = await service.getWebhook(wh.id);
            expect(found?.name).toBe('Find');
        });

        it('should return null for missing ID', async () => {
            expect(await service.getWebhook('bad')).toBeNull();
        });
    });

    describe('updateWebhook', () => {
        it('should update webhook', async () => {
            const wh = await service.registerWebhook({
                name: 'Old', url: 'https://c.com', events: ['z'], enabled: true,
                retryCount: 1, retryDelayMs: 500, timeoutMs: 3000,
            });
            const updated = await service.updateWebhook(wh.id, { name: 'New' });
            expect(updated?.name).toBe('New');
        });

        it('should return null for missing ID', async () => {
            expect(await service.updateWebhook('bad', { name: 'x' })).toBeNull();
        });
    });

    describe('deleteWebhook', () => {
        it('should delete webhook', async () => {
            const wh = await service.registerWebhook({
                name: 'Del', url: 'https://d.com', events: ['d'], enabled: true,
                retryCount: 1, retryDelayMs: 500, timeoutMs: 3000,
            });
            expect(await service.deleteWebhook(wh.id)).toBe(true);
        });

        it('should return false for missing ID', async () => {
            expect(await service.deleteWebhook('bad')).toBe(false);
        });
    });

    describe('getDeliveries', () => {
        it('should return empty deliveries initially', async () => {
            const deliveries = await service.getDeliveries();
            expect(deliveries).toEqual([]);
        });
    });
});
