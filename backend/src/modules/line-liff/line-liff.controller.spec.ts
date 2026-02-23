import { Test, TestingModule } from '@nestjs/testing';
import { LineLiffController } from './line-liff.controller';
import { LineLiffService } from './line-liff.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('LineLiffController', () => {
    let controller: LineLiffController;

    beforeEach(async () => {
        const service = {
            getLiffConfig: jest.fn().mockReturnValue({ liffId: 'test' }),
            buildDefaultRichMenu: jest.fn().mockReturnValue({}),
            buildEmergencyRichMenu: jest.fn().mockReturnValue({}),
            buildAlertFlexMessage: jest.fn().mockReturnValue({}),
            buildReportConfirmFlexMessage: jest.fn().mockReturnValue({}),
            buildShelterCarousel: jest.fn().mockReturnValue({}),
            buildCheckinSuccessFlexMessage: jest.fn().mockReturnValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LineLiffController],
            providers: [{ provide: LineLiffService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<LineLiffController>(LineLiffController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getLiffConfig returns config', () => expect(controller.getLiffConfig()).toBeDefined());
    it('getDefaultRichMenu returns menu', () => expect(controller.getDefaultRichMenu()).toBeDefined());
    it('getEmergencyRichMenu returns menu', () => expect(controller.getEmergencyRichMenu()).toBeDefined());
    it('buildAlertFlexMessage builds alert', () => {
        expect(controller.buildAlertFlexMessage({ id: '1', type: 'eq', title: 'Test', description: 'D', severity: 'red', affectedArea: 'Taipei' })).toBeDefined();
    });
    it('buildReportConfirmFlexMessage builds confirm', () => {
        expect(controller.buildReportConfirmFlexMessage({ id: '1', caseNumber: 'C001', type: 'flood', description: 'D' })).toBeDefined();
    });
    it('buildShelterCarousel builds carousel', () => {
        expect(controller.buildShelterCarousel([])).toBeDefined();
    });
});
