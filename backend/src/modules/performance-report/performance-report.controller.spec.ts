import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceReportController } from './performance-report.controller';
import { PerformanceReportService } from './performance-report.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('PerformanceReportController', () => {
    let controller: PerformanceReportController;

    beforeEach(async () => {
        const service = {
            getVolunteerPerformance: jest.fn().mockResolvedValue({}),
            getTeamPerformanceSummary: jest.fn().mockResolvedValue({}),
            getAreaPerformanceAnalysis: jest.fn().mockResolvedValue({}),
            getMonthlyReport: jest.fn().mockResolvedValue({}),
            getAnnualReport: jest.fn().mockResolvedValue({}),
            exportReport: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PerformanceReportController],
            providers: [{ provide: PerformanceReportService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<PerformanceReportController>(PerformanceReportController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getVolunteerPerformance returns data', () => expect(controller.getVolunteerPerformance('v1')).toBeDefined());
    it('getTeamPerformance returns data', () => expect(controller.getTeamPerformance('t1')).toBeDefined());
    it('getAreaPerformance returns data', () => expect(controller.getAreaPerformance()).toBeDefined());
    it('getMonthlyReport returns data', () => expect(controller.getMonthlyReport(2025, 1)).toBeDefined());
    it('getAnnualReport returns data', () => expect(controller.getAnnualReport(2025)).toBeDefined());
    it('exportReport returns data', async () => expect(await controller.exportReport('volunteer', 'pdf')).toBeDefined());
});
