import { Test, TestingModule } from '@nestjs/testing';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AssetsController', () => {
    let controller: AssetsController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'a1' }),
            findAll: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({ total: 10, byStatus: {}, overdue: 0 }),
            getOverdueAssets: jest.fn().mockResolvedValue([]),
            getTransactions: jest.fn().mockResolvedValue([]),
            findByBarcode: jest.fn().mockResolvedValue({ id: 'a1' }),
            findByAssetNo: jest.fn().mockResolvedValue({ id: 'a1' }),
            findById: jest.fn().mockResolvedValue({ id: 'a1' }),
            update: jest.fn().mockResolvedValue({ id: 'a1' }),
            borrowAsset: jest.fn().mockResolvedValue({ id: 'a1' }),
            returnAsset: jest.fn().mockResolvedValue({ id: 'a1' }),
            markMaintenance: jest.fn().mockResolvedValue({ id: 'a1' }),
            completeMaintenance: jest.fn().mockResolvedValue({ id: 'a1' }),
            dispose: jest.fn().mockResolvedValue({ id: 'a1' }),
            reportLost: jest.fn().mockResolvedValue({ id: 'a1' }),
            sanitizeForPublic: jest.fn().mockReturnValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AssetsController],
            providers: [{ provide: AssetsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AssetsController>(AssetsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create creates asset', async () => {
        const result = await controller.create({} as any);
        expect(result.data).toBeDefined();
    });
    it('findAll returns assets', async () => {
        const result = await controller.findAll();
        expect(result).toHaveProperty('total');
    });
    it('getStats returns stats', async () => {
        const result = await controller.getStats();
        expect(result.data.total).toBe(10);
    });
    it('borrow borrows asset', async () => {
        const result = await controller.borrow('a1', {} as any);
        expect(result.data).toBeDefined();
    });
    it('returnAsset returns asset', async () => {
        const result = await controller.returnAsset('a1', {} as any);
        expect(result.data).toBeDefined();
    });
    it('getPublicList returns public list', async () => {
        const result = await controller.getPublicList();
        expect(result).toHaveProperty('total');
    });
});
