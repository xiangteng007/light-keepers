import { Test, TestingModule } from '@nestjs/testing';
import { ManualsController } from './manuals.controller';
import { ManualsService } from './manuals.service';
import { OptionalJwtGuard } from '../shared/guards';

describe('ManualsController', () => {
    let controller: ManualsController;

    beforeEach(async () => {
        const service = {
            getAllManuals: jest.fn().mockReturnValue([]),
            searchWithAI: jest.fn().mockResolvedValue({ query: 'test', results: [], processingTime: 10 }),
            getManualById: jest.fn().mockReturnValue({ id: 'm1', title: 'Manual' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ManualsController],
            providers: [{ provide: ManualsService, useValue: service }],
        })
            .overrideGuard(OptionalJwtGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ManualsController>(ManualsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getAllManuals returns manuals', () => expect(controller.getAllManuals().success).toBe(true));
    it('searchManuals returns results', async () => {
        const result = await controller.searchManuals('earthquake');
        expect(result.success).toBe(true);
    });
    it('searchManuals empty query returns empty', async () => {
        const result = await controller.searchManuals('');
        expect(result.data.results).toEqual([]);
    });
    it('getManualById returns manual', () => {
        const result = controller.getManualById('m1');
        expect(result.success).toBe(true);
    });
    it('getManualById returns not found', () => {
        jest.spyOn(controller as any, 'getManualById');
        // Service returns null => controller returns success:false
        const svc = (controller as any).manualsService;
        svc.getManualById.mockReturnValue(null);
        const result = controller.getManualById('invalid');
        expect(result.success).toBe(false);
    });
});
