import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Warehouse } from './warehouse.entity';

/**
 * 儲位
 * 階層式儲位結構：倉庫 → 區 → 架 → 層 → 格
 */
@Entity('storage_locations')
export class StorageLocation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 所屬倉庫
    @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'warehouse_id' })
    warehouse: Warehouse;

    @Column({ type: 'uuid' })
    warehouseId: string;

    // 區域 (A/B/C...)
    @Column({ type: 'varchar', length: 20 })
    zone: string;

    // 架號
    @Column({ type: 'varchar', length: 20 })
    rack: string;

    // 層號
    @Column({ type: 'varchar', length: 20 })
    level: string;

    // 格位 (左/中/右 或 1/2/3)
    @Column({ type: 'varchar', length: 20, nullable: true })
    position?: string;

    // 完整路徑 (自動計算，用於顯示)
    @Column({ type: 'varchar', length: 100 })
    fullPath: string;

    // 儲位條碼
    @Column({ type: 'varchar', length: 100, nullable: true })
    barcode?: string;

    // 儲位容量 (可選)
    @Column({ type: 'int', nullable: true })
    capacity?: number;

    // 是否啟用
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
