import { Test, TestingModule } from '@nestjs/testing';
import { InternationalStandardsController } from './international-standards.controller';
import { InternationalStandardsService } from './international-standards.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('InternationalStandardsController', () => {
    let controller: InternationalStandardsController;

    beforeEach(async () => {
        const service = {
            getIcsFormTemplate: jest.fn().mockReturnValue({}),
            generateIcs201: jest.fn().mockReturnValue({}),
            generateIcs214: jest.fn().mockReturnValue({}),
            validateIcsForm: jest.fn().mockReturnValue({ valid: true }),
            listIcsForms: jest.fn().mockReturnValue([]),
            exportMissionsToHxl: jest.fn().mockReturnValue({}),
            exportResourcesToHxl: jest.fn().mockReturnValue({}),
            export3WToHxl: jest.fn().mockReturnValue({}),
            hxlToJson: jest.fn().mockReturnValue({}),
            getAll3WRecords: jest.fn().mockReturnValue([]),
            get3WByCluster: jest.fn().mockReturnValue([]),
            get3WByLocation: jest.fn().mockReturnValue([]),
            add3WRecord: jest.fn().mockReturnValue({}),
            generate3WMatrix: jest.fn().mockReturnValue({}),
            generateClusterReport: jest.fn().mockReturnValue({}),
            import3WData: jest.fn().mockReturnValue(5),
            getSphereIndicators: jest.fn().mockReturnValue([]),
            getSphereIndicatorsByStandard: jest.fn().mockReturnValue([]),
            checkSphereCompliance: jest.fn().mockReturnValue({}),
            quickSphereCheck: jest.fn().mockReturnValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [InternationalStandardsController],
            providers: [{ provide: InternationalStandardsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<InternationalStandardsController>(InternationalStandardsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getIcsTemplate returns template', () => expect(controller.getIcsTemplate('ICS-201' as any)).toBeDefined());
    it('generateIcs201 generates form', () => expect(controller.generateIcs201({})).toBeDefined());
    it('generateIcs214 generates form', () => expect(controller.generateIcs214({})).toBeDefined());
    it('validateIcsForm validates form', () => expect(controller.validateIcsForm('ICS-201' as any, {})).toBeDefined());
    it('listIcsForms lists forms', () => expect(controller.listIcsForms()).toBeDefined());
    it('exportMissionsHxl exports missions', () => expect(controller.exportMissionsHxl([])).toBeDefined());
    it('exportResourcesHxl exports resources', () => expect(controller.exportResourcesHxl([])).toBeDefined());
    it('export3WHxl exports 3W', () => expect(controller.export3WHxl([])).toBeDefined());
    it('getAll3WRecords returns records', () => expect(controller.getAll3WRecords()).toBeDefined());
    it('getSphereIndicators returns indicators', () => expect(controller.getSphereIndicators()).toBeDefined());
    it('import3WData imports data', () => {
        const result = controller.import3WData([]);
        expect(result).toHaveProperty('imported');
    });
});
