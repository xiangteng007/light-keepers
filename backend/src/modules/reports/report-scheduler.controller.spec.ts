import { Test, TestingModule } from '@nestjs/testing';
import { ReportSchedulerController } from './report-scheduler.controller';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('ReportSchedulerController', () => {
    let controller: ReportSchedulerController;

    beforeEach(async () => {
        const service = {
            getScheduledReports: jest.fn().mockReturnValue([]),
            getScheduledReport: jest.fn().mockReturnValue({ id: 'r1' }),
            addScheduledReport: jest.fn(),
            updateScheduledReport: jest.fn().mockReturnValue({ id: 'r1' }),
            deleteScheduledReport: jest.fn().mockReturnValue(true),
            setReportEnabled: jest.fn().mockReturnValue(true),
            generateReport: jest.fn().mockResolvedValue({ status: 'success' }),
            getReportHistory: jest.fn().mockReturnValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReportSchedulerController],
            providers: [{ provide: ReportSchedulerService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ReportSchedulerController>(ReportSchedulerController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getScheduledReports returns list', () => {
        const result = controller.getScheduledReports();
        expect(result.success).toBe(true);
    });
    it('getScheduledReport returns report', () => {
        const result = controller.getScheduledReport('r1');
        expect(result.success).toBe(true);
    });
    it('createScheduledReport creates', () => {
        const result = controller.createScheduledReport({ name: 'Daily', schedule: '0 9 * * *', recipients: ['a@b.c'] });
        expect(result.success).toBe(true);
    });
    it('deleteScheduledReport deletes', () => {
        const result = controller.deleteScheduledReport('r1');
        expect(result.success).toBe(true);
    });
    it('enableReport enables', () => {
        const result = controller.enableReport('r1');
        expect(result.success).toBe(true);
    });
    it('runReport runs', async () => {
        const result = await controller.runReport('r1');
        expect(result.success).toBe(true);
    });
    it('getHistory returns history', () => {
        const result = controller.getHistory();
        expect(result.success).toBe(true);
    });
});
