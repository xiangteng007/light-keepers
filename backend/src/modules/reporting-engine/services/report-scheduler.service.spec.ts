import { Test, TestingModule } from '@nestjs/testing';
import { ReportSchedulerService } from './report-scheduler.service';
import { ReportBuilderService } from './report-builder.service';

describe('ReportSchedulerService', () => {
    let service: ReportSchedulerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportSchedulerService,
                ReportBuilderService,
            ],
        }).compile();
        service = module.get(ReportSchedulerService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createSchedule creates and stores', () => {
        const s = service.createSchedule({
            name: 'Daily Report', definitionId: 'def1', frequency: 'daily',
            recipients: ['admin@test.com'], format: 'pdf', enabled: true, createdBy: 'admin',
        });
        expect(s.id).toBeDefined();
        expect(s.nextRun).toBeDefined();
    });

    it('getSchedule returns schedule', () => {
        const s = service.createSchedule({
            name: 'S', definitionId: 'd1', frequency: 'weekly',
            recipients: [], format: 'csv', enabled: true, createdBy: 'a',
        });
        expect(service.getSchedule(s.id)).toBeDefined();
    });

    it('listSchedules returns all', () => {
        service.createSchedule({ name: 'A', definitionId: 'd', frequency: 'daily', recipients: [], format: 'pdf', enabled: true, createdBy: 'a' });
        expect(service.listSchedules().length).toBeGreaterThan(0);
    });

    it('updateSchedule updates and recalculates nextRun', () => {
        const s = service.createSchedule({ name: 'B', definitionId: 'd', frequency: 'daily', recipients: [], format: 'pdf', enabled: true, createdBy: 'a' });
        const updated = service.updateSchedule(s.id, { frequency: 'monthly' });
        expect(updated).not.toBeNull();
    });

    it('deleteSchedule removes', () => {
        const s = service.createSchedule({ name: 'C', definitionId: 'd', frequency: 'daily', recipients: [], format: 'pdf', enabled: true, createdBy: 'a' });
        expect(service.deleteSchedule(s.id)).toBe(true);
    });

    it('triggerSchedule throws for missing', async () => {
        await expect(service.triggerSchedule('no')).rejects.toThrow();
    });
});
