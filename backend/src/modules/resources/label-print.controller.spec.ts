import { Test, TestingModule } from '@nestjs/testing';
import { LabelPrintController } from './label-print.controller';
import { LabelPrintService } from './label-print.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('LabelPrintController', () => {
    let controller: LabelPrintController;

    beforeEach(async () => {
        const service = {
            generateLabelData: jest.fn().mockResolvedValue({ labels: [] }),
            batchGenerateLabelData: jest.fn().mockResolvedValue({ labels: [] }),
            reprintLabel: jest.fn().mockResolvedValue({ labels: [] }),
            revokeLabel: jest.fn().mockResolvedValue(undefined),
            getPrintHistory: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LabelPrintController],
            providers: [{ provide: LabelPrintService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<LabelPrintController>(LabelPrintController);
    });

    const req = { user: { uid: 'u1', roleLevel: 5, role: '倉管' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('generateLotLabel generates', async () => {
        const result = await controller.generateLotLabel({ lotId: 'l1', templateId: 't1' }, req);
        expect(result).toBeDefined();
    });
    it('generateAssetLabels generates batch', async () => {
        const result = await controller.generateAssetLabels({ assetIds: ['a1'], templateId: 't1' }, req);
        expect(result).toBeDefined();
    });
    it('revokeLabel revokes', async () => {
        const result = await controller.revokeLabel({ targetType: 'lot', targetId: 'l1', revokeReason: 'damaged' }, req);
        expect(result.message).toContain('作廢');
    });
    it('getPrintHistory returns history', async () => {
        const result = await controller.getPrintHistory('lot', 'l1', req);
        expect(result).toBeDefined();
    });
});
