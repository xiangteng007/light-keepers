import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { Asset } from './asset.entity';
import { AssetTransaction } from './asset-transaction.entity';
import { StorageLocation } from './storage-location.entity';
import { Resource } from './resources.entity';

describe('AssetsService', () => {
    let service: AssetsService;

    const mockAsset = {
        id: 'a1', assetNo: 'AST-001', status: 'in_stock', item: { id: 'r1' },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AssetsService,
                { provide: getRepositoryToken(Asset), useValue: {
                    create: jest.fn().mockReturnValue(mockAsset),
                    save: jest.fn().mockResolvedValue(mockAsset),
                    find: jest.fn().mockResolvedValue([mockAsset]),
                    findOne: jest.fn().mockResolvedValue(mockAsset),
                    count: jest.fn().mockResolvedValue(10),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnThis(),
                        addSelect: jest.fn().mockReturnThis(),
                        groupBy: jest.fn().mockReturnThis(),
                        getRawMany: jest.fn().mockResolvedValue([{ status: 'available', count: '10' }]),
                        where: jest.fn().mockReturnThis(),
                        andWhere: jest.fn().mockReturnThis(),
                        getMany: jest.fn().mockResolvedValue([]),
                    }),
                } },
                { provide: getRepositoryToken(AssetTransaction), useValue: {
                    create: jest.fn().mockReturnValue({}),
                    save: jest.fn().mockResolvedValue({}),
                    find: jest.fn().mockResolvedValue([]),
                } },
                { provide: getRepositoryToken(StorageLocation), useValue: {
                    findOne: jest.fn().mockResolvedValue({ id: 'loc1' }),
                } },
                { provide: getRepositoryToken(Resource), useValue: {
                    findOne: jest.fn().mockResolvedValue({ id: 'r1', name: 'Item' }),
                } },
            ],
        }).compile();
        service = module.get(AssetsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('create returns asset', async () => {
        const result = await service.create({ itemId: 'r1', assetNo: 'A001' });
        expect(result.assetNo).toBe('AST-001');
    });

    it('findAll returns list', async () => {
        const result = await service.findAll();
        expect(result.length).toBe(1);
    });

    it('findById returns asset', async () => {
        const result = await service.findById('a1');
        expect(result.id).toBe('a1');
    });

    it('getStats returns stats', async () => {
        // getStats uses assetRepo.find() internally
        const result = await service.getStats();
        expect(result.total).toBeDefined();
        expect(result.byStatus).toBeDefined();
    });

    it('sanitizeForPublic omits fields', () => {
        const safe = service.sanitizeForPublic({ id: 'a1', internalNote: 'secret' } as any);
        expect(safe.internalNote).toBeUndefined();
    });
});
