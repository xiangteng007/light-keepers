import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
} from 'typeorm';
import { MissionEvent } from './event.entity';
import { Task } from './task.entity';
import { InventoryTransaction } from './inventory-transaction.entity';

export enum MissionStatus {
    PREPARING = 'preparing',
    ACTIVE = 'active',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

// v2.1 SSOT: Incident 類型
export enum IncidentType {
    INCIDENT = 'incident',     // 真實事件
    DRILL = 'drill',           // 演練
    EXERCISE = 'exercise',     // 演習
    ALERT = 'alert',           // 警報響應
}

// v2.1 SSOT: 優先等級 (P1-P5)
export enum IncidentSeverity {
    P1_CRITICAL = 'P1',    // 緊急 - 生命安全威脅
    P2_HIGH = 'P2',        // 高 - 重大損害
    P3_MEDIUM = 'P3',      // 中 - 需要關注
    P4_LOW = 'P4',         // 低 - 輕微影響
    P5_MINIMAL = 'P5',     // 最低 - 觀察中
}

// v2.1 SSOT: 通報來源
export enum IncidentSource {
    INTAKE = 'intake',         // 統一通報入口
    CITIZEN = 'citizen',       // 民眾通報
    NCDR_ALERT = 'ncdr_alert', // NCDR 警報
    PATROL = 'patrol',         // 巡邏發現
    TRANSFER = 'transfer',     // 轉介
    LEGACY = 'legacy',         // 舊系統
}

@Entity('mission_sessions')
export class MissionSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: MissionStatus,
        default: MissionStatus.PREPARING,
    })
    status: MissionStatus;

    // v2.1 SSOT: Incident 類型
    @Column({
        type: 'enum',
        enum: IncidentType,
        default: IncidentType.INCIDENT,
    })
    type: IncidentType;

    // v2.1 SSOT: 優先等級
    @Column({
        type: 'enum',
        enum: IncidentSeverity,
        default: IncidentSeverity.P3_MEDIUM,
        nullable: true,
    })
    severity: IncidentSeverity;

    // v2.1 SSOT: 通報來源
    @Column({
        type: 'enum',
        enum: IncidentSource,
        default: IncidentSource.LEGACY,
        nullable: true,
    })
    source: IncidentSource;

    // v2.1 SSOT: 地理位置
    @Column({ type: 'jsonb', nullable: true, comment: 'Location {lat, lng, address}' })
    location: { lat?: number; lng?: number; address?: string };

    // v2.1 SSOT: 行政區代碼
    @Column({ name: 'admin_code', type: 'varchar', length: 20, nullable: true })
    adminCode: string;

    @Column({ name: 'commander_id', type: 'varchar', nullable: true })
    commanderId: string;

    @Column({ name: 'commander_name', type: 'varchar', nullable: true })
    commanderName: string;

    @Column({ type: 'jsonb', nullable: true, comment: 'Mission metadata and settings' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'started_at', type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
    endedAt: Date;

    // Soft-delete support (SEC-SD.1)
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt?: Date;

    // Relations
    @OneToMany(() => MissionEvent, (event) => event.session, { cascade: true })
    events: MissionEvent[];

    @OneToMany(() => Task, (task) => task.session, { cascade: true })
    tasks: Task[];

    @OneToMany(() => InventoryTransaction, (txn) => txn.session, { cascade: true })
    inventoryTransactions: InventoryTransaction[];
}
