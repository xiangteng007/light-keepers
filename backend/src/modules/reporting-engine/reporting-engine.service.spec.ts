import { Test, TestingModule } from '@nestjs/testing';
import { ReportingEngineService } from './reporting-engine.service';
import { ReportBuilderService } from './services/report-builder.service';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { ExportService } from './services/export.service';
import { TemplateService } from './services/template.service';

describe('ReportingEngineService', () => {
    let service: ReportingEngineService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportingEngineService,
                ReportBuilderService,
                ReportSchedulerService,
                ExportService,
                TemplateService,
            ],
        }).compile();
        service = module.get(ReportingEngineService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('listReportDefinitions returns defaults', () => {
        expect(service.listReportDefinitions().length).toBeGreaterThanOrEqual(1);
    });

    it('generateReport delegates to builder', async () => {
        const defs = service.listReportDefinitions();
        const report = await service.generateReport(defs[0].id);
        expect(report.id).toBeDefined();
    });

    it('createSchedule delegates to scheduler', () => {
        const s = service.createSchedule({
            name: 'S', definitionId: 'd', frequency: 'daily',
            recipients: [], format: 'pdf', enabled: true, createdBy: 'a',
        });
        expect(s.id).toBeDefined();
    });

    it('createTemplate delegates to templates', () => {
        const t = service.createTemplate({
            name: 'T', category: 'custom', content: 'X', variables: [], createdBy: 'me',
        });
        expect(t.id).toBeDefined();
    });

    it('renderTemplate renders', () => {
        const t = service.createTemplate({
            name: 'R', category: 'custom', content: '{{x}}', variables: ['x'], createdBy: 'me',
        });
        expect(service.renderTemplate(t.id, { x: 'Hello' })).toBe('Hello');
    });
});
