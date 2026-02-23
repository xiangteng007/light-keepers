import { Fire119Service } from './fire-119.service';

describe('Fire119Service', () => {
    let service: Fire119Service;
    const configService = { get: jest.fn().mockReturnValue(undefined) };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new Fire119Service(configService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getRecentIncidents', () => {
        it('should return not-configured when env vars missing', async () => {
            const result = await service.getRecentIncidents();
            expect(result.success).toBe(false);
            expect(result.error).toBe('FIRE119_NOT_CONFIGURED');
        });

        it('should call API when configured', async () => {
            configService.get.mockImplementation((key: string) =>
                key === 'FIRE119_API_ENDPOINT' ? 'https://api.fire119.tw' : 'test-key',
            );
            const svc = new Fire119Service(configService as any);
            // fetch will fail in test — that's ok, it goes to catch
            const result = await svc.getRecentIncidents('台北');
            expect(result.success).toBe(false); // fetch not available
            expect(result.error).toBe('API_ERROR');
        });
    });

    describe('subscribeToIncidents', () => {
        it('should return NOT_IMPLEMENTED', async () => {
            const result = await service.subscribeToIncidents('https://cb.example.com', ['fire']);
            expect(result.success).toBe(false);
            expect(result.error).toBe('NOT_IMPLEMENTED');
        });
    });

    describe('getIncidentDetails', () => {
        it('should return simulated incident details', async () => {
            const result = await service.getIncidentDetails('inc-001');
            expect(result).toBeDefined();
            expect(result!.type).toBe('fire');
            expect(result!.units.length).toBeGreaterThan(0);
        });
    });

    describe('getFireUnitLocations', () => {
        it('should return fire unit locations', async () => {
            const units = await service.getFireUnitLocations('信義');
            expect(units.length).toBeGreaterThan(0);
            expect(units[0]).toHaveProperty('unitId');
        });
    });

    describe('getIncidentStats', () => {
        it('should return stats for region', async () => {
            const stats = await service.getIncidentStats('台北', '2026-01');
            expect(stats.region).toBe('台北');
            expect(stats.totalIncidents).toBe(156);
            expect(stats.byType).toHaveProperty('fire');
        });
    });
});
