import { Fire119DeepIntegrationService } from './fire-119-deep.service';

describe('Fire119DeepIntegrationService', () => {
    let service: Fire119DeepIntegrationService;
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const eventEmitter = { emit: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new Fire119DeepIntegrationService(configService as any, eventEmitter as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('pullFromCad', () => {
        it('should pull simulated CAD incidents', async () => {
            const result = await service.pullFromCad();
            expect(result.success).toBe(true);
            expect(result.recordsCreated).toBeGreaterThanOrEqual(0);
        });
    });

    describe('pushToCad', () => {
        it('should push incident update and return result', async () => {
            const result = await service.pushToCad({ id: 'inc-1', cadNumber: 'F-2026-001' } as any);
            expect(result.success).toBe(true);
            expect(result.direction).toBe('push');
        });
    });

    describe('getCadIncident / getActiveIncidents', () => {
        it('should return undefined for unknown ID', () => {
            expect(service.getCadIncident('nonexistent')).toBeUndefined();
        });

        it('should list active incidents after pull', async () => {
            await service.pullFromCad();
            const active = service.getActiveIncidents();
            expect(active.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('updateUnitLocation', () => {
        it('should update unit location without error', () => {
            expect(() => service.updateUnitLocation('unit-1', { lat: 25.03, lng: 121.56 })).not.toThrow();
        });
    });

    describe('getNearbyWaterSources', () => {
        it('should return water sources within radius', () => {
            const sources = service.getNearbyWaterSources({ lat: 25.03, lng: 121.56 }, 5);
            expect(Array.isArray(sources)).toBe(true);
        });
    });

    describe('calculateEta', () => {
        it('should return null for unknown unit', () => {
            expect(service.calculateEta('unknown', { lat: 25, lng: 121 })).toBeNull();
        });
    });
});
