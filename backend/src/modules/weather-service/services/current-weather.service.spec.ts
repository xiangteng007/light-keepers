import { CurrentWeatherService } from './current-weather.service';

describe('CurrentWeatherService', () => {
    let service: CurrentWeatherService;
    const cwaApi = { fetch: jest.fn().mockResolvedValue(null) };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CurrentWeatherService(cwaApi as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getAll', () => {
        it('should return fallback data on init', () => {
            const all = service.getAll();
            expect(all.length).toBeGreaterThanOrEqual(6);
        });
    });

    describe('getByLocation', () => {
        it('should find by name substring', () => {
            const results = service.getByLocation('臺北');
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results[0].locationName).toContain('臺北');
        });

        it('should return empty for unknown location', () => {
            expect(service.getByLocation('不存在')).toEqual([]);
        });
    });

    describe('getByCode', () => {
        it('should find by code', () => {
            const result = service.getByCode('466920');
            expect(result).toBeDefined();
            expect(result!.locationName).toBe('臺北');
        });

        it('should return undefined for unknown code', () => {
            expect(service.getByCode('999999')).toBeUndefined();
        });
    });

    describe('getNearestStation', () => {
        it('should return nearest station', () => {
            const result = service.getNearestStation(25.03, 121.56);
            expect(result).toBeDefined();
        });
    });

    describe('getLastSyncTime', () => {
        it('should return null before sync', () => {
            expect(service.getLastSyncTime()).toBeNull();
        });
    });

    describe('syncWeatherData', () => {
        it('should handle null API response gracefully', async () => {
            await service.syncWeatherData();
            // Should not throw, fallback remains
            expect(service.getAll().length).toBeGreaterThanOrEqual(6);
        });
    });
});
