import { Test, TestingModule } from '@nestjs/testing';
import { ReportingController } from './reporting.controller';
import { ReportingEngineService } from './reporting-engine.service';

describe('ReportingController', () => {
    let controller: ReportingController;

    beforeEach(async () => {
        const service = {
            listReportDefinitions: jest.fn().mockReturnValue([]),
            getReportDefinition: jest.fn().mockReturnValue({}),
            createReportDefinition: jest.fn().mockReturnValue({ id: 'rd1' }),
            generateReport: jest.fn().mockResolvedValue({ id: 'r1' }),
            listGeneratedReports: jest.fn().mockReturnValue([]),
            getGeneratedReport: jest.fn().mockReturnValue({}),
            exportReport: jest.fn().mockResolvedValue({ mimeType: 'application/pdf', filename: 'r.pdf', size: 100, buffer: Buffer.from('test') }),
            generateAndExport: jest.fn().mockResolvedValue({ mimeType: 'application/pdf', filename: 'r.pdf', size: 100, buffer: Buffer.from('test') }),
            listSchedules: jest.fn().mockReturnValue([]),
            getSchedule: jest.fn().mockReturnValue({}),
            createSchedule: jest.fn().mockReturnValue({ id: 'sch1' }),
            updateSchedule: jest.fn().mockReturnValue({}),
            deleteSchedule: jest.fn().mockReturnValue(true),
            triggerSchedule: jest.fn().mockResolvedValue({}),
            listTemplates: jest.fn().mockReturnValue([]),
            getTemplate: jest.fn().mockReturnValue({}),
            createTemplate: jest.fn().mockReturnValue({ id: 'tpl1' }),
            renderTemplate: jest.fn().mockReturnValue('<h1>Report</h1>'),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReportingController],
            providers: [{ provide: ReportingEngineService, useValue: service }],
        }).compile();

        controller = module.get<ReportingController>(ReportingController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('listDefinitions returns list', () => expect(controller.listDefinitions()).toBeDefined());
    it('getDefinition returns def', () => expect(controller.getDefinition('rd1')).toBeDefined());
    it('createDefinition creates', () => expect(controller.createDefinition({})).toBeDefined());
    it('generateReport generates', async () => expect(await controller.generateReport('rd1')).toBeDefined());
    it('listGeneratedReports returns list', () => expect(controller.listGeneratedReports()).toBeDefined());
    it('listSchedules returns schedules', () => expect(controller.listSchedules()).toBeDefined());
    it('listTemplates returns templates', () => expect(controller.listTemplates()).toBeDefined());
    it('renderTemplate renders', () => {
        const result = controller.renderTemplate('tpl1', { title: 'Test' });
        expect(result).toHaveProperty('content');
    });
});
