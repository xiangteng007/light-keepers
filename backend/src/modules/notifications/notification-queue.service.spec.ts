import { NotificationQueueService } from './notification-queue.service';

describe('NotificationQueueService', () => {
    let service: NotificationQueueService;
    let configService: Record<string, jest.Mock>;
    let cacheService: Record<string, jest.Mock>;

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue('test') };
        cacheService = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };
        service = new NotificationQueueService(configService as any, cacheService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('queue', () => {
        it('should queue notification and return ID', async () => {
            const id = await service.queue({
                type: 'alert', title: '測試', body: '測試通知',
                recipients: ['u1'], channels: ['in_app' as any],
            });
            expect(id).toBeDefined();
        });
    });

    describe('send', () => {
        it('should send notification to all channels', async () => {
            const result = await service.send({
                type: 'alert', title: '測試', body: '通知',
                recipients: ['u1'], channels: ['in_app' as any],
            });
            expect(result.id).toBeDefined();
        });
    });

    describe('sendSosAlert', () => {
        it('should send SOS alert', async () => {
            const id = await service.sendSosAlert(
                'sos1', { lat: 25.03, lng: 121.56 }, '需要救援', ['u1'],
            );
            expect(id).toBeDefined();
        });
    });

    describe('sendTaskAssignment', () => {
        it('should send task assignment', async () => {
            const id = await service.sendTaskAssignment('t1', '搜救任務', 'u1');
            expect(id).toBeDefined();
        });
    });

    describe('sendNewReportAlert', () => {
        it('should send report alert for high severity', async () => {
            const id = await service.sendNewReportAlert('fr1', 'hazard', 4, ['u1']);
            expect(id).toBeDefined();
        });
    });

    describe('sendWeatherAlert', () => {
        it('should send weather alert', async () => {
            const id = await service.sendWeatherAlert('typhoon', ['台北市'], ['u1']);
            expect(id).toBeDefined();
        });
    });

    describe('getResult', () => {
        it('should return null for unknown ID', async () => {
            const result = await service.getResult('unknown');
            expect(result).toBeNull();
        });
    });

    describe('registerFcmToken', () => {
        it('should register FCM token', async () => {
            await expect(service.registerFcmToken('u1', 'token123')).resolves.not.toThrow();
        });
    });

    describe('registerLineId', () => {
        it('should register LINE ID', async () => {
            await expect(service.registerLineId('u1', 'L123')).resolves.not.toThrow();
        });
    });
});
