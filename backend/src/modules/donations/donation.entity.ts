import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Donor } from './donor.entity';
import { Receipt } from './receipt.entity';

export type PaymentMethod = 'credit_card' | 'atm' | 'cvs' | 'line_pay' | 'bank_transfer' | 'cash' | 'other';
export type DonationStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export type DonationType = 'one_time' | 'recurring';

@Entity('donations')
export class Donation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    donorId: string;

    @ManyToOne(() => Donor, donor => donor.donations)
    @JoinColumn({ name: 'donorId' })
    donor: Donor;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'varchar', length: 20 })
    paymentMethod: PaymentMethod;

    @Column({ type: 'varchar', length: 20, default: 'one_time' })
    donationType: DonationType;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: DonationStatus;

    // 捐款專案/用途
    @Column({ type: 'varchar', length: 100, nullable: true })
    projectName: string;

    @Column({ type: 'text', nullable: true })
    purpose: string; // 用途說明

    // 付款資訊
    @Column({ type: 'varchar', length: 100, nullable: true })
    transactionId: string; // 金流交易編號

    @Column({ type: 'varchar', length: 50, nullable: true })
    merchantTradeNo: string; // 商家訂單編號

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    // 收據
    @Column({ type: 'uuid', nullable: true })
    receiptId: string;

    @OneToOne(() => Receipt, receipt => receipt.donation)
    receipt: Receipt;

    @Column({ type: 'text', nullable: true })
    notes: string; // 捐款人留言

    // 定期捐款相關
    @Column({ type: 'uuid', nullable: true })
    recurringDonationId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
