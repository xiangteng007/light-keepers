import { Injectable, Logger } from '@nestjs/common';

export interface Equipment {
    id: string;
    name: string;
    category: string;
    qrCode: string;
    status: 'available' | 'in_use' | 'maintenance' | 'retired';
    currentHolder?: string;
    location: string;
    lastMaintenanceAt?: Date;
    nextMaintenanceAt?: Date;
    purchasedAt: Date;
    warrantyUntil?: Date;
    metadata: Record<string, any>;
}

export interface CheckoutRecord {
    id: string;
    equipmentId: string;
    equipmentName: string;
    userId: string;
    userName: string;
    checkoutAt: Date;
    expectedReturnAt?: Date;
    returnedAt?: Date;
    condition: 'good' | 'damaged' | 'needs_repair';
    notes?: string;
}

export interface MaintenanceSchedule {
    id: string;
    equipmentId: string;
    type: 'routine' | 'repair' | 'inspection';
    scheduledAt: Date;
    completedAt?: Date;
    assignedTo?: string;
    notes?: string;
}

export interface InventoryStats {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    activeCheckouts: number;
    pendingMaintenance: number;
    lowStock: { category: string; available: number; minimum: number }[];
}

@Injectable()
export class EquipmentQrService {
    private readonly logger = new Logger(EquipmentQrService.name);
    private equipment: Map<string, Equipment> = new Map();
    private checkouts: Map<string, CheckoutRecord> = new Map();
    private maintenance: Map<string, MaintenanceSchedule> = new Map();
    private qrCodeMap: Map<string, string> = new Map(); // qrCode -> equipmentId

    // ===== 裝備管理 =====

    registerEquipment(data: {
        name: string;
        category: string;
        location: string;
        purchasedAt?: Date;
        warrantyUntil?: Date;
        metadata?: Record<string, any>;
    }): Equipment {
        const id = `eq-${Date.now()}`;
        const qrCode = this.generateQrCode(id);

        const item: Equipment = {
            id,
            name: data.name,
            category: data.category,
            qrCode,
            status: 'available',
            location: data.location,
            purchasedAt: data.purchasedAt || new Date(),
            warrantyUntil: data.warrantyUntil,
            metadata: data.metadata || {},
        };

        this.equipment.set(id, item);
        this.qrCodeMap.set(qrCode, id);
        return item;
    }

    getEquipmentByQr(qrCode: string): Equipment | undefined {
        const id = this.qrCodeMap.get(qrCode);
        return id ? this.equipment.get(id) : undefined;
    }

    getAllEquipment(): Equipment[] {
        return Array.from(this.equipment.values());
    }

    getEquipmentByCategory(category: string): Equipment[] {
        return this.getAllEquipment().filter(e => e.category === category);
    }

    updateEquipment(id: string, updates: Partial<Equipment>): Equipment | null {
        const item = this.equipment.get(id);
        if (!item) return null;
        Object.assign(item, updates);
        return item;
    }

    // ===== 領用歸還 =====

    checkout(qrCode: string, userId: string, userName: string, expectedReturnAt?: Date): CheckoutRecord | null {
        const item = this.getEquipmentByQr(qrCode);
        if (!item || item.status !== 'available') {
            return null;
        }

        const record: CheckoutRecord = {
            id: `co-${Date.now()}`,
            equipmentId: item.id,
            equipmentName: item.name,
            userId,
            userName,
            checkoutAt: new Date(),
            expectedReturnAt,
            condition: 'good',
        };

        item.status = 'in_use';
        item.currentHolder = userId;
        this.checkouts.set(record.id, record);

        return record;
    }

