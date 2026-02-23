import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AuditController (resources)', () => {
    let controller: AuditController;

    beforeEach(async () => {
        const service = {
            startConsumableAudit: jest.fn().mockResolvedValue({ id: 'a1' }),
            startAssetAudit: jest.fn().mockResolvedValue({ id: 'a2' }),
            findAll: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue({ id: 'a1' }),
            updateConsumableCount: jest.fn().mockResolvedValue({ id: 'a1' }),
            scanAsset: jest.fn().mockResolvedValue({ id: 'a1' }),
            markAssetMissing: jest.fn().mockResolvedValue({ id: 'a1' }),
            complete: jest.fn().mockResolvedValue({ id: 'a1' }),
            cancel: jest.fn().mockResolvedValue({ id: 'a1' }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuditController],
            providers: [{ provide: AuditService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<AuditController>(AuditController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('startConsumableAudit', async () => expect((await controller.startConsumableAudit({ auditorName: 'A' })).data).toBeDefined());
    it('startAssetAudit', async () => expect((await controller.startAssetAudit({ auditorName: 'A' })).data).toBeDefined());
    it('findAll', async () => expect((await controller.findAll()).data).toEqual([]));
    it('findById', async () => expect((await controller.findById('a1')).data.id).toBe('a1'));
    it('updateConsumableCount', async () => expect((await controller.updateConsumableCount('a1', 'i1', { actualQty: 5 })).data).toBeDefined());
    it('scanAsset', async () => expect((await controller.scanAsset('a1', 'as1')).data).toBeDefined());
    it('markAssetMissing', async () => expect((await controller.markAssetMissing('a1', 'as1', { note: 'lost' })).data).toBeDefined());
    it('complete', async () => expect((await controller.complete('a1', { reviewerName: 'R' })).data).toBeDefined());
    it('cancel', async () => expect((await controller.cancel('a1')).data).toBeDefined());
});
