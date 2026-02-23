import { Test, TestingModule } from '@nestjs/testing';
import { InteroperabilityController } from './interoperability.controller';
import { CapAdapterService } from './cap-adapter.service';
import { EdxlDeAdapterService } from './edxl-de-adapter.service';
import { NiemMappingService } from './niem-mapping.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('InteroperabilityController', () => {
    let controller: InteroperabilityController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InteroperabilityController],
            providers: [
                { provide: CapAdapterService, useValue: { toCapAlert: jest.fn().mockReturnValue({ identifier: 'cap1' }), toCapXml: jest.fn().mockReturnValue('<cap/>'), fromCapXml: jest.fn().mockReturnValue({}) } },
                { provide: EdxlDeAdapterService, useValue: { createDistribution: jest.fn().mockReturnValue({}), toXml: jest.fn().mockReturnValue('<edxl/>'), extractPayload: jest.fn().mockReturnValue({}), wrapCapAlert: jest.fn().mockReturnValue({}) } },
                { provide: NiemMappingService, useValue: { toNiemIncident: jest.fn().mockReturnValue({}), toNiemPerson: jest.fn().mockReturnValue({}), createMessage: jest.fn().mockReturnValue({}), getSupportedDomains: jest.fn().mockReturnValue([]) } },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<InteroperabilityController>(InteroperabilityController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('convertToCapAlert converts alert to CAP', () => {
        const result = controller.convertToCapAlert({ id: '1', title: 'Test', description: 'D', severity: 'high', category: 'fire' });
        expect(result).toBeDefined();
    });

    it('convertCapToXml converts to XML', () => {
        const result = controller.convertCapToXml({} as any);
        expect(result).toContain('<cap');
    });

    it('parseCapXml parses XML', () => {
        expect(controller.parseCapXml({ xml: '<cap/>' })).toBeDefined();
    });

    it('createEdxlDistribution creates distribution', () => {
        expect(controller.createEdxlDistribution({ sender: 's', type: 'Report', payload: {} })).toBeDefined();
    });

    it('convertToNiemIncident converts incident', () => {
        expect(controller.convertToNiemIncident({ id: '1', name: 'Test' })).toBeDefined();
    });

    it('getNiemDomains returns domains', () => {
        const result = controller.getNiemDomains();
        expect(result.success).toBe(true);
    });

    it('getSupportedStandards returns standards list', () => {
        const result = controller.getSupportedStandards();
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(3);
    });
});
