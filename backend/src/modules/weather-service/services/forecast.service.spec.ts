import { Test, TestingModule } from '@nestjs/testing';
import { ForecastService } from './forecast.service';
import { CwaApiService } from './cwa-api.service';

describe('ForecastService', () => {
    let service: ForecastService;
    // ForecastService 實際呼叫的是 CwaApiService.fetch()，
    // 先前 mock 成 fetchData 導致 service 呼叫到 undefined 而拋錯。
    const mockCwa = {
        fetch: jest.fn().mockResolvedValue(null),
    };

    beforeEach(async () => {
        mockCwa.fetch.mockClear();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ForecastService,
                { provide: CwaApiService, useValue: mockCwa },
            ],
        }).compile();
        service = module.get(ForecastService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getGeneralForecast returns fallback when API unavailable', async () => {
        const forecasts = await service.getGeneralForecast('臺北市');
        expect(Array.isArray(forecasts)).toBe(true);
        expect(forecasts.length).toBeGreaterThan(0);
    });

    it('getWeeklyForecast returns fallback', async () => {
        const forecasts = await service.getWeeklyForecast();
        expect(Array.isArray(forecasts)).toBe(true);
    });

    it('getMarineForecast returns data', async () => {
        const forecasts = await service.getMarineForecast();
        expect(Array.isArray(forecasts)).toBe(true);
    });

    it('getTideForecast returns fallback', async () => {
        const tides = await service.getTideForecast();
        expect(Array.isArray(tides)).toBe(true);
    });

    it('getForecastSummary returns summary', async () => {
        const summary = await service.getForecastSummary();
        expect(summary).toBeDefined();
    });

    it('generateFallbackForecast returns data', () => {
        const data = (service as any).generateFallbackForecast('臺北市');
        expect(data.length).toBeGreaterThan(0);
        expect(data[0].locationName).toBe('臺北市');
    });
});
