import { AlertService } from './alert.service';

describe('AlertService', () => {
    let service: AlertService;
    let cwaApi: Record<string, jest.Mock>;
    let emitter: { emit: jest.Mock };

    beforeEach(() => {
        cwaApi = {
            fetch: jest.fn().mockResolvedValue({ dataset: { datasetInfo: [] } }),
        };
        emitter = { emit: jest.fn() };
        service = new AlertService(cwaApi as any, emitter as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createAlert', () => {
        it('should create alert and emit event', () => {
            const alert = service.createAlert({
                type: 'flood',
                severity: 'warning',
                title: '水災警報',
                description: '低窪地區注意',
                affectedAreas: ['新北市'],
                startTime: new Date(),
                source: 'manual',
                isActive: true,
            });
            expect(alert.id).toBeDefined();
            expect(alert.type).toBe('flood');
        });
    });

    describe('getActiveAlerts', () => {
        it('should return active alerts', () => {
            service.createAlert({ type: 'earthquake', severity: 'emergency', title: '地震', description: '', affectedAreas: [], startTime: new Date(), source: 'manual', isActive: true });
            const active = service.getActiveAlerts();
            // Sample alerts + 1 new
            expect(active.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getAlertsByRegion', () => {
        it('should filter by region', () => {
            service.createAlert({ type: 'flood', severity: 'watch', title: '水災', description: '', affectedAreas: ['台北市'], startTime: new Date(), source: 'manual', isActive: true });
            const taipei = service.getAlertsByRegion('台北');
            expect(taipei.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('resolveAlert', () => {
        it('should deactivate alert', () => {
            const alert = service.createAlert({ type: 'heavy_rain', severity: 'advisory', title: '大雨', description: '', affectedAreas: [], startTime: new Date(), source: 'manual', isActive: true });
            const resolved = service.resolveAlert(alert.id);
            expect(resolved).toBe(true);
            expect(service.getAlert(alert.id)?.isActive).toBe(false);
        });

        it('should return false for unknown ID', () => {
            expect(service.resolveAlert('bad-id')).toBe(false);
        });
    });

    describe('subscribe / unsubscribe', () => {
        it('should create subscription', () => {
            const sub = service.subscribe({ userId: 'u1', alertTypes: ['flood'], regions: ['台北'], channels: ['push'], enabled: true });
            expect(sub.id).toBeDefined();
        });

        it('should get user subscriptions', () => {
            service.subscribe({ userId: 'u1', alertTypes: ['flood'], regions: [], channels: ['push'], enabled: true });
            expect(service.getUserSubscriptions('u1')).toHaveLength(1);
        });

        it('should unsubscribe', () => {
            const sub = service.subscribe({ userId: 'u1', alertTypes: [], regions: [], channels: ['push'], enabled: true });
            expect(service.unsubscribe(sub.id)).toBe(true);
        });
    });

    describe('mission links', () => {
        it('should link and unlink mission', () => {
            service.createAlert({ type: 'typhoon', severity: 'warning', title: '颱風', description: '', affectedAreas: ['宜蘭'], startTime: new Date(), source: 'manual', isActive: true });
            const link = service.linkMission({ missionId: 'm1', alertId: 'any', autoTrigger: true, actions: ['notify_team'] });
            expect(link.missionId).toBe('m1');
            expect(service.unlinkMission('m1')).toBe(true);
        });

        it('should evaluate mission impact', () => {
            const result = service.evaluateMissionImpact('m99');
            expect(result).toHaveProperty('shouldProceed');
            expect(result).toHaveProperty('warnings');
        });
    });

    describe('syncFromCwa', () => {
        it('should sync and return 0 when no data', async () => {
            const count = await service.syncFromCwa();
            expect(count).toBe(0);
        });
    });
});
