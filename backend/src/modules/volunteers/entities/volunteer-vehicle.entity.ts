import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from '../volunteers.entity';
import { EncryptedColumnTransformer } from '../../../common/crypto.util';

// 車輛類型
export type VehicleType = 'car' | 'motorcycle' | 'boat' | 'atv' | 'truck' | 'other';

// 車輛用途
export type VehiclePurpose = 'rescue' | 'transport' | 'towing' | 'patrol' | 'other';

@Entity('volunteer_vehicles')
export class VolunteerVehicle {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工
    @Column({ name: 'volunteer_id', type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: Volunteer;

    // 🔐 車牌 - 加密儲存 (高敏感)
    @Column({
        name: 'license_plate',
        type: 'varchar',
        length: 500,
        transformer: EncryptedColumnTransformer
    })
    licensePlate: string;

    // 車輛類型
    @Column({ name: 'vehicle_type', type: 'varchar', length: 30 })
    vehicleType: VehicleType;

    // 廠牌
    @Column({ type: 'varchar', length: 100, nullable: true })
    brand?: string;

    // 型號
    @Column({ type: 'varchar', length: 100, nullable: true })
    model?: string;

    // 排氣量 (cc)
    @Column({ name: 'engine_cc', type: 'int', nullable: true })
    engineCc?: number;

    // 顏色
    @Column({ type: 'varchar', length: 50, nullable: true })
    color?: string;

    // 車輛用途 (多選)
    @Column({ name: 'purposes', type: 'simple-array', nullable: true })
    purposes?: VehiclePurpose[];

    // 特殊改裝說明
    @Column({ type: 'text', nullable: true })
    modifications?: string;

    // 保險公司
    @Column({ name: 'insurance_company', type: 'varchar', length: 200, nullable: true })
    insuranceCompany?: string;

    // 保單編號
    @Column({ name: 'insurance_policy_no', type: 'varchar', length: 100, nullable: true })
    insurancePolicyNo?: string;

    // 保險到期日
    @Column({ name: 'insurance_expires_at', type: 'date', nullable: true })
    insuranceExpiresAt?: Date;

    // 車輛照片
    @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
    photoUrl?: string;

    // 是否可用
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
