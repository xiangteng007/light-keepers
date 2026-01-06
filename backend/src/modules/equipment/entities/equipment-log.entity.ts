/**
 * Equipment Log Entity - 設備使用記錄
 * Phase 5.5: Equipment Lifecycle
 */

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Equipment } from './equipment.entity';

export enum EquipmentLogType {
    CHECKOUT = 'CHECKOUT',         // 借出
    RETURN = 'RETURN',             // 歸還
    MAINTENANCE_START = 'MAINTENANCE_START', // 開始維護
    MAINTENANCE_END = 'MAINTENANCE_END',     // 結束維護
    BATTERY_UPDATE = 'BATTERY_UPDATE',       // 電池更新
    STATUS_CHANGE = 'STATUS_CHANGE',         // 狀態變更
    NOTE = 'NOTE',                 // 備註
}

@Entity('equipment_logs')
export class EquipmentLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    equipmentId: string;

    @Column({
        type: 'enum',
        enum: EquipmentLogType,
    })
    type: EquipmentLogType;

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    performerId?: string;

    @Column({ nullable: true, length: 100 })
    performerName?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn()
    timestamp: Date;

    // ============ 關聯 ============

    @ManyToOne(() => Equipment, (equipment) => equipment.logs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'equipmentId' })
    equipment: Equipment;
}
