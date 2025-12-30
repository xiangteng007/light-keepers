import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from '../volunteers.entity';

// 保險類型
export type InsuranceType = 'personal' | 'group' | 'task_specific';

@Entity('volunteer_insurance')
export class VolunteerInsurance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工
    @Column({ name: 'volunteer_id', type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: Volunteer;

    // 保險類型
    @Column({ name: 'insurance_type', type: 'varchar', length: 30 })
    insuranceType: InsuranceType;

    // 保險公司
    @Column({ name: 'insurance_company', type: 'varchar', length: 200 })
    insuranceCompany: string;

    // 保單編號
    @Column({ name: 'policy_number', type: 'varchar', length: 100, nullable: true })
    policyNumber?: string;

    // 保障類型說明
    @Column({ name: 'coverage_type', type: 'varchar', length: 200, nullable: true })
    coverageType?: string;

    // 保障金額
    @Column({ name: 'coverage_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
    coverageAmount?: number;

    // 生效日
    @Column({ name: 'valid_from', type: 'date' })
    validFrom: Date;

    // 到期日
    @Column({ name: 'valid_to', type: 'date' })
    validTo: Date;

    // 涵蓋任務類型 (training/standby/emergency/operation)
    @Column({ name: 'covers_tasks', type: 'simple-array', nullable: true })
    coversTasks?: string[];

    // 是否有效
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    // 保單檔案
    @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
    fileUrl?: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 建立者
    @Column({ name: 'created_by', type: 'uuid', nullable: true })
    createdBy?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
