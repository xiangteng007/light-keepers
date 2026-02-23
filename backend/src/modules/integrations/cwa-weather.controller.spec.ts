import { Test, TestingModule } from '@nestjs/testing';
import { CwaWeatherController } from './cwa-weather.controller';
import { CwaWeatherService } from './cwa-weather.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('CwaWeatherController', () => {
    let controller: CwaWeatherController;

    beforeEach(async () => {
        const service = {
            getCurrentWeather: jest.fn().mockResolvedValue({ temp: 25, humidity: 70 }),
            getForecast: jest.fn().mockResolvedValue([]),
            getActiveAlerts: jest.fn().mockResolvedValue([]),
            isConfigured: jest.fn().mockReturnValue(true),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CwaWeatherController],
            providers: [{ provide: CwaWeatherService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CwaWeatherController>(CwaWeatherController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getCurrentWeather returns weather data', async () => {
        const result = await controller.getCurrentWeather('臺北');
        expect(result.success).toBe(true);
    });

    it('getForecast returns forecast', async () => {
        const result = await controller.getForecast('臺北市', '7');
        expect(result.success).toBe(true);
    });

    it('getAlerts returns active alerts', async () => {
        const result = await controller.getAlerts();
        expect(result.success).toBe(true);
    });

    it('getStatus returns configuration status', async () => {
        const result = await controller.getStatus();
        expect(result.success).toBe(true);
        expect(result.data.configured).toBe(true);
    });
});
