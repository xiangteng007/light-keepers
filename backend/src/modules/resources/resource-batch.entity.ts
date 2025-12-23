import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from './resources.entity';
import { DonationSource } from './donation-source.entity';

/**
 * 物資批次
 * 同一物資不同批次分別追蹤 (不同過期日、不同來源)
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

    // 批次編號
    @Column({ type: 'varchar', length: 50 })
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

    // 存放位置
    @Column({ type: 'varchar', length: 200, nullable: true })
    location?: string;

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
}
