import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesAnalyticsController } from './resources-analytics.controller';
import { ResourcesAnalyticsService } from './resources-analytics.service';
import { CoreJwtGuard } from '../shared/guards';

describe('ResourcesAnalyticsController', () => {
    let controller: ResourcesAnalyticsController;

    beforeEach(async () => {
        const service = {
            getAnalyticsSummary: jest.fn().mockResolvedValue({}),
            getInventoryTrend: jest.fn().mockResolvedValue([]),
            getCategoryDistribution: jest.fn().mockResolvedValue([]),
            getLowStockAlerts: jest.fn().mockResolvedValue([]),
            getExpiringItems: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ResourcesAnalyticsController],
            providers: [{ provide: ResourcesAnalyticsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ResourcesAnalyticsController>(ResourcesAnalyticsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getSummary returns summary', async () => {
        const result = await controller.getSummary();
        expect(result.success).toBe(true);
    });
    it('getTrend returns trend', async () => {
        const result = await controller.getTrend();
        expect(result.success).toBe(true);
    });
    it('getCategories returns categories', async () => {
        const result = await controller.getCategories();
        expect(result.success).toBe(true);
    });
    it('getLowStock returns alerts', async () => {
        const result = await controller.getLowStock();
        expect(result.success).toBe(true);
    });
    it('getExpiring returns expiring', async () => {
        const result = await controller.getExpiring();
        expect(result.success).toBe(true);
    });
});
