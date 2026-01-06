import { Injectable, Logger } from '@nestjs/common';

/**
 * Predictive Maintenance Service
 * Equipment anomaly prediction
 */
@Injectable()
export class PredictiveMaintenanceService {
    private readonly logger = new Logger(PredictiveMaintenanceService.name);
    private equipment: Map<string, EquipmentData> = new Map();
    private maintenanceHistory: MaintenanceRecord[] = [];

    /**
     * 註冊設備
     */
    registerEquipment(data: EquipmentRegistration): EquipmentData {
        const equipment: EquipmentData = {
            id: data.id || `eq-${Date.now()}`,
            name: data.name,
            type: data.type,
            location: data.location,
            lastMaintenance: data.lastMaintenance || new Date(),
            nextMaintenance: this.calcNextMaintenance(data.type),
            status: 'operational',
            healthScore: 100,
            readings: [],
        };

        this.equipment.set(equipment.id, equipment);
        return equipment;
    }

    /**
     * 接收設備讀數
     */
    recordReading(equipmentId: string, reading: SensorReading): HealthAnalysis {
        const equipment = this.equipment.get(equipmentId);
        if (!equipment) throw new Error('Equipment not found');

        equipment.readings.push({ ...reading, timestamp: new Date() });

        // 只保留最近100筆
        if (equipment.readings.length > 100) {
            equipment.readings = equipment.readings.slice(-100);
        }

        return this.analyzeHealth(equipment);
    }

    /**
     * 分析設備健康度
     */
    analyzeHealth(equipment: EquipmentData): HealthAnalysis {
        const readings = equipment.readings;
        if (readings.length < 5) {
            return { healthScore: equipment.healthScore, status: 'insufficient_data', predictions: [] };
        }

        // 簡單趨勢分析
        const recentReadings = readings.slice(-10);
        const avgTemp = recentReadings.reduce((sum, r) => sum + (r.temperature || 25), 0) / recentReadings.length;
        const avgVibration = recentReadings.reduce((sum, r) => sum + (r.vibration || 0), 0) / recentReadings.length;

        let healthScore = 100;
        const issues: string[] = [];
        const predictions: MaintenancePrediction[] = [];

        // 溫度異常
        if (avgTemp > 80) {
            healthScore -= 30;
            issues.push('高溫警告');
            predictions.push({ type: 'cooling_system', urgency: 'high', daysUntilFailure: 7 });
        } else if (avgTemp > 60) {
            healthScore -= 10;
            issues.push('溫度偏高');
        }

        // 振動異常
        if (avgVibration > 5) {
            healthScore -= 25;
            issues.push('異常振動');
            predictions.push({ type: 'bearing_wear', urgency: 'medium', daysUntilFailure: 30 });
        }

        equipment.healthScore = Math.max(0, healthScore);
        equipment.status = healthScore < 50 ? 'critical' : healthScore < 75 ? 'warning' : 'operational';

        return {
            healthScore: equipment.healthScore,
            status: equipment.status,
            issues,
            predictions,
            recommendedActions: this.getRecommendedActions(predictions),
        };
    }

    /**
     * 取得維護排程
     */
    getMaintenanceSchedule(daysAhead: number = 30): ScheduledMaintenance[] {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + daysAhead);

        return Array.from(this.equipment.values())
            .filter((e) => e.nextMaintenance <= cutoff)
            .map((e) => ({
                equipmentId: e.id,
                equipmentName: e.name,
                scheduledDate: e.nextMaintenance,
                type: 'routine',
                priority: e.healthScore < 50 ? 'high' : 'normal',
            }))
            .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
    }

    /**
     * 記錄維護
     */
    recordMaintenance(equipmentId: string, maintenance: MaintenanceInput): MaintenanceRecord {
        const equipment = this.equipment.get(equipmentId);
        if (!equipment) throw new Error('Equipment not found');

        const record: MaintenanceRecord = {
            id: `maint-${Date.now()}`,
            equipmentId,
            type: maintenance.type,
            description: maintenance.description,
            performedBy: maintenance.performedBy,
            performedAt: new Date(),
            cost: maintenance.cost,
        };

        this.maintenanceHistory.push(record);

        equipment.lastMaintenance = new Date();
        equipment.nextMaintenance = this.calcNextMaintenance(equipment.type);
        equipment.healthScore = 100;
        equipment.status = 'operational';

        return record;
    }

    /**
     * 取得設備清單
     */
    listEquipment(): EquipmentData[] {
        return Array.from(this.equipment.values());
    }

    /**
     * 取得異常設備
     */
    getAnomalousEquipment(): EquipmentData[] {
        return Array.from(this.equipment.values()).filter((e) => e.status !== 'operational');
    }

    private calcNextMaintenance(type: string): Date {
        const intervalDays: Record<string, number> = {
            generator: 90, vehicle: 30, radio: 180, pump: 60, default: 90,
        };
        const days = intervalDays[type] || intervalDays['default'];
        const next = new Date();
        next.setDate(next.getDate() + days);
        return next;
    }

    private getRecommendedActions(predictions: MaintenancePrediction[]): string[] {
        return predictions.map((p) => {
            switch (p.type) {
                case 'cooling_system': return '檢查冷卻系統';
                case 'bearing_wear': return '更換軸承';
                default: return '進行例行檢查';
            }
        });
    }
}

// Types
interface EquipmentRegistration { id?: string; name: string; type: string; location: string; lastMaintenance?: Date; }
interface SensorReading { temperature?: number; vibration?: number; humidity?: number; voltage?: number; timestamp?: Date; }
interface EquipmentData { id: string; name: string; type: string; location: string; lastMaintenance: Date; nextMaintenance: Date; status: string; healthScore: number; readings: SensorReading[]; }
interface MaintenancePrediction { type: string; urgency: string; daysUntilFailure: number; }
interface HealthAnalysis { healthScore: number; status: string; issues?: string[]; predictions: MaintenancePrediction[]; recommendedActions?: string[]; }
interface ScheduledMaintenance { equipmentId: string; equipmentName: string; scheduledDate: Date; type: string; priority: string; }
interface MaintenanceInput { type: string; description: string; performedBy: string; cost?: number; }
interface MaintenanceRecord extends MaintenanceInput { id: string; equipmentId: string; performedAt: Date; }
