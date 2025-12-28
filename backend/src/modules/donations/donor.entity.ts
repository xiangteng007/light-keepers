import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Donation } from './donation.entity';

export type DonorType = 'individual' | 'corporate';

@Entity('donors')
export class Donor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 20 })
    type: DonorType; // 個人 or 企業

    @Column({ type: 'varchar', length: 100 })
    name: string; // 姓名 or 公司名稱

    @Column({ type: 'varchar', length: 100, nullable: true })
    email: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    // 身分證字號 (個人) - 加密儲存
    @Column({ type: 'varchar', length: 255, nullable: true })
    identityNumber: string;

    // 統一編號 (企業)
    @Column({ type: 'varchar', length: 20, nullable: true })
    taxId: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'boolean', default: false })
    isAnonymous: boolean; // 匿名捐款

    @Column({ type: 'boolean', default: true })
    wantsReceipt: boolean; // 是否需要收據

    @Column({ type: 'boolean', default: false })
    wantsEmailReceipt: boolean; // 電子收據

    // 關聯帳號 (如果有登入)
    @Column({ type: 'uuid', nullable: true })
    accountId: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @OneToMany(() => Donation, donation => donation.donor)
    donations: Donation[];

    // 統計
    @Column({ type: 'int', default: 0 })
    totalDonationCount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalDonationAmount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
