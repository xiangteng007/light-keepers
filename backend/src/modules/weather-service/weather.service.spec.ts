import { WeatherService } from './weather.service';

describe('WeatherService', () => {
    let service: WeatherService;
    let currentWeather: Record<string, jest.Mock>;
    let forecast: Record<string, jest.Mock>;
    let alerts: Record<string, jest.Mock>;
    let risk: Record<string, jest.Mock>;

    beforeEach(() => {
        currentWeather = {
            getAll: jest.fn().mockReturnValue([{ station: 'S1', temp: 28 }]),
            getByLocation: jest.fn().mockReturnValue([{ station: 'S1', temp: 28 }]),
            getByCode: jest.fn().mockReturnValue({ station: 'S1' }),
            getNearestStation: jest.fn().mockReturnValue({ station: 'S1' }),
            syncWeatherData: jest.fn().mockResolvedValue(undefined),
        };
        forecast = {
            getGeneralForecast: jest.fn().mockResolvedValue([{ day: '週一' }]),
            getWeeklyForecast: jest.fn().mockResolvedValue([]),
            getMarineForecast: jest.fn().mockResolvedValue([]),
            getTideForecast: jest.fn().mockResolvedValue([]),
            getMountainForecast: jest.fn().mockResolvedValue([]),
            getForecastSummary: jest.fn().mockResolvedValue({}),
        };
        alerts = {
            getActiveAlerts: jest.fn().mockReturnValue([{ id: 'a1', type: 'rain' }]),
            getAlertsByRegion: jest.fn().mockReturnValue([]),
            getAlert: jest.fn().mockReturnValue({ id: 'a1' }),
            createAlert: jest.fn().mockReturnValue({ id: 'a2' }),
            resolveAlert: jest.fn().mockReturnValue(true),
            syncFromCwa: jest.fn().mockResolvedValue(5),
            subscribe: jest.fn().mockReturnValue({ id: 'sub-1' }),
            getUserSubscriptions: jest.fn().mockReturnValue([]),
            unsubscribe: jest.fn().mockReturnValue(true),
            linkMission: jest.fn().mockReturnValue({ linked: true }),
            evaluateMissionImpact: jest.fn().mockReturnValue({ impact: 'low' }),
            unlinkMission: jest.fn().mockReturnValue(true),
        };
        risk = {
            assessRisk: jest.fn().mockResolvedValue({ level: 'medium' }),
            assessMissionFeasibility: jest.fn().mockResolvedValue({ feasible: true }),
            hasSevereWeather: jest.fn().mockReturnValue(false),
        };

        service = new WeatherService(currentWeather as any, forecast as any, alerts as any, risk as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getOverview', () => {
        it('should aggregate current, forecast, and alerts', async () => {
            const overview = await service.getOverview();
            expect(overview.current).toHaveLength(1);
            expect(overview.alerts).toHaveLength(1);
            expect(overview.lastUpdated).toBeInstanceOf(Date);
        });
    });

    describe('getCurrentWeather', () => {
        it('should get all without location', () => {
            service.getCurrentWeather();
            expect(currentWeather.getAll).toHaveBeenCalled();
        });

        it('should filter by location', () => {
            service.getCurrentWeather('台北');
            expect(currentWeather.getByLocation).toHaveBeenCalledWith('台北');
        });
    });

    describe('alerts delegation', () => {
        it('should delegate getActiveAlerts', () => {
            expect(service.getActiveAlerts()).toHaveLength(1);
        });

        it('should delegate createAlert', () => {
            service.createAlert({ type: 'rain' } as any);
            expect(alerts.createAlert).toHaveBeenCalled();
        });

        it('should delegate resolveAlert', () => {
            expect(service.resolveAlert('a1')).toBe(true);
        });

        it('should delegate syncAlertsFromCwa', async () => {
            const count = await service.syncAlertsFromCwa();
            expect(count).toBe(5);
        });
    });

    describe('risk assessment', () => {
        it('should delegate assessWeatherRisk', async () => {
            const result = await service.assessWeatherRisk(25, 121);
            expect(result).toBeDefined();
            expect(risk.assessRisk).toHaveBeenCalledWith(25, 121);
        });

        it('should delegate hasSevereWeather', () => {
            expect(service.hasSevereWeather()).toBe(false);
        });
    });

    describe('mission links', () => {
        it('should link mission to weather', () => {
            service.linkMissionToWeather('m1', 'a1', ['notify_team']);
            expect(alerts.linkMission).toHaveBeenCalled();
        });

        it('should unlink mission', () => {
            expect(service.unlinkMission('m1')).toBe(true);
        });
    });
});
