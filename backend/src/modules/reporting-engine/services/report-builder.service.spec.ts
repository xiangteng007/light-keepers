import { Test, TestingModule } from '@nestjs/testing';
import { ReportBuilderService } from './report-builder.service';

describe('ReportBuilderService', () => {
    let service: ReportBuilderService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ReportBuilderService],
        }).compile();
        service = module.get(ReportBuilderService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('constructor inits default definitions', () => {
        expect(service.listDefinitions().length).toBeGreaterThanOrEqual(1);
    });

    it('createDefinition creates and stores', () => {
        const def = service.createDefinition({
            name: 'Custom', type: 'custom', sections: [], filters: [], createdBy: 'me',
        });
        expect(def.id).toBeDefined();
        expect(service.getDefinition(def.id)).toBeDefined();
    });

    it('generateReport generates from definition', async () => {
        const defs = service.listDefinitions();
        const report = await service.generateReport(defs[0].id);
        expect(report.id).toBeDefined();
        expect(report.data).toBeDefined();
        expect(report.metadata.rowCount).toBeGreaterThan(0);
    });

    it('generateReport throws for missing definition', async () => {
        await expect(service.generateReport('nonexistent')).rejects.toThrow();
    });

    it('listGeneratedReports returns list', async () => {
        const defs = service.listDefinitions();
        await service.generateReport(defs[0].id);
        expect(service.listGeneratedReports().length).toBe(1);
    });
});
