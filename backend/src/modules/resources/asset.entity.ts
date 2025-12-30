import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from './resources.entity';
import { StorageLocation } from './storage-location.entity';

export type AssetStatus = 'in_stock' | 'borrowed' | 'maintenance' | 'disposed' | 'lost';

/**
 * 資產/器材
 * 高單價設備，需單件追蹤
 */
@Entity('assets')
export class Asset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 關聯品項
    @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'item_id' })
    item: Resource;

    @Column({ type: 'uuid' })
    itemId: string;

    // 資產編號 (唯一)
    @Column({ type: 'varchar', length: 50, unique: true })
    assetNo: string;

    // 序號 (可選)
    @Column({ type: 'varchar', length: 100, nullable: true })
    serialNo?: string;

    // 資產條碼
    @Column({ type: 'varchar', length: 100, nullable: true })
    barcode?: string;

    // 狀態
    @Column({ type: 'varchar', length: 20, default: 'in_stock' })
    status: AssetStatus;

    // 所在儲位 (在庫時)
    @ManyToOne(() => StorageLocation, { nullable: true })
    @JoinColumn({ name: 'location_id' })
    location?: StorageLocation;

    @Column({ type: 'uuid', nullable: true })
    locationId?: string;

    // 借用人姓名 (敏感)
    @Column({ type: 'varchar', length: 100, nullable: true })
    borrowerName?: string;

    // 借用單位 (敏感)
    @Column({ type: 'varchar', length: 200, nullable: true })
    borrowerOrg?: string;

    // 借用人聯絡方式 (敏感)
    @Column({ type: 'varchar', length: 100, nullable: true })
    borrowerContact?: string;

    // 借出日期
    @Column({ type: 'date', nullable: true })
    borrowDate?: Date;

    // 預計歸還日期
    @Column({ type: 'date', nullable: true })
    expectedReturnDate?: Date;

    // 借用用途
    @Column({ type: 'text', nullable: true })
    borrowPurpose?: string;

    // 歸還狀態 (normal/damaged/missing_parts/needs_repair)
    @Column({ type: 'varchar', length: 30, nullable: true })
    returnCondition?: string;

    // 損壞備註 (敏感)
    @Column({ type: 'text', nullable: true })
    damageNote?: string;

    // 照片 (敏感)
    @Column({ type: 'simple-array', nullable: true })
    attachments?: string[];

    // 內部備註 (敏感)
    @Column({ type: 'text', nullable: true })
    internalNote?: string;

    // 購入日期
    @Column({ type: 'date', nullable: true })
    purchaseDate?: Date;

    // 單價 (敏感)
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    unitPrice?: number;

    // 保固到期日
    @Column({ type: 'date', nullable: true })
    warrantyExpiry?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
