import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('EquipmentController', () => {
    let controller: EquipmentController;
    let service: jest.Mocked<Partial<EquipmentService>>;

    const mockEquipment = { id: 'e1', name: '無線電', category: 'communication', status: 'available' };

    beforeEach(async () => {
        service = {
            create: jest.fn().mockResolvedValue(mockEquipment),
            findAll: jest.fn().mockResolvedValue([mockEquipment]),
            getStats: jest.fn().mockResolvedValue({ total: 50, available: 40 }),
            getLowBattery: jest.fn().mockResolvedValue([]),
            getMaintenanceDue: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue(mockEquipment),
            findByQrCode: jest.fn().mockResolvedValue(mockEquipment),
            checkout: jest.fn().mockResolvedValue({ ...mockEquipment, status: 'checked_out' }),
            returnEquipment: jest.fn().mockResolvedValue({ ...mockEquipment, status: 'available' }),
            startMaintenance: jest.fn().mockResolvedValue({ ...mockEquipment, status: 'maintenance' }),
            endMaintenance: jest.fn().mockResolvedValue({ ...mockEquipment, status: 'available' }),
            updateBattery: jest.fn().mockResolvedValue({ ...mockEquipment, batteryLevel: 80 }),
            getLogs: jest.fn().mockResolvedValue([{ action: 'checkout', timestamp: new Date() }]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EquipmentController],
            providers: [{ provide: EquipmentService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<EquipmentController>(EquipmentController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('create creates equipment', async () => {
        const result = await controller.create({ name: '無線電' });
        expect(result).toEqual(mockEquipment);
    });

    it('findAll returns all equipment', async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
    });

    it('getStats returns statistics', async () => {
        const result = await controller.getStats();
        expect(result.total).toBe(50);
    });

    it('getLowBattery returns low-battery devices', async () => {
        const result = await controller.getLowBattery('30');
        expect(service.getLowBattery).toHaveBeenCalledWith(30);
    });

    it('findById returns equipment by id', async () => {
        const result = await controller.findById('e1');
        expect(result).toEqual(mockEquipment);
    });

    it('findByQrCode returns equipment by QR code', async () => {
        const result = await controller.findByQrCode('QR-001');
        expect(service.findByQrCode).toHaveBeenCalledWith('QR-001');
    });

    it('checkout checks out equipment', async () => {
        const result = await controller.checkout('e1', { holderId: 'u1', holderName: 'Test' });
        expect(result.status).toBe('checked_out');
    });

    it('returnEquipment returns equipment', async () => {
        const result = await controller.returnEquipment('e1', { returnerId: 'u1', returnerName: 'Test' });
        expect(result.status).toBe('available');
    });

    it('startMaintenance starts maintenance', async () => {
        const result = await controller.startMaintenance('e1', { reason: '定期保養' });
        expect(result.status).toBe('maintenance');
    });

    it('endMaintenance ends maintenance', async () => {
        const result = await controller.endMaintenance('e1', { notes: '完成' });
        expect(result.status).toBe('available');
    });

    it('updateBattery updates battery level', async () => {
        const result = await controller.updateBattery('e1', { batteryLevel: 80 });
        expect(result.batteryLevel).toBe(80);
    });

    it('getLogs returns equipment logs', async () => {
        const result = await controller.getLogs('e1');
        expect(result).toHaveLength(1);
    });
});
