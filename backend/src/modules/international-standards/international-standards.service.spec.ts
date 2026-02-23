import { Test, TestingModule } from '@nestjs/testing';
import { InternationalStandardsService } from './international-standards.service';
import { IcsFormsService } from './services/ics-forms.service';
import { HxlExportService } from './services/hxl-export.service';
import { OchaIntegrationService } from './services/ocha-integration.service';
import { SphereStandardsService } from './services/sphere-standards.service';

describe('InternationalStandardsService', () => {
    let service: InternationalStandardsService;

    beforeEach(async () => {
        const mockIcs = {
            generateIcs201: jest.fn().mockReturnValue({ formType: 'ICS-201' }),
            generateIcs202: jest.fn().mockReturnValue({ formType: 'ICS-202' }),
            generateIcs203: jest.fn().mockReturnValue({ formType: 'ICS-203' }),
            generateIcs205: jest.fn().mockReturnValue({ formType: 'ICS-205' }),
            generateIcs214: jest.fn().mockReturnValue({ formType: 'ICS-214' }),
            getFormTemplate: jest.fn().mockReturnValue({}),
            validateForm: jest.fn().mockReturnValue({ valid: true, errors: [] }),
            listForms: jest.fn().mockReturnValue([]),
        };
        const mockHxl = {
            exportMissions: jest.fn().mockReturnValue({ headers: [], hxlTags: [], data: [], metadata: {} }),
            exportResources: jest.fn().mockReturnValue({ headers: [], hxlTags: [], data: [], metadata: {} }),
            export3W: jest.fn().mockReturnValue({ headers: [], hxlTags: [], data: [], metadata: {} }),
            toCsv: jest.fn().mockReturnValue('csv'),
            toJson: jest.fn().mockReturnValue({}),
        };
        const mockOcha = {
            add3WRecord: jest.fn().mockReturnValue({ id: '3w-1' }),
            getAll3WRecords: jest.fn().mockReturnValue([]),
            getByCluster: jest.fn().mockReturnValue([]),
            getByLocation: jest.fn().mockReturnValue([]),
            generateClusterReport: jest.fn().mockReturnValue({}),
            generate3WMatrix: jest.fn().mockReturnValue({}),
            importFromOcha: jest.fn().mockReturnValue(0),
        };
        const mockSphere = {
            getIndicators: jest.fn().mockReturnValue([]),
            getIndicatorsByStandard: jest.fn().mockReturnValue([]),
            checkCompliance: jest.fn().mockReturnValue({ overallCompliance: 100 }),
            quickCheck: jest.fn().mockReturnValue({ passed: true, issues: [] }),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InternationalStandardsService,
                { provide: IcsFormsService, useValue: mockIcs },
                { provide: HxlExportService, useValue: mockHxl },
                { provide: OchaIntegrationService, useValue: mockOcha },
                { provide: SphereStandardsService, useValue: mockSphere },
            ],
        }).compile();
        service = module.get(InternationalStandardsService);
    });

    it('should be defined', () => expect(service).toBeDefined());
    it('generateIcs201 delegates', () => expect(service.generateIcs201({} as any).formType).toBe('ICS-201'));
    it('generateIcs202 delegates', () => expect(service.generateIcs202({} as any).formType).toBe('ICS-202'));
    it('exportMissionsToHxl delegates', () => expect(service.exportMissionsToHxl([])).toBeDefined());
    it('add3WRecord delegates', () => expect(service.add3WRecord({} as any).id).toBe('3w-1'));
    it('getSphereIndicators delegates', () => expect(service.getSphereIndicators()).toEqual([]));
    it('quickSphereCheck delegates', () => expect(service.quickSphereCheck({}).passed).toBe(true));
});
