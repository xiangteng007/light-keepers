import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Donation } from './donation.entity';

export type ReceiptStatus = 'issued' | 'cancelled' | 'reissued';

@Entity('receipts')
export class Receipt {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    donationId: string;

    @OneToOne(() => Donation, donation => donation.receipt)
    @JoinColumn({ name: 'donationId' })
    donation: Donation;

    // 收據編號 (格式: LK-2024-000001)
    @Column({ type: 'varchar', length: 50, unique: true })
    receiptNo: string;

    @Column({ type: 'varchar', length: 20, default: 'issued' })
    status: ReceiptStatus;

    // 收據內容
    @Column({ type: 'varchar', length: 100 })
    donorName: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    donorIdentity: string; // 身分證後四碼或統編

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    purpose: string;

    // 開立日期
    @Column({ type: 'timestamp' })
    issuedAt: Date;

    // 作廢資訊
    @Column({ type: 'timestamp', nullable: true })
    cancelledAt: Date;

    @Column({ type: 'text', nullable: true })
    cancelReason: string;

    // 補發資訊
    @Column({ type: 'varchar', length: 50, nullable: true })
    originalReceiptNo: string; // 原收據編號 (補發時)

    // PDF 連結
    @Column({ type: 'text', nullable: true })
    pdfUrl: string;

    // 年度 (用於年度收據查詢)
    @Column({ type: 'int' })
    year: number;

    @CreateDateColumn()
    createdAt: Date;
}
