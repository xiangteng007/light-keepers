import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('ResourcesController', () => {
    let controller: ResourcesController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'r1' }),
            findAll: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({}),
            recalculateAllStatus: jest.fn().mockResolvedValue({ updated: 5 }),
            getLowStock: jest.fn().mockResolvedValue([]),
            getExpiringSoon: jest.fn().mockResolvedValue([]),
            findByBarcode: jest.fn().mockResolvedValue({ id: 'r1' }),
            findOne: jest.fn().mockResolvedValue({ id: 'r1' }),
            update: jest.fn().mockResolvedValue({ id: 'r1', unit: 'box' }),
            delete: jest.fn().mockResolvedValue(undefined),
            addStock: jest.fn().mockResolvedValue({ id: 'r1', unit: 'box' }),
            deductStock: jest.fn().mockResolvedValue({ id: 'r1', unit: 'box' }),
            getTransactions: jest.fn().mockResolvedValue([]),
            deleteTransaction: jest.fn().mockResolvedValue(undefined),
            transferResource: jest.fn().mockResolvedValue({}),
            createDonationSource: jest.fn().mockResolvedValue({ id: 'ds1' }),
            getAllDonationSources: jest.fn().mockResolvedValue([]),
            recordDonation: jest.fn().mockResolvedValue({}),
            createBatch: jest.fn().mockResolvedValue({ id: 'b1' }),
            getBatches: jest.fn().mockResolvedValue([]),
            getExpiringBatches: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ResourcesController],
            providers: [{ provide: ResourcesService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ResourcesController>(ResourcesController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create creates resource', async () => {
        const result = await controller.create({} as any);
        expect(result.success).toBe(true);
    });
    it('findAll returns resources', async () => {
        const result = await controller.findAll();
        expect(result.success).toBe(true);
    });
    it('getStats returns stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
    });
    it('addStock adds stock', async () => {
        const result = await controller.addStock('r1', { amount: 10, operatorName: 'test' });
        expect(result.success).toBe(true);
    });
    it('deductStock deducts', async () => {
        const result = await controller.deductStock('r1', { amount: 5, operatorName: 'test' });
        expect(result.success).toBe(true);
    });
    it('transferResource transfers', async () => {
        const result = await controller.transferResource('r1', { quantity: 3, fromLocation: 'A', toLocation: 'B', operatorName: 'test' });
        expect(result.success).toBe(true);
    });
    it('createBatch creates batch', async () => {
        const result = await controller.createBatch('r1', { batchNo: 'B001', quantity: 100 });
        expect(result.success).toBe(true);
    });
});
