import { CwaWeatherService } from './cwa-weather.service';

describe('CwaWeatherService', () => {
    let service: CwaWeatherService;
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const cacheService = { get: jest.fn().mockReturnValue(null), set: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CwaWeatherService(configService as any, cacheService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('isConfigured', () => {
        it('should return false without API key', () => {
            expect(service.isConfigured()).toBe(false);
        });
    });

    describe('getCurrentWeather', () => {
        it('should return mock data when not configured', async () => {
            const data = await service.getCurrentWeather('臺北');
            expect(data).toBeDefined();
            expect(data!.location).toBe('臺北');
            expect(data!.temperature).toBeDefined();
        });
    });

    describe('getForecast', () => {
        it('should return mock forecast', async () => {
            const forecast = await service.getForecast('臺北', 3);
            expect(forecast.length).toBeGreaterThan(0);
            expect(forecast[0].location).toBe('臺北');
        });
    });

    describe('getActiveAlerts', () => {
        it('should return alerts array', async () => {
            const alerts = await service.getActiveAlerts();
            expect(Array.isArray(alerts)).toBe(true);
        });
    });
});
