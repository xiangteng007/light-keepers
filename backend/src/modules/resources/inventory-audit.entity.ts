import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { StorageLocation } from './storage-location.entity';

export type AuditType = 'consumable' | 'asset';
export type AuditStatus = 'in_progress' | 'completed' | 'cancelled';

/**
 * 盤點作業
 */
@Entity('inventory_audits')
export class InventoryAudit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 盤點類型
    @Column({ type: 'varchar', length: 20 })
    type: AuditType;

    // 狀態
    @Column({ type: 'varchar', length: 20, default: 'in_progress' })
    status: AuditStatus;

    // 盤點倉庫 (可選，null 表示全倉)
    @ManyToOne(() => Warehouse, { nullable: true })
    @JoinColumn({ name: 'warehouse_id' })
    warehouse?: Warehouse;

    @Column({ type: 'uuid', nullable: true })
    warehouseId?: string;

    // 盤點儲位 (可選，null 表示整倉)
    @ManyToOne(() => StorageLocation, { nullable: true })
    @JoinColumn({ name: 'location_id' })
    location?: StorageLocation;

    @Column({ type: 'uuid', nullable: true })
    locationId?: string;

    // 盤點項目 JSON [{itemId, itemName, systemQty, actualQty, difference, notes}]
    @Column({ type: 'text', nullable: true })
    items?: string;

    // 資產盤點清單 (資產盤點用)
    // JSON [{assetId, assetNo, scanned, missingNote}]
    @Column({ type: 'text', nullable: true })
    assets?: string;

    // 盤點人
    @Column({ type: 'varchar', length: 100 })
    auditorName: string;

    @Column({ type: 'uuid', nullable: true })
    auditorId?: string;

    // 審核人
    @Column({ type: 'varchar', length: 100, nullable: true })
    reviewerName?: string;

    @Column({ type: 'uuid', nullable: true })
    reviewerId?: string;

    // 差異數量統計
    @Column({ type: 'int', default: 0 })
    gainCount: number;

    @Column({ type: 'int', default: 0 })
    lossCount: number;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 開始時間
    @Column({ type: 'timestamp', nullable: true })
    startedAt?: Date;

    // 完成時間
    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
