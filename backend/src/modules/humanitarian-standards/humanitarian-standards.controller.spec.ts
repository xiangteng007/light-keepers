import { Test, TestingModule } from '@nestjs/testing';
import { HumanitarianStandardsController } from './humanitarian-standards.controller';
import { HxlExportService } from './services/hxl-export.service';
import { IatiReportingService } from './services/iati-reporting.service';
import { ThreeWMatrixService } from './services/three-w-matrix.service';
import { SphereStandardsService } from './services/sphere-standards.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('HumanitarianStandardsController', () => {
    let controller: HumanitarianStandardsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HumanitarianStandardsController],
            providers: [
                { provide: HxlExportService, useValue: { getHxlTags: jest.fn().mockReturnValue([]), exportDisasterReports: jest.fn().mockResolvedValue('csv_data'), exportResourceDistribution: jest.fn().mockResolvedValue('csv_data') } },
                { provide: IatiReportingService, useValue: { generateIatiXml: jest.fn().mockResolvedValue('<xml/>') } },
                { provide: ThreeWMatrixService, useValue: { generateMatrix: jest.fn().mockResolvedValue({ entries: [] }), exportToCsv: jest.fn().mockReturnValue('csv') } },
                { provide: SphereStandardsService, useValue: { getStandardsReference: jest.fn().mockReturnValue({}), assessCompliance: jest.fn().mockResolvedValue([]), generateReport: jest.fn().mockResolvedValue({}) } },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<HumanitarianStandardsController>(HumanitarianStandardsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getHxlTags returns tags', () => {
        expect(controller.getHxlTags()).toBeDefined();
    });

    it('exportReportsHxl exports reports', async () => {
        const result = await controller.exportReportsHxl({ reports: [] });
        expect(result).toHaveProperty('data');
    });

    it('exportResourcesHxl exports resources', async () => {
        const result = await controller.exportResourcesHxl({ distributions: [] });
        expect(result).toHaveProperty('data');
    });

    it('generateIatiXml generates XML', async () => {
        const result = await controller.generateIatiXml({ id: 'm1' });
        expect(result.xml).toBeDefined();
    });

    it('generateThreeWMatrix generates matrix', async () => {
        const result = await controller.generateThreeWMatrix({ missions: [], period: { start: '2026-01-01', end: '2026-01-31' } });
        expect(result).toBeDefined();
    });

    it('exportThreeWCsv exports CSV', async () => {
        const result = await controller.exportThreeWCsv({ missions: [], period: { start: '2026-01-01', end: '2026-01-31' } });
        expect(result.format).toBe('csv');
    });

    it('getSphereStandards returns standards', () => {
        expect(controller.getSphereStandards()).toBeDefined();
    });

    it('assessSphereCompliance assesses compliance', async () => {
        const result = await controller.assessSphereCompliance({ facilityData: {}, category: 'WASH' as any });
        expect(result).toHaveProperty('category');
    });

    it('generateSphereReport generates report', async () => {
        const result = await controller.generateSphereReport({ facilityData: {}, assessor: 'Test' });
        expect(result).toBeDefined();
    });
});
