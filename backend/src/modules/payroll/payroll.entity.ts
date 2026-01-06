import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('payroll_records')
@Index(['volunteerId', 'year', 'month'])
export class PayrollRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    volunteerId: string;

    @Column({ type: 'varchar', length: 100 })
    volunteerName: string;

    @Column({ type: 'int' })
    year: number;

    @Column({ type: 'int' })
    month: number;

    @Column({ type: 'int', default: 0 })
    shiftCount: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
    totalHours: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    basePay: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    nightBonus: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    holidayBonus: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    hazardBonus: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    transportAllowance: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    mealAllowance: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    otherAllowance: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    deductions: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: 'pending' | 'approved' | 'paid' | 'rejected';

    @Column({ type: 'date', nullable: true })
    approvedAt: Date;

    @Column({ type: 'varchar', length: 100, nullable: true })
    approvedBy: string;

    @Column({ type: 'date', nullable: true })
    paidAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
