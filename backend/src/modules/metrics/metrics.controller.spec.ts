import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { ApiMetricsService } from './api-metrics.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MetricsController', () => {
    let controller: MetricsController;

    beforeEach(async () => {
        const service = {
            getSystemMetrics: jest.fn().mockReturnValue({}),
            getEndpointMetrics: jest.fn().mockReturnValue([]),
            getSlowEndpoints: jest.fn().mockReturnValue([]),
            getErrorProneEndpoints: jest.fn().mockReturnValue([]),
            resetMetrics: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MetricsController],
            providers: [{ provide: ApiMetricsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MetricsController>(MetricsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getSystemMetrics returns metrics', async () => {
        const result = await controller.getSystemMetrics();
        expect(result.success).toBe(true);
    });
    it('getEndpointMetrics returns list', async () => {
        const result = await controller.getEndpointMetrics();
        expect(result.success).toBe(true);
    });
    it('getSlowEndpoints returns slow list', async () => {
        const result = await controller.getSlowEndpoints();
        expect(result.success).toBe(true);
    });
    it('getErrorProneEndpoints returns error list', async () => {
        const result = await controller.getErrorProneEndpoints();
        expect(result.success).toBe(true);
    });
    it('resetMetrics resets', async () => {
        const result = await controller.resetMetrics();
        expect(result.success).toBe(true);
    });
});
