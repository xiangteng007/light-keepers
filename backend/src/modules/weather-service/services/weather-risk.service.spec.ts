import { WeatherRiskService } from './weather-risk.service';

describe('WeatherRiskService', () => {
    let service: WeatherRiskService;
    const currentWeather = {
        getNearestStation: jest.fn().mockReturnValue({
            locationName: '臺北', temperature: 28, humidity: 70,
            rainfall: 0, windSpeed: 3, windDirection: 'N', pressure: 1013,
        }),
    };
    const alertService = { getActiveAlerts: jest.fn().mockReturnValue([]) };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new WeatherRiskService(currentWeather as any, alertService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('assessRisk', () => {
        it('should return low risk for calm weather', async () => {
            const result = await service.assessRisk(25.03, 121.56);
            expect(result.riskLevel).toBe('low');
            expect(result.score).toBeLessThan(25);
        });

        it('should increase score for heavy rainfall', async () => {
            currentWeather.getNearestStation.mockReturnValueOnce({
                locationName: '臺北', rainfall: 60, windSpeed: 3, humidity: 70,
            });
            const result = await service.assessRisk(25.03, 121.56);
            expect(result.score).toBeGreaterThanOrEqual(40);
            expect(result.factors.some(f => f.type === 'rainfall')).toBe(true);
        });

        it('should factor in active alerts', async () => {
            alertService.getActiveAlerts.mockReturnValueOnce([
                { severity: 'warning', title: '豪雨特報' },
            ]);
            const result = await service.assessRisk(25.03, 121.56);
            expect(result.score).toBeGreaterThanOrEqual(30);
        });
    });

    describe('assessMissionFeasibility', () => {
        it('should return feasible for calm conditions', async () => {
            const result = await service.assessMissionFeasibility('m1', [
                { lat: 25.03, lng: 121.56 },
            ]);
            expect(result.feasible).toBe(true);
            expect(result.overallRisk).toBe('low');
        });
    });

    describe('hasSevereWeather', () => {
        it('should return false when no alerts', () => {
            expect(service.hasSevereWeather()).toBe(false);
        });

        it('should return true for warning alert', () => {
            alertService.getActiveAlerts.mockReturnValueOnce([
                { severity: 'warning', title: '颱風警報' },
            ]);
            expect(service.hasSevereWeather()).toBe(true);
        });
    });

    describe('getActionRecommendations', () => {
        it('should return critical recommendations', () => {
            const recs = service.getActionRecommendations('critical');
            expect(recs.length).toBeGreaterThanOrEqual(4);
            expect(recs[0]).toContain('停止');
        });

        it('should return low risk recommendations', () => {
            const recs = service.getActionRecommendations('low');
            expect(recs[0]).toContain('正常');
        });
    });
});
