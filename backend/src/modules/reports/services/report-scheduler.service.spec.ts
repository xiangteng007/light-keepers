import { ReportSchedulerService } from './report-scheduler.service';

jest.mock('../../../common/utils/error-utils', () => ({
    getErrorMessage: (e: any) => e?.message || String(e),
}));

describe('ReportSchedulerService', () => {
    let service: ReportSchedulerService;
    let schedulerRegistry: Record<string, jest.Mock>;
    let configService: { get: jest.Mock };
    let eventEmitter: { emit: jest.Mock };

    beforeEach(() => {
        schedulerRegistry = {
            addCronJob: jest.fn(),
            deleteCronJob: jest.fn(),
            getCronJob: jest.fn(),
        };
        configService = { get: jest.fn().mockReturnValue('') };
        eventEmitter = { emit: jest.fn() };
        service = new ReportSchedulerService(
            schedulerRegistry as any,
            configService as any,
            eventEmitter as any,
        );
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('addScheduledReport', () => {
        it('should add a scheduled report', () => {
            service.addScheduledReport({
                id: 'r1', name: 'Daily', type: 'daily_summary',
                schedule: '0 8 * * *', recipients: ['admin@test.com'],
                format: 'pdf', enabled: true, createdBy: 'admin', createdAt: new Date(),
            });
            expect(service.getScheduledReport('r1')).toBeDefined();
        });
    });

    describe('getScheduledReports', () => {
        it('should return all reports', () => {
            service.addScheduledReport({
                id: 'r1', name: 'A', type: 'daily_summary',
                schedule: '0 8 * * *', recipients: [], format: 'csv',
                enabled: true, createdBy: 'admin', createdAt: new Date(),
            });
            const list = service.getScheduledReports();
            expect(list.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('updateScheduledReport', () => {
        it('should update report fields', () => {
            service.addScheduledReport({
                id: 'r1', name: 'Old', type: 'daily_summary',
                schedule: '0 8 * * *', recipients: [], format: 'pdf',
                enabled: true, createdBy: 'admin', createdAt: new Date(),
            });
            const updated = service.updateScheduledReport('r1', { name: 'New' });
            expect(updated?.name).toBe('New');
        });

        it('should return null for unknown id', () => {
            expect(service.updateScheduledReport('bad', { name: 'X' })).toBeNull();
        });
    });

    describe('deleteScheduledReport', () => {
        it('should delete report', () => {
            service.addScheduledReport({
                id: 'r1', name: 'Del', type: 'custom',
                schedule: '0 0 * * *', recipients: [], format: 'json',
                enabled: true, createdBy: 'admin', createdAt: new Date(),
            });
            expect(service.deleteScheduledReport('r1')).toBe(true);
            expect(service.getScheduledReport('r1')).toBeUndefined();
        });

        it('should return false for unknown id', () => {
            expect(service.deleteScheduledReport('bad')).toBe(false);
        });
    });

    describe('setReportEnabled', () => {
        it('should enable/disable report', () => {
            service.addScheduledReport({
                id: 'r1', name: 'Toggle', type: 'weekly_digest',
                schedule: '0 0 * * 1', recipients: [], format: 'pdf',
                enabled: true, createdBy: 'admin', createdAt: new Date(),
            });
            expect(service.setReportEnabled('r1', false)).toBe(true);
        });
    });

    describe('generateReport', () => {
        it('should generate report for valid id', async () => {
            service.addScheduledReport({
                id: 'r1', name: 'Gen', type: 'daily_summary',
                schedule: '0 8 * * *', recipients: ['a@b.com'],
                format: 'json', enabled: true, createdBy: 'admin', createdAt: new Date(),
            });
            const result = await service.generateReport('r1');
            expect(result.reportId).toBe('r1');
            expect(result.status).toBeDefined();
        });
    });

    describe('getReportHistory', () => {
        it('should return history', () => {
            const history = service.getReportHistory(10);
            expect(Array.isArray(history)).toBe(true);
        });
    });
});
