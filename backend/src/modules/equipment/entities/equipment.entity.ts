/**
 * Equipment Entity - 設備資料
 * Phase 5.5: 設備生命週期管理
 */

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { EquipmentLog } from './equipment-log.entity';

export enum EquipmentStatus {
    AVAILABLE = 'AVAILABLE',       // 可用
    IN_USE = 'IN_USE',             // 使用中
    MAINTENANCE = 'MAINTENANCE',   // 維護中
    CHARGING = 'CHARGING',         // 充電中
    DAMAGED = 'DAMAGED',           // 損壞
    RETIRED = 'RETIRED',           // 報廢
}

export enum EquipmentCategory {
    RADIO = 'RADIO',               // 無線電
    GPS = 'GPS',                   // GPS 設備
    TABLET = 'TABLET',             // 平板
    DRONE = 'DRONE',               // 無人機
    FIRST_AID = 'FIRST_AID',       // 急救包
    LIGHT = 'LIGHT',               // 照明設備
    POWER_BANK = 'POWER_BANK',     // 行動電源
    OTHER = 'OTHER',
}

@Entity('equipment')
export class Equipment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    name: string;

    @Column({ unique: true, length: 50 })
    @Index()
    serialNumber: string;

    @Column({ unique: true, length: 50, nullable: true })
    @Index()
    qrCode?: string;

    @Column({
        type: 'enum',
        enum: EquipmentCategory,
        default: EquipmentCategory.OTHER,
    })
    @Index()
    category: EquipmentCategory;

    @Column({
        type: 'enum',
        enum: EquipmentStatus,
        default: EquipmentStatus.AVAILABLE,
    })
    @Index()
    status: EquipmentStatus;

    // ============ 電池追蹤 ============

    /** 電池電量 (0-100) */
    @Column({ type: 'int', nullable: true })
    batteryLevel?: number;

    /** 電池健康度 (0-100) */
    @Column({ type: 'int', nullable: true })
    batteryHealth?: number;

    /** 最後充電時間 */
    @Column({ type: 'timestamp', nullable: true })
    lastCharged?: Date;

    // ============ 維護記錄 ============

    /** 上次維護日期 */
    @Column({ type: 'date', nullable: true })
    lastMaintenanceDate?: Date;

    /** 下次維護日期 */
    @Column({ type: 'date', nullable: true })
    nextMaintenanceDate?: Date;

    /** 維護週期 (天) */
    @Column({ type: 'int', default: 90 })
    maintenanceIntervalDays: number;

    // ============ 借用追蹤 ============

    /** 目前持有者 ID */
    @Column({ nullable: true })
    currentHolderId?: string;

    /** 目前持有者姓名 */
    @Column({ nullable: true, length: 100 })
    currentHolderName?: string;

    /** 借出時間 */
    @Column({ type: 'timestamp', nullable: true })
    checkedOutAt?: Date;

    /** 預計歸還時間 */
    @Column({ type: 'timestamp', nullable: true })
    expectedReturnAt?: Date;

    // ============ 時間戳 ============

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // ============ 關聯 ============

    @OneToMany(() => EquipmentLog, (log) => log.equipment)
    logs: EquipmentLog[];
}
