import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentQrController } from './equipment-qr.controller';
import { EquipmentQrService } from './equipment-qr.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('EquipmentQrController', () => {
    let controller: EquipmentQrController;

    beforeEach(async () => {
        const service = {
            getAllEquipment: jest.fn().mockResolvedValue([{ id: 'eq1', name: '無線電' }]),
            getEquipmentByCategory: jest.fn().mockResolvedValue([]),
            getEquipmentByQr: jest.fn().mockResolvedValue({ id: 'eq1', qrCode: 'QR001' }),
            registerEquipment: jest.fn().mockResolvedValue({ id: 'eq2' }),
            checkout: jest.fn().mockResolvedValue({ recordId: 'rec1' }),
            returnEquipment: jest.fn().mockResolvedValue({ success: true }),
            getActiveCheckouts: jest.fn().mockResolvedValue([]),
            getCheckoutHistory: jest.fn().mockResolvedValue([]),
            getPendingMaintenance: jest.fn().mockResolvedValue([]),
            getMaintenanceAlerts: jest.fn().mockResolvedValue([]),
            scheduleMaintenance: jest.fn().mockResolvedValue({ id: 'sch1' }),
            completeMaintenance: jest.fn().mockReturnValue(true),
            getInventoryStats: jest.fn().mockResolvedValue({ total: 100 }),
            getLowStockAlerts: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EquipmentQrController],
            providers: [{ provide: EquipmentQrService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<EquipmentQrController>(EquipmentQrController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getAllEquipment returns all equipment', () => {
        const result = controller.getAllEquipment();
        expect(result).toBeDefined();
    });

    it('getByCategory returns by category', () => {
        const result = controller.getByCategory('communication');
        expect(result).toBeDefined();
    });

    it('scanQr returns equipment by QR', () => {
        const result = controller.scanQr('QR001');
        expect(result).toBeDefined();
    });

    it('register registers new equipment', () => {
        const result = controller.register({ name: 'Test' });
        expect(result).toBeDefined();
    });

    it('checkout checks out equipment', () => {
        const result = controller.checkout({ qrCode: 'QR001', userId: 'u1', userName: 'Test' });
        expect(result).toBeDefined();
    });

    it('returnEquipment returns equipment', () => {
        const result = controller.returnEquipment('rec1', { condition: 'good' });
        expect(result).toBeDefined();
    });

    it('getActiveCheckouts returns active checkouts', () => {
        const result = controller.getActiveCheckouts();
        expect(result).toBeDefined();
    });

    it('getPendingMaintenance returns pending', () => {
        const result = controller.getPendingMaintenance();
        expect(result).toBeDefined();
    });

    it('scheduleMaintenance schedules maintenance', () => {
        const result = controller.scheduleMaintenance({ equipmentId: 'eq1' });
        expect(result).toBeDefined();
    });

    it('completeMaintenance completes maintenance', () => {
        const result = controller.completeMaintenance('sch1');
        expect(result.success).toBe(true);
    });

    it('getInventoryStats returns stats', () => {
        const result = controller.getInventoryStats();
        expect(result).toBeDefined();
    });

    it('getLowStockAlerts returns alerts', () => {
        const result = controller.getLowStockAlerts();
        expect(result).toBeDefined();
    });
});
