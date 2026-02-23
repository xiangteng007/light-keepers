import { WebhookDispatcherService } from './webhook-dispatcher.service';

describe('WebhookDispatcherService', () => {
    let service: WebhookDispatcherService;
    let deliveryLogRepo: Record<string, jest.Mock>;
    let subService: Record<string, jest.Mock>;
    let emitter: Record<string, jest.Mock>;

    beforeEach(() => {
        deliveryLogRepo = {
            create: jest.fn().mockImplementation((d: Record<string, unknown>) => ({ id: 'dl-1', ...d })),
            save: jest.fn().mockImplementation((e: Record<string, unknown>) => Promise.resolve(e)),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                getRawOne: jest.fn().mockResolvedValue({ total: '5', success: '3', failed: '1', pending: '1', avg_duration: '120' }),
            }),
            delete: jest.fn().mockResolvedValue({ affected: 10 }),
        };
        subService = {
            findByEventType: jest.fn().mockResolvedValue([]),
        };
        emitter = { emit: jest.fn() };

        service = new WebhookDispatcherService(deliveryLogRepo as any, subService as any, emitter as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('dispatch', () => {
        it('should return empty array when no subscriptions', async () => {
            const ids = await service.dispatch({ type: 'report.created' as any, data: {} });
            expect(ids).toEqual([]);
        });
    });

    describe('getDeliveryStats', () => {
        it('should return delivery statistics', async () => {
            const stats = await service.getDeliveryStats();
            expect(stats.total).toBe(0);
            expect(stats.success).toBe(0);
        });
    });

    describe('getRecentLogs', () => {
        it('should return recent logs', async () => {
            const logs = await service.getRecentLogs();
            expect(logs).toEqual([]);
        });
    });

    describe('generateSignature', () => {
        it('should produce HMAC-SHA256 signature', () => {
            const sig = (service as any).generateSignature({ test: 1 }, 'secret', '12345');
            expect(sig).toBeDefined();
            expect(typeof sig).toBe('string');
        });
    });

    describe('event listeners', () => {
        it('should dispatch on alert.created', () => {
            const spy = jest.spyOn(service, 'dispatch').mockResolvedValue([]);
            service.onAlertCreated({ id: 'a1' });
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should dispatch on task.created', () => {
            const spy = jest.spyOn(service, 'dispatch').mockResolvedValue([]);
            service.onTaskCreated({ id: 't1' });
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });
});
