import { Test, TestingModule } from '@nestjs/testing';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('WeatherController', () => {
    let controller: WeatherController;

    beforeEach(async () => {
        const service = {
            getOverview: jest.fn().mockResolvedValue({}),
            getWeatherByLocation: jest.fn().mockResolvedValue({}),
            getCurrentWeather: jest.fn().mockReturnValue({}),
            getWeatherByCode: jest.fn().mockReturnValue({}),
            getForecast: jest.fn().mockResolvedValue({}),
            getWeeklyForecast: jest.fn().mockResolvedValue({}),
            getMarineForecast: jest.fn().mockResolvedValue({}),
            getTideForecast: jest.fn().mockResolvedValue({}),
            getMountainForecast: jest.fn().mockResolvedValue({}),
            getActiveAlerts: jest.fn().mockReturnValue([]),
            getAlertsByRegion: jest.fn().mockReturnValue([]),
            getAlert: jest.fn().mockReturnValue({}),
            createAlert: jest.fn().mockReturnValue({ id: 'a1' }),
            resolveAlert: jest.fn().mockReturnValue(true),
            syncAlertsFromCwa: jest.fn().mockResolvedValue(3),
            assessWeatherRisk: jest.fn().mockResolvedValue({}),
            hasSevereWeather: jest.fn().mockReturnValue(false),
            assessMissionFeasibility: jest.fn().mockResolvedValue({}),
            syncWeatherData: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WeatherController],
            providers: [{ provide: WeatherService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<WeatherController>(WeatherController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getOverview', async () => expect(await controller.getOverview()).toBeDefined());
    it('getByLocation', async () => expect(await controller.getByLocation('25', '121')).toBeDefined());
    it('getCurrentWeather', () => expect(controller.getCurrentWeather()).toBeDefined());
    it('getWeatherByCode', () => expect(controller.getWeatherByCode('ABC')).toBeDefined());
    it('getForecast', async () => expect(await controller.getForecast()).toBeDefined());
    it('getWeeklyForecast', async () => expect(await controller.getWeeklyForecast()).toBeDefined());
    it('getMarineForecast', async () => expect(await controller.getMarineForecast()).toBeDefined());
    it('getTideForecast', async () => expect(await controller.getTideForecast()).toBeDefined());
    it('getMountainForecast', async () => expect(await controller.getMountainForecast()).toBeDefined());
    it('getActiveAlerts', () => expect(controller.getActiveAlerts()).toEqual([]));
    it('getAlertsByRegion', () => expect(controller.getAlertsByRegion('taipei')).toEqual([]));
    it('getAlert', () => expect(controller.getAlert('a1')).toBeDefined());
    it('createAlert', () => expect(controller.createAlert({} as any)).toBeDefined());
    it('resolveAlert', () => expect(controller.resolveAlert('a1')).toEqual({ resolved: true }));
    it('syncAlerts', async () => expect((await controller.syncAlerts()).synced).toBe(3));
    it('assessRisk', async () => expect(await controller.assessRisk('25', '121')).toBeDefined());
    it('hasSevereWeather', () => expect(controller.hasSevereWeather()).toEqual({ hasSevere: false }));
    it('assessMissionFeasibility', async () => expect(await controller.assessMissionFeasibility('m1', [])).toBeDefined());
    it('syncWeatherData', async () => expect((await controller.syncWeatherData()).success).toBe(true));
});
