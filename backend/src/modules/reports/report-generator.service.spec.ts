import { ReportGeneratorService } from './report-generator.service';

describe('ReportGeneratorService', () => {
    let service: ReportGeneratorService;
    let dataSource: { query: jest.Mock };

    beforeEach(() => {
        dataSource = {
            query: jest.fn().mockResolvedValue([]),
        };
        service = new ReportGeneratorService(dataSource as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('generateReport', () => {
        it('should generate daily report', async () => {
            const report = await service.generateReport({ type: 'daily' });
            expect(report.type).toBe('daily');
            expect(report.generatedAt).toBeDefined();
            expect(report.summary).toBeDefined();
        });

        it('should generate weekly report', async () => {
            const report = await service.generateReport({ type: 'weekly' });
            expect(report.type).toBe('weekly');
        });

        it('should generate custom report with date range', async () => {
            const report = await service.generateReport({
                type: 'custom',
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
            });
            expect(report.type).toBe('custom');
        });
    });

    describe('generateDailySummary', () => {
        it('should return daily summary', async () => {
            const report = await service.generateDailySummary();
            expect(report.type).toBe('daily');
        });
    });

    describe('generateWeeklySummary', () => {
        it('should return weekly summary', async () => {
            const report = await service.generateWeeklySummary();
            expect(report.type).toBe('weekly');
        });
    });

    describe('getDateRange', () => {
        it('should calculate daily range', () => {
            const { startDate, endDate } = (service as any).getDateRange({ type: 'daily' });
            expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
        });

        it('should calculate weekly range', () => {
            const { startDate, endDate } = (service as any).getDateRange({ type: 'weekly' });
            const diff = endDate.getTime() - startDate.getTime();
            expect(diff).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
        });

        it('should use custom range', () => {
            const start = new Date('2026-01-01');
            const end = new Date('2026-01-31');
            const { startDate, endDate } = (service as any).getDateRange({
                type: 'custom', startDate: start, endDate: end,
            });
            expect(startDate).toEqual(start);
            expect(endDate).toEqual(end);
        });
    });

    describe('safeQuery', () => {
        it('should return query results', async () => {
            dataSource.query.mockResolvedValueOnce([{ count: 5 }]);
            const result = await (service as any).safeQuery('SELECT 1', []);
            expect(result).toEqual([{ count: 5 }]);
        });

        it('should return null on error', async () => {
            dataSource.query.mockRejectedValueOnce(new Error('DB error'));
            const result = await (service as any).safeQuery('BAD SQL', []);
            expect(result).toBeNull();
        });
    });
});
