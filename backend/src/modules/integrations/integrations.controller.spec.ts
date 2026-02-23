import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from './integrations.controller';
import { ExternalApiService } from './external-api.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('IntegrationsController', () => {
    let controller: IntegrationsController;

    beforeEach(async () => {
        const service = {
            getWeather: jest.fn().mockResolvedValue({ temp: 25, condition: 'sunny' }),
            geocode: jest.fn().mockResolvedValue({ lat: 25.033, lng: 121.565 }),
            reverseGeocode: jest.fn().mockResolvedValue('台北市信義區'),
            sendNotification: jest.fn().mockResolvedValue({ success: true, channels: ['line'] }),
            sendLineNotification: jest.fn().mockResolvedValue(true),
            sendWebhook: jest.fn().mockResolvedValue(true),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IntegrationsController],
            providers: [{ provide: ExternalApiService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<IntegrationsController>(IntegrationsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getWeather returns weather data', async () => {
        const result = await controller.getWeather('25.033', '121.565');
        expect(result.success).toBe(true);
    });

    it('geocode returns coordinates', async () => {
        const result = await controller.geocode('台北市');
        expect(result.success).toBe(true);
    });

    it('geocode returns error without address', async () => {
        const result = await controller.geocode('');
        expect(result.success).toBe(false);
    });

    it('reverseGeocode returns address', async () => {
        const result = await controller.reverseGeocode('25.033', '121.565');
        expect(result.success).toBe(true);
    });

    it('sendNotification sends notification', async () => {
        const result = await controller.sendNotification({ title: 'Test' } as any);
        expect(result.success).toBe(true);
    });

    it('pushLineMessage sends LINE message', async () => {
        const result = await controller.pushLineMessage({ userId: 'u1', message: 'hi' });
        expect(result.success).toBe(true);
    });

    it('testWebhook tests webhook', async () => {
        const result = await controller.testWebhook({ url: 'http://test', payload: {} });
        expect(result.success).toBe(true);
    });
});