    returnEquipment(recordId: string, condition: 'good' | 'damaged' | 'needs_repair', notes?: string): CheckoutRecord | null {
        const record = this.checkouts.get(recordId);
        if (!record || record.returnedAt) {
            return null;
        }

        record.returnedAt = new Date();
        record.condition = condition;
        record.notes = notes;

        const item = this.equipment.get(record.equipmentId);
        if (item) {
            item.status = condition === 'needs_repair' ? 'maintenance' : 'available';
            item.currentHolder = undefined;

            if (condition === 'needs_repair') {
                this.scheduleMaintenanceForEquipment(item.id, 'repair', notes);
            }
        }

        return record;
    }

    getActiveCheckouts(): CheckoutRecord[] {
        return Array.from(this.checkouts.values()).filter(r => !r.returnedAt);
    }

    getCheckoutHistory(equipmentId: string): CheckoutRecord[] {
        return Array.from(this.checkouts.values())
            .filter(r => r.equipmentId === equipmentId)
            .sort((a, b) => b.checkoutAt.getTime() - a.checkoutAt.getTime());
    }

    // ===== 維護排程 =====

    scheduleMaintenance(data: {
        equipmentId: string;
        type: 'routine' | 'repair' | 'inspection';
        scheduledAt: Date;
        assignedTo?: string;
        notes?: string;
    }): MaintenanceSchedule {
        const schedule: MaintenanceSchedule = {
            id: `maint-${Date.now()}`,
            ...data,
        };
        this.maintenance.set(schedule.id, schedule);
        return schedule;
    }

    private scheduleMaintenanceForEquipment(equipmentId: string, type: 'repair', notes?: string) {
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + 1);
        this.scheduleMaintenance({
            equipmentId,
            type,
            scheduledAt: scheduled,
            notes,
        });
    }

    completeMaintenance(scheduleId: string): boolean {
        const schedule = this.maintenance.get(scheduleId);
        if (!schedule) return false;

        schedule.completedAt = new Date();

        const item = this.equipment.get(schedule.equipmentId);
        if (item) {
            item.lastMaintenanceAt = new Date();
            if (item.status === 'maintenance') {
                item.status = 'available';
            }
            // 設定下次例行維護
            const next = new Date();
            next.setMonth(next.getMonth() + 3);
            item.nextMaintenanceAt = next;
        }

        return true;
    }

    getPendingMaintenance(): MaintenanceSchedule[] {
        return Array.from(this.maintenance.values())
            .filter(m => !m.completedAt)
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }

    getMaintenanceAlerts(): Equipment[] {
        const now = new Date();
        return this.getAllEquipment().filter(e =>
            e.nextMaintenanceAt && e.nextMaintenanceAt <= now
        );
    }

    // ===== 庫存統計 =====

    getInventoryStats(): InventoryStats {
        const all = this.getAllEquipment();
        const byStatus: Record<string, number> = {};
        const byCategory: Record<string, number> = {};

        all.forEach(e => {
            byStatus[e.status] = (byStatus[e.status] || 0) + 1;
            byCategory[e.category] = (byCategory[e.category] || 0) + 1;
        });

        return {
            total: all.length,
            byStatus,
            byCategory,
            activeCheckouts: this.getActiveCheckouts().length,
            pendingMaintenance: this.getPendingMaintenance().length,
            lowStock: this.getLowStockAlerts(),
        };
    }

    getLowStockAlerts(): { category: string; available: number; minimum: number }[] {
        // 模擬最低庫存警示
        const minimums: Record<string, number> = {
            '急救用品': 10,
            '通訊設備': 5,
            '照明設備': 8,
        };

        const alerts: { category: string; available: number; minimum: number }[] = [];
        const byCategory: Record<string, number> = {};

        this.getAllEquipment()
            .filter(e => e.status === 'available')
            .forEach(e => {
                byCategory[e.category] = (byCategory[e.category] || 0) + 1;
            });

        Object.entries(minimums).forEach(([category, minimum]) => {
            const available = byCategory[category] || 0;
            if (available < minimum) {
                alerts.push({ category, available, minimum });
            }
        });

        return alerts;
    }

    private generateQrCode(id: string): string {
        return Buffer.from(`eq:${id}:${Date.now()}`).toString('base64');
    }
}

