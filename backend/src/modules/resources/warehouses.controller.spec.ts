import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('WarehousesController', () => {
    let controller: WarehousesController;

    beforeEach(async () => {
        const service = {
            createWarehouse: jest.fn().mockResolvedValue({ id: 'w1' }),
            findAllWarehouses: jest.fn().mockResolvedValue([]),
            getPrimaryWarehouse: jest.fn().mockResolvedValue({ id: 'w1' }),
            findWarehouseById: jest.fn().mockResolvedValue({ id: 'w1' }),
            updateWarehouse: jest.fn().mockResolvedValue({ id: 'w1' }),
            deleteWarehouse: jest.fn().mockResolvedValue(undefined),
            createLocation: jest.fn().mockResolvedValue({ id: 'l1' }),
            findLocationsByWarehouse: jest.fn().mockResolvedValue([]),
            findAllLocations: jest.fn().mockResolvedValue([]),
            findLocationByBarcode: jest.fn().mockResolvedValue({ id: 'l1' }),
            findLocationById: jest.fn().mockResolvedValue({ id: 'l1' }),
            updateLocation: jest.fn().mockResolvedValue({ id: 'l1' }),
            deleteLocation: jest.fn().mockResolvedValue(undefined),
            getLocationStats: jest.fn().mockResolvedValue({ total: 5, byZone: {} }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WarehousesController],
            providers: [{ provide: WarehousesService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<WarehousesController>(WarehousesController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('createWarehouse', async () => expect((await controller.createWarehouse({})).data).toBeDefined());
    it('findAllWarehouses', async () => expect((await controller.findAllWarehouses()).total).toBe(0));
    it('getPrimaryWarehouse', async () => expect((await controller.getPrimaryWarehouse()).data).toBeDefined());
    it('deleteWarehouse', async () => expect((await controller.deleteWarehouse('w1')).success).toBe(true));
    it('createLocation', async () => expect((await controller.createLocation('w1', { zone: 'A', rack: '1', level: '1' })).data).toBeDefined());
    it('findLocationsByWarehouse', async () => expect((await controller.findLocationsByWarehouse('w1')).total).toBe(0));
    it('findAllLocations', async () => expect((await controller.findAllLocations()).total).toBe(0));
    it('deleteLocation', async () => expect((await controller.deleteLocation('l1')).success).toBe(true));
    it('getLocationStats', async () => expect((await controller.getLocationStats('w1')).data.total).toBe(5));
});
