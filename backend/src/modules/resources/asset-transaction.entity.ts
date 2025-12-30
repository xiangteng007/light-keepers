import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Asset } from './asset.entity';
import { StorageLocation } from './storage-location.entity';

export type AssetTransactionType = 'borrow' | 'return' | 'transfer' | 'maintenance_in' | 'maintenance_out' | 'dispose' | 'report_lost';

/**
 * 資產借出/歸還紀錄
 */
@Entity('asset_transactions')
export class AssetTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 關聯資產
    @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'asset_id' })
    asset: Asset;

    @Column({ type: 'uuid' })
    assetId: string;

    // 交易類型
    @Column({ type: 'varchar', length: 30 })
    type: AssetTransactionType;

    // 借用人姓名 (敏感)
    @Column({ type: 'varchar', length: 100, nullable: true })
    borrowerName?: string;

    // 借用單位 (敏感)
    @Column({ type: 'varchar', length: 200, nullable: true })
    borrowerOrg?: string;

    // 借用人聯絡方式 (敏感)
    @Column({ type: 'varchar', length: 100, nullable: true })
    borrowerContact?: string;

    // 用途
    @Column({ type: 'text', nullable: true })
    purpose?: string;

    // 預計歸還日
    @Column({ type: 'date', nullable: true })
    expectedReturnDate?: Date;

    // 實際歸還日
    @Column({ type: 'date', nullable: true })
    actualReturnDate?: Date;

    // 歸還時狀態
    @Column({ type: 'varchar', length: 30, nullable: true })
    returnCondition?: string;

    // 損壞/缺件備註 (敏感)
    @Column({ type: 'text', nullable: true })
    conditionNote?: string;

    // 從儲位
    @ManyToOne(() => StorageLocation, { nullable: true })
    @JoinColumn({ name: 'from_location_id' })
    fromLocation?: StorageLocation;

    @Column({ type: 'uuid', nullable: true })
    fromLocationId?: string;

    // 到儲位
    @ManyToOne(() => StorageLocation, { nullable: true })
    @JoinColumn({ name: 'to_location_id' })
    toLocation?: StorageLocation;

    @Column({ type: 'uuid', nullable: true })
    toLocationId?: string;

    // 操作人
    @Column({ type: 'varchar', length: 100 })
    operatorName: string;

    @Column({ type: 'uuid', nullable: true })
    operatorId?: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 附件 (敏感)
    @Column({ type: 'simple-array', nullable: true })
    attachments?: string[];

    @CreateDateColumn()
    createdAt: Date;
}
