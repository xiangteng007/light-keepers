import { Test, TestingModule } from '@nestjs/testing';
import { PrometheusController } from './prometheus.controller';
import { PrometheusService } from './prometheus.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('PrometheusController', () => {
    let controller: PrometheusController;

    beforeEach(async () => {
        const service = {
            getMetrics: jest.fn().mockResolvedValue('# HELP up\nup 1'),
            getMetricsJson: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PrometheusController],
            providers: [{ provide: PrometheusService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<PrometheusController>(PrometheusController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getMetrics returns text', async () => expect(await controller.getMetrics()).toContain('up'));
    it('getMetricsJson returns json', async () => expect(await controller.getMetricsJson()).toBeDefined());
});
