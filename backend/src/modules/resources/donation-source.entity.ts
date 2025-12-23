import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 捐贈者類型
 */
export type DonorType = 'individual' | 'company' | 'organization' | 'government' | 'anonymous';

/**
 * 捐贈來源/捐贈者
 * 追蹤物資捐贈來源
 */
@Entity('donation_sources')
export class DonationSource {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 捐贈者名稱
    @Column({ type: 'varchar', length: 200 })
    name: string;

    // 捐贈者類型
    @Column({ type: 'varchar', length: 20 })
    type: DonorType;

    // 聯絡人
    @Column({ type: 'varchar', length: 100, nullable: true })
    contactPerson?: string;

    // 聯絡電話
    @Column({ type: 'varchar', length: 50, nullable: true })
    phone?: string;

    // Email
    @Column({ type: 'varchar', length: 200, nullable: true })
    email?: string;

    // 地址
    @Column({ type: 'varchar', length: 300, nullable: true })
    address?: string;

    // 統一編號 (公司用)
    @Column({ type: 'varchar', length: 20, nullable: true })
    taxId?: string;

    // 累計捐贈次數
    @Column({ type: 'int', default: 0 })
    donationCount: number;

    // 累計捐贈價值 (估算)
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalDonationValue: number;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 是否需開立收據
    @Column({ type: 'boolean', default: false })
    needsReceipt: boolean;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
