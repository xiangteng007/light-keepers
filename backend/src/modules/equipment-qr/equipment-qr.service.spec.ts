import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentQrService } from './equipment-qr.service';

const delay = (ms = 2) => new Promise(r => setTimeout(r, ms));

describe('EquipmentQrService', () => {
    let service: EquipmentQrService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EquipmentQrService],
        }).compile();
        service = module.get<EquipmentQrService>(EquipmentQrService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('registerEquipment', () => {
        it('should register with available status and QR code', () => {
            const eq = service.registerEquipment({ name: '無線電', category: '通訊設備', location: '總部' });
            expect(eq.status).toBe('available');
            expect(eq.qrCode).toBeDefined();
            expect(eq.id).toContain('eq-');
        });
    });

    describe('getEquipmentByQr', () => {
        it('should look up by QR code', () => {
            const eq = service.registerEquipment({ name: '手電筒', category: '照明設備', location: '倉庫A' });
            const found = service.getEquipmentByQr(eq.qrCode);
            expect(found!.name).toBe('手電筒');
        });

        it('should return undefined for unknown QR', () => {
            expect(service.getEquipmentByQr('fake')).toBeUndefined();
        });
    });

    describe('checkout / returnEquipment', () => {
        it('should checkout equipment and mark in_use', () => {
            const eq = service.registerEquipment({ name: '急救包', category: '急救用品', location: '倉庫B' });
            const record = service.checkout(eq.qrCode, 'user-1', '張三');
            expect(record).not.toBeNull();
            expect(record!.userId).toBe('user-1');
            expect(service.getEquipmentByQr(eq.qrCode)!.status).toBe('in_use');
        });

        it('should return null if already checked out', () => {
            const eq = service.registerEquipment({ name: '急救包', category: '急救用品', location: '倉庫B' });
            service.checkout(eq.qrCode, 'user-1', '張三');
            const second = service.checkout(eq.qrCode, 'user-2', '李四');
            expect(second).toBeNull();
        });

        it('should return equipment in good condition', () => {
            const eq = service.registerEquipment({ name: '急救包', category: '急救用品', location: '倉庫B' });
            const record = service.checkout(eq.qrCode, 'user-1', '張三')!;
            const returned = service.returnEquipment(record.id, 'good');
            expect(returned!.returnedAt).toBeInstanceOf(Date);
            expect(service.getEquipmentByQr(eq.qrCode)!.status).toBe('available');
        });

        it('should auto-schedule repair when returned needs_repair', async () => {
            const eq = service.registerEquipment({ name: '無線電', category: '通訊設備', location: '倉庫C' });
            const record = service.checkout(eq.qrCode, 'user-1', '張三')!;
            service.returnEquipment(record.id, 'needs_repair', '螢幕裂開');
            expect(service.getEquipmentByQr(eq.qrCode)!.status).toBe('maintenance');
            expect(service.getPendingMaintenance().length).toBeGreaterThan(0);
        });
    });

    describe('getActiveCheckouts', () => {
        it('should return only unreturned records', async () => {
            const eq1 = service.registerEquipment({ name: 'A', category: 'x', location: 'y' });
            await delay();
            const eq2 = service.registerEquipment({ name: 'B', category: 'x', location: 'y' });
            service.checkout(eq1.qrCode, 'u1', 'U1');
            await delay();
            const r2 = service.checkout(eq2.qrCode, 'u2', 'U2')!;
            service.returnEquipment(r2.id, 'good');
            expect(service.getActiveCheckouts()).toHaveLength(1);
        });
    });

    describe('scheduleMaintenance / completeMaintenance', () => {
        it('should schedule and complete maintenance', () => {
            const eq = service.registerEquipment({ name: '發電機', category: '電力設備', location: '倉庫D' });
            service.updateEquipment(eq.id, { status: 'maintenance' });
            const sched = service.scheduleMaintenance({ equipmentId: eq.id, type: 'routine', scheduledAt: new Date() });
            expect(sched.id).toContain('maint-');
            const done = service.completeMaintenance(sched.id);
            expect(done).toBe(true);
            expect(service.getAllEquipment().find(e => e.id === eq.id)!.status).toBe('available');
        });
    });

    describe('getInventoryStats', () => {
        it('should compute stats', async () => {
            service.registerEquipment({ name: 'A', category: '急救用品', location: 'x' });
            await delay();
            service.registerEquipment({ name: 'B', category: '通訊設備', location: 'x' });
            const stats = service.getInventoryStats();
            expect(stats.total).toBe(2);
            expect(stats.byCategory['急救用品']).toBe(1);
        });
    });

    describe('getLowStockAlerts', () => {
        it('should alert when below minimum', () => {
            // No equipment registered = all below minimum
            const alerts = service.getLowStockAlerts();
            expect(alerts.length).toBe(3); // 急救用品, 通訊設備, 照明設備
        });
    });
});
