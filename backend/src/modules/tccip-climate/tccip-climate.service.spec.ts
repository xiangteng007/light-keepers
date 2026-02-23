import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TccipClimateService } from './tccip-climate.service';

describe('TccipClimateService', () => {
    let service: TccipClimateService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TccipClimateService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();
        service = module.get<TccipClimateService>(TccipClimateService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getClimateTrends', () => {
        it('should return climate trend data', async () => {
            const trend = await service.getClimateTrends('台北');
            expect(trend.region).toBe('台北');
            expect(trend.temperatureTrend.change).toBe(1.7);
            expect(trend.seaLevelRise.projected2050).toBe(25);
            expect(trend.dataSource).toContain('TCCIP');
        });
    });

    describe('getExtremeWeatherForecast', () => {
        it('should return extreme weather forecasts', async () => {
            const forecasts = await service.getExtremeWeatherForecast('台北');
            expect(forecasts).toHaveLength(3);
            expect(forecasts.map(f => f.type)).toContain('heatwave');
            expect(forecasts.map(f => f.type)).toContain('heavy_rain');
        });
    });

    describe('getVulnerabilityAssessment', () => {
        it('should return vulnerability dimensions', async () => {
            const assessment = await service.getVulnerabilityAssessment('台北');
            expect(assessment.overall).toBe('moderate');
            expect(assessment.dimensions.exposure).toBe(0.65);
            expect(assessment.primaryRisks).toContain('洪水');
            expect(assessment.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('getHistoricalDisasterStats', () => {
        it('should return disaster statistics', async () => {
            const stats = await service.getHistoricalDisasterStats('台北', 10);
            expect(stats.totalEvents).toBe(245);
            expect(stats.byType.typhoon).toBe(85);
            expect(stats.annualTrend).toBe('increasing');
        });
    });

    describe('getAdaptationStrategies', () => {
        it('should return strategies for known risks', () => {
            const strategies = service.getAdaptationStrategies(['flood', 'drought']);
            expect(strategies).toHaveLength(2);
            expect(strategies[0].risk).toBe('flood');
            expect(strategies[0].priority).toBe('high');
        });

        it('should filter out unknown risks', () => {
            const strategies = service.getAdaptationStrategies(['flood', 'unknown_risk']);
            expect(strategies).toHaveLength(1);
        });
    });
});
