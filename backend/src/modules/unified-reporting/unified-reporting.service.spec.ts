import { UnifiedReportingService } from './unified-reporting.service';

describe('UnifiedReportingService', () => {
    let service: UnifiedReportingService;
    let engineService: Record<string, jest.Mock>;
    let reportsService: Record<string, jest.Mock>;

    beforeEach(() => {
        engineService = {
            createReportDefinition: jest.fn().mockReturnValue({ id: 'def-1' }),
            getReportDefinition: jest.fn().mockReturnValue({ id: 'def-1' }),
            listReportDefinitions: jest.fn().mockReturnValue([{ id: 'def-1' }]),
            generateReport: jest.fn().mockResolvedValue({ id: 'report-1' }),
            exportReport: jest.fn().mockResolvedValue({ url: '/download' }),
            generateAndExport: jest.fn().mockResolvedValue({ url: '/download' }),
            createSchedule: jest.fn().mockReturnValue({ id: 'sched-1' }),
            listSchedules: jest.fn().mockReturnValue([]),
        };

        reportsService = {
            create: jest.fn().mockResolvedValue({ id: 'rpt-1' }),
            findAll: jest.fn().mockResolvedValue([{ id: 'rpt-1' }]),
            findOne: jest.fn().mockResolvedValue({ id: 'rpt-1' }),
            findForMap: jest.fn().mockResolvedValue([]),
            review: jest.fn().mockResolvedValue({ id: 'rpt-1', status: 'confirmed' }),
            getStats: jest.fn().mockResolvedValue({ total: 10, pending: 3, confirmed: 5, rejected: 2, byType: {} }),
            getHotspots: jest.fn().mockResolvedValue([]),
            getTrendData: jest.fn().mockResolvedValue({ labels: [], datasets: [] }),
            getRegionStats: jest.fn().mockResolvedValue({ regions: [], values: [] }),
        };

        // Bypass NestJS DI — construct directly with mocks
        service = new UnifiedReportingService(engineService as any, reportsService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getStatus', () => {
        it('should return ready status', () => {
            const status = service.getStatus();
            expect(status.engineReady).toBe(true);
            expect(status.reportsReady).toBe(true);
        });
    });

    describe('engine delegation', () => {
        it('should delegate createReportDefinition', () => {
            service.createReportDefinition({ name: 'test' });
            expect(engineService.createReportDefinition).toHaveBeenCalledWith({ name: 'test' });
        });

        it('should delegate generateReport', async () => {
            await service.generateReport('def-1');
            expect(engineService.generateReport).toHaveBeenCalledWith('def-1', undefined);
        });

        it('should delegate exportReport', async () => {
            await service.exportReport('report-1', { format: 'pdf' });
            expect(engineService.exportReport).toHaveBeenCalledWith('report-1', { format: 'pdf' });
        });
    });

    describe('reports delegation', () => {
        it('should delegate createIncidentReport', async () => {
            await service.createIncidentReport({ type: 'flood', title: '淹水', description: '低窪', latitude: 25, longitude: 121 });
            expect(reportsService.create).toHaveBeenCalled();
        });

        it('should delegate getReportStats', async () => {
            const stats = await service.getReportStats();
            expect(stats.total).toBe(10);
        });

        it('should delegate reviewReport', async () => {
            await service.reviewReport('rpt-1', { status: 'confirmed', reviewedBy: 'admin' });
            expect(reportsService.review).toHaveBeenCalled();
        });
    });

    describe('generateDisasterSummary', () => {
        it('should aggregate stats, hotspots, and trends', async () => {
            const summary = await service.generateDisasterSummary({ includeHotspots: true, includeTrends: true });
            expect(summary.stats).toBeDefined();
            expect(summary.generatedAt).toBeInstanceOf(Date);
            expect(reportsService.getStats).toHaveBeenCalled();
            expect(reportsService.getHotspots).toHaveBeenCalled();
            expect(reportsService.getTrendData).toHaveBeenCalled();
        });
    });
});
