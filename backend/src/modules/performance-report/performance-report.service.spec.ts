import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceReportService } from './performance-report.service';

describe('PerformanceReportService', () => {
    let service: PerformanceReportService;
    const period = { startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31') };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PerformanceReportService],
        }).compile();

        service = module.get<PerformanceReportService>(PerformanceReportService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getVolunteerPerformance', () => {
        it('should return volunteer performance data', () => {
            const perf = service.getVolunteerPerformance('v1', period);
            expect(perf.volunteerId).toBe('v1');
            expect(perf.taskCompletionRate).toBe(93.3);
            expect(perf.attendanceRate).toBe(95);
            expect(perf.certifications).toContain('基礎急救');
            expect(perf.ratings.teamwork).toBe(4.8);
        });
    });

    describe('getTeamPerformanceSummary', () => {
        it('should return team summary with top performers', () => {
            const team = service.getTeamPerformanceSummary('team-1', period);
            expect(team.teamName).toBe('北區搜救隊');
            expect(team.memberCount).toBe(25);
            expect(team.topPerformers).toHaveLength(2);
            expect(team.improvementAreas.length).toBeGreaterThan(0);
        });
    });

    describe('getAreaPerformanceAnalysis', () => {
        it('should return 4 area analyses', () => {
            const areas = service.getAreaPerformanceAnalysis(period);
            expect(areas).toHaveLength(4);
            const areaNames = areas.map(a => a.area);
            expect(areaNames).toContain('北區');
            expect(areaNames).toContain('東區');
        });

        it('should show lowest coverage in 東區', () => {
            const areas = service.getAreaPerformanceAnalysis(period);
            const east = areas.find(a => a.area === '東區');
            expect(east!.coverage).toBe(75);
        });
    });

    describe('getMonthlyReport', () => {
        it('should return monthly report with comparison', () => {
            const report = service.getMonthlyReport(2025, 6);
            expect(report.year).toBe(2025);
            expect(report.month).toBe(6);
            expect(report.summary.totalIncidents).toBe(85);
            expect(report.comparison.responseTimeChange).toBe(-5);
            expect(report.highlights.length).toBeGreaterThan(0);
        });
    });

    describe('getAnnualReport', () => {
        it('should return annual report with 12-month breakdown', () => {
            const report = service.getAnnualReport(2025);
            expect(report.year).toBe(2025);
            expect(report.monthlyBreakdown).toHaveLength(12);
            expect(report.volunteersActive).toBe(350);
            expect(report.topAchievements.length).toBe(3);
        });
    });

    describe('exportReport', () => {
        it('should return export result with download URL', async () => {
            const result = await service.exportReport('monthly', 'pdf');
            expect(result.success).toBe(true);
            expect(result.filename).toContain('.pdf');
            expect(result.downloadUrl).toContain('/api/reports/download/');
            expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });

        it('should support excel format', async () => {
            const result = await service.exportReport('annual', 'excel');
            expect(result.filename).toContain('.excel');
        });
    });
});
