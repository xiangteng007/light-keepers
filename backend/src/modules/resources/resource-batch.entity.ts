import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from './resources.entity';
import { DonationSource } from './donation-source.entity';

export type BatchStatus = 'active' | 'depleted' | 'expired';

/**
 * 物資批次（統一版）
 * 整合原 ResourceBatch + Lot 功能
 * - 一般物資：追蹤批次來源、效期
 * - 管制/醫療物資：額外追蹤 QR Code、批號、倉庫/儲位、列印記錄
 */
@Entity('resource_batches')
export class ResourceBatch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 關聯主物資
    @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'resource_id' })
    resource: Resource;

    @Column({ type: 'uuid' })
    resourceId: string;

    // 批次編號 (= 原 Lot.lotNumber)
    @Column({ type: 'varchar', length: 100 })
    batchNo: string;

    // 批次數量
    @Column({ type: 'int', default: 0 })
    quantity: number;

    // 過期日期
    @Column({ type: 'date', nullable: true })
    expiresAt?: Date;

    // 生產日期
    @Column({ type: 'date', nullable: true })
    manufacturedAt?: Date;

    // 捐贈來源 (可選)
    @ManyToOne(() => DonationSource, { nullable: true })
    @JoinColumn({ name: 'donation_source_id' })
    donationSource?: DonationSource;

    @Column({ type: 'uuid', nullable: true })
    donationSourceId?: string;

    // 單價 (估算)
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    unitPrice?: number;

    // 存放位置 (文字描述)
    @Column({ type: 'varchar', length: 200, nullable: true })
    location?: string;

    // === 從 Lot 合併的欄位 ===

    // 🔐 QR Code 內容（ORG|LOT|{batchId}|{checksum}）
    @Column({ type: 'varchar', length: 200, nullable: true })
    qrValue?: string;

    // 倉庫 ID
    @Column({ type: 'uuid', nullable: true })
    warehouseId?: string;

    // 儲位 ID
    @Column({ type: 'uuid', nullable: true })
    storageLocationId?: string;

    // 批次狀態
    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: BatchStatus;

    // 🏷️ 已列印貼紙數
    @Column({ type: 'int', default: 0 })
    labelsPrinted: number;

    // 🏷️ 最後列印批次 ID
    @Column({ type: 'uuid', nullable: true })
    lastPrintBatchId?: string;

    // === 原有欄位 ===

    // QR Code / 條碼
    @Column({ type: 'varchar', length: 100, nullable: true })
    barcode?: string;

    // 照片 URL
    @Column({ type: 'varchar', length: 500, nullable: true })
    photoUrl?: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 入庫時間
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
