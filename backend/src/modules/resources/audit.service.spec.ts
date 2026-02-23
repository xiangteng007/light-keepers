import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { InventoryAudit } from './inventory-audit.entity';
import { Resource } from './resources.entity';
import { Asset } from './asset.entity';
import { ResourcesService } from './resources.service';

describe('AuditService', () => {
    let service: AuditService;

    const mockAudit = {
        id: 'aud1', type: 'consumable', status: 'in_progress',
        items: JSON.stringify([{ itemId: 'i1', itemName: 'Item', systemQty: 10, actualQty: 10, difference: 0 }]),
        assets: JSON.stringify([]),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: getRepositoryToken(InventoryAudit), useValue: {
                    create: jest.fn().mockReturnValue({ ...mockAudit }),
                    save: jest.fn().mockImplementation(a => Promise.resolve(a)),
                    find: jest.fn().mockResolvedValue([mockAudit]),
                    findOne: jest.fn().mockResolvedValue({ ...mockAudit }),
                } },
                { provide: getRepositoryToken(Resource), useValue: {
                    find: jest.fn().mockResolvedValue([{ id: 'i1', name: 'Item', quantity: 10 }]),
                    save: jest.fn().mockResolvedValue({}),
                } },
                { provide: getRepositoryToken(Asset), useValue: {
                    find: jest.fn().mockResolvedValue([{ id: 'a1', assetNo: 'A001' }]),
                } },
                { provide: ResourcesService, useValue: {} },
            ],
        }).compile();
        service = module.get(AuditService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('startConsumableAudit creates audit', async () => {
        const result = await service.startConsumableAudit({ auditorName: 'Admin' });
        expect(result).toBeDefined();
    });

    it('startAssetAudit creates audit', async () => {
        const result = await service.startAssetAudit({ auditorName: 'Admin' });
        expect(result).toBeDefined();
    });

    it('findAll returns list', async () => {
        const result = await service.findAll();
        expect(result.length).toBe(1);
    });

    it('parseItems parses JSON', () => {
        const items = service.parseItems(mockAudit as any);
        expect(items.length).toBe(1);
        expect(items[0].itemId).toBe('i1');
    });

    it('parseAssets parses JSON', () => {
        const assets = service.parseAssets(mockAudit as any);
        expect(assets).toEqual([]);
    });
});
