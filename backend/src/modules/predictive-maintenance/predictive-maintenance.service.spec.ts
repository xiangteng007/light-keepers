import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';

describe('PredictiveMaintenanceService', () => {
    let service: PredictiveMaintenanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PredictiveMaintenanceService],
        }).compile();

        service = module.get<PredictiveMaintenanceService>(PredictiveMaintenanceService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== registerEquipment =====
    describe('registerEquipment', () => {
        it('should register equipment with operational status', () => {
            const eq = service.registerEquipment({ name: '發電機A', type: 'generator', location: '台北倉庫' });
            expect(eq.id).toBeDefined();
            expect(eq.status).toBe('operational');
            expect(eq.healthScore).toBe(100);
            expect(eq.readings).toHaveLength(0);
        });

        it('should use custom id if provided', () => {
            const eq = service.registerEquipment({ id: 'eq-custom', name: '車輛B', type: 'vehicle', location: '高雄' });
            expect(eq.id).toBe('eq-custom');
        });

        it('should calculate nextMaintenance based on type', () => {
            const gen = service.registerEquipment({ name: 'Gen', type: 'generator', location: 'HQ' });
            const veh = service.registerEquipment({ name: 'Veh', type: 'vehicle', location: 'HQ' });
            // generator=90d, vehicle=30d
            expect(gen.nextMaintenance.getTime()).toBeGreaterThan(veh.nextMaintenance.getTime());
        });
    });

    // ===== recordReading & analyzeHealth =====
    describe('recordReading', () => {
        it('should throw for unknown equipment', () => {
            expect(() => service.recordReading('unknown', { temperature: 30 })).toThrow('Equipment not found');
        });

        it('should return insufficient_data with < 5 readings', () => {
            service.registerEquipment({ id: 'eq-1', name: 'Test', type: 'generator', location: 'A' });
            const result = service.recordReading('eq-1', { temperature: 30 });
            expect(result.status).toBe('insufficient_data');
        });

        it('should detect high temperature warning', () => {
            service.registerEquipment({ id: 'eq-hot', name: 'Hot', type: 'generator', location: 'A' });
            for (let i = 0; i < 10; i++) {
                service.recordReading('eq-hot', { temperature: 65, vibration: 1 });
            }
            const analysis = service.recordReading('eq-hot', { temperature: 65 });
            expect(analysis.healthScore).toBeLessThan(100);
            expect(analysis.issues).toContain('溫度偏高');
        });

        it('should detect critical high temperature', () => {
            service.registerEquipment({ id: 'eq-crit', name: 'Crit', type: 'pump', location: 'B' });
            for (let i = 0; i < 10; i++) {
                service.recordReading('eq-crit', { temperature: 85, vibration: 6 });
            }
            const analysis = service.recordReading('eq-crit', { temperature: 85, vibration: 6 });
            expect(analysis.healthScore).toBeLessThanOrEqual(50);
            expect(analysis.issues).toContain('高溫警告');
            expect(analysis.issues).toContain('異常振動');
            expect(analysis.predictions!.length).toBe(2);
            expect(analysis.recommendedActions).toContain('檢查冷卻系統');
            expect(analysis.recommendedActions).toContain('更換軸承');
        });

        it('should cap readings at 100', () => {
            service.registerEquipment({ id: 'eq-cap', name: 'Cap', type: 'radio', location: 'C' });
            for (let i = 0; i < 110; i++) {
                service.recordReading('eq-cap', { temperature: 25 });
            }
            const eq = service.listEquipment().find(e => e.id === 'eq-cap');
            expect(eq!.readings.length).toBeLessThanOrEqual(100);
        });
    });

    // ===== getMaintenanceSchedule =====
    describe('getMaintenanceSchedule', () => {
        it('should return equipment needing maintenance within window', () => {
            service.registerEquipment({ id: 'eq-s1', name: 'S1', type: 'vehicle', location: 'A' });
            // vehicle = 30 days, so should appear in 60-day window
            const schedule = service.getMaintenanceSchedule(60);
            expect(schedule.length).toBe(1);
            expect(schedule[0].equipmentId).toBe('eq-s1');
        });

        it('should prioritize low healthScore equipment', () => {
            service.registerEquipment({ id: 'eq-low', name: 'Low', type: 'vehicle', location: 'A' });
            // Degrade health
            for (let i = 0; i < 10; i++) {
                service.recordReading('eq-low', { temperature: 85, vibration: 6 });
            }
            const schedule = service.getMaintenanceSchedule(60);
            const entry = schedule.find(s => s.equipmentId === 'eq-low');
            expect(entry!.priority).toBe('high');
        });
    });

    // ===== recordMaintenance =====
    describe('recordMaintenance', () => {
        it('should reset health after maintenance', () => {
            service.registerEquipment({ id: 'eq-m', name: 'M', type: 'generator', location: 'A' });
            for (let i = 0; i < 10; i++) service.recordReading('eq-m', { temperature: 85 });
            const record = service.recordMaintenance('eq-m', { type: 'repair', description: '更換零件', performedBy: '技師' });
            expect(record.id).toContain('maint-');
            const eq = service.listEquipment().find(e => e.id === 'eq-m');
            expect(eq!.healthScore).toBe(100);
            expect(eq!.status).toBe('operational');
        });

        it('should throw for unknown equipment', () => {
            expect(() => service.recordMaintenance('fake', { type: 'repair', description: '', performedBy: '' })).toThrow();
        });
    });

    // ===== getAnomalousEquipment =====
    describe('getAnomalousEquipment', () => {
        it('should return non-operational equipment', () => {
            service.registerEquipment({ id: 'eq-a', name: 'A', type: 'pump', location: 'X' });
            for (let i = 0; i < 10; i++) service.recordReading('eq-a', { temperature: 85, vibration: 6 });
            const anomalous = service.getAnomalousEquipment();
            expect(anomalous.length).toBe(1);
            expect(anomalous[0].id).toBe('eq-a');
        });
    });
});
