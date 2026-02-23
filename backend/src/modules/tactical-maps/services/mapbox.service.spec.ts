import { MapboxService } from './mapbox.service';

describe('MapboxService', () => {
    let service: MapboxService;
    const configService = { get: jest.fn().mockReturnValue(undefined) };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MapboxService(configService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('isConfigured', () => {
        it('should return false when no token', () => {
            expect(service.isConfigured()).toBe(false);
        });
    });

    describe('geocode', () => {
        it('should return mock results when not configured', async () => {
            const results = await service.geocode('台北市信義區');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].placeName).toBeDefined();
        });
    });

    describe('reverseGeocode', () => {
        it('should return mock result', async () => {
            const result = await service.reverseGeocode(121.56, 25.03);
            expect(result).toBeDefined();
            expect(result!.coordinates).toBeDefined();
        });
    });

    describe('getDirections', () => {
        it('should return mock directions', async () => {
            const result = await service.getDirections([[121.56, 25.03], [121.52, 25.05]]);
            expect(result).toBeDefined();
            expect(result!.distance).toBeGreaterThan(0);
        });
    });

    describe('getIsochrone', () => {
        it('should return mock isochrone polygons', async () => {
            const result = await service.getIsochrone([121.56, 25.03]);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].type).toBe('Feature');
        });
    });

    describe('optimizeRoute', () => {
        it('should return optimized route', async () => {
            const waypoints = [
                { id: 'w1', coordinates: [121.56, 25.03] as [number, number] },
                { id: 'w2', coordinates: [121.52, 25.05] as [number, number] },
                { id: 'w3', coordinates: [121.54, 25.04] as [number, number] },
            ];
            const result = await service.optimizeRoute(waypoints);
            expect(result).toBeDefined();
            expect(result!.optimizedOrder).toBeDefined();
        });
    });

    describe('getStaticMapUrl', () => {
        it('should return URL string', () => {
            const url = service.getStaticMapUrl({ center: [121.56, 25.03], zoom: 14 });
            expect(url).toContain('mapbox');
        });
    });
});
