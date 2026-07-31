import { Test, TestingModule } from '@nestjs/testing';
import { AARController } from './aar.controller';
import { AARService } from './aar.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AARController', () => {
    let controller: AARController;

    beforeEach(async () => {
        const service = {
            getAAR: jest.fn().mockResolvedValue({}),
            createAAR: jest.fn().mockResolvedValue({ id: 'aar1' }),
            generateAARDraft: jest.fn().mockResolvedValue({ id: 'aar1' }),
            generateTimeline: jest.fn().mockResolvedValue([]),
            generateStatistics: jest.fn().mockResolvedValue({}),
            updateAAR: jest.fn().mockResolvedValue({}),
            finalizeAAR: jest.fn().mockResolvedValue({}),
            exportAAR: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AARController],
            providers: [{ provide: AARService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AARController>(AARController);
    });

    const req = { user: { uid: 'u1' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('getAAR returns AAR', async () => {
        const result = await controller.getAAR('s1');
        expect(result.success).toBe(true);
    });
    it('createAAR creates AAR', async () => {
        const result = await controller.createAAR('s1', req);
        expect(result.success).toBe(true);
    });
    it('generateAAR generates draft', async () => {
        const result = await controller.generateAAR('s1', req);
        expect(result.success).toBe(true);
    });
    it('getTimeline returns timeline', async () => {
        const result = await controller.getTimeline('s1');
        expect(result.success).toBe(true);
    });
    it('updateAAR updates AAR', async () => {
        const result = await controller.updateAAR('aar1', { executiveSummary: 'Updated' });
        expect(result.success).toBe(true);
    });
    it('exportAAR exports AAR', async () => {
        const result = await controller.exportAAR('aar1');
        expect(result.success).toBe(true);
    });
});
