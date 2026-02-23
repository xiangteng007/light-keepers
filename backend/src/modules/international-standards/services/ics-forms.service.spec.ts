import { Test, TestingModule } from '@nestjs/testing';
import { IcsFormsService, IcsFormType } from './ics-forms.service';

describe('IcsFormsService (international-standards)', () => {
    let service: IcsFormsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [IcsFormsService],
        }).compile();
        service = module.get(IcsFormsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('generateIcs201 returns form data', () => {
        const form = service.generateIcs201({
            incidentName: 'Test', incidentNumber: '001',
            dateTimePrepared: new Date(), situation: 'Active',
            objectives: ['Rescue'], currentOrganization: { incidentCommander: 'IC' },
            resourcesSummary: [],
        });
        expect(form.formType).toBe(IcsFormType.ICS_201);
    });

    it('getFormTemplate returns template', () => {
        const template = service.getFormTemplate(IcsFormType.ICS_201);
        expect(template).toBeDefined();
    });

    it('validateForm validates', () => {
        const result = service.validateForm(IcsFormType.ICS_201, {});
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
    });

    it('listForms returns array', () => {
        expect(Array.isArray(service.listForms())).toBe(true);
    });
});
