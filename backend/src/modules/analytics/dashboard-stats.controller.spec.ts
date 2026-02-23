import { Test, TestingModule } from '@nestjs/testing';
import { DashboardStatsController } from './dashboard-stats.controller';
import { DashboardStatsService } from './dashboard-stats.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('DashboardStatsController', () => {
    let controller: DashboardStatsController;
    const mockStats = { totalReports: 100, activeAlerts: 5 };

    beforeEach(async () => {
        const service = {
            getDashboardStats: jest.fn().mockResolvedValue(mockStats),
            getTimeSeries: jest.fn().mockResolvedValue([{ time: '2026-01-01', count: 10 }]),
            getSeverityTrend: jest.fn().mockResolvedValue([{ date: '2026-01-01', critical: 2 }]),
            getTopReporters: jest.fn().mockResolvedValue([{ userId: 'u1', count: 15 }]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DashboardStatsController],
            providers: [{ provide: DashboardStatsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DashboardStatsController>(DashboardStatsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getStats returns dashboard statistics', async () => {
        const result = await controller.getStats('m1');
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
    });

    it('getTimeSeries returns time series data', async () => {
        const result = await controller.getTimeSeries('m1', 'reports', '2026-01-01', '2026-01-07', 'hour');
        expect(result.success).toBe(true);
    });

    it('getSeverityTrend returns severity data', async () => {
        const result = await controller.getSeverityTrend('m1', '7');
        expect(result.success).toBe(true);
    });

    it('getTopReporters returns leaderboard', async () => {
        const result = await controller.getTopReporters('m1', '10');
        expect(result.success).toBe(true);
    });
});
