import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from '../volunteers.entity';
import { EncryptedColumnTransformer } from '../../../common/crypto.util';

// 證照類型
export type CertificateType = 'id_card' | 'rescue_license' | 'medical' | 'driver' | 'drone' | 'diving' | 'emt' | 'other';

@Entity('volunteer_certificates')
export class VolunteerCertificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工
    @Column({ name: 'volunteer_id', type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: Volunteer;

    // 證照類型
    @Column({ name: 'certificate_type', type: 'varchar', length: 50 })
    certificateType: CertificateType;

    // 證照名稱
    @Column({ name: 'certificate_name', type: 'varchar', length: 200 })
    certificateName: string;

    // 🔐 證照編號 - 加密儲存 (高敏感)
    @Column({
        name: 'certificate_number',
        type: 'varchar',
        length: 500,
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    certificateNumber?: string;

    // 發照日期
    @Column({ name: 'issued_at', type: 'date', nullable: true })
    issuedAt?: Date;

    // 到期日期
    @Column({ name: 'expires_at', type: 'date', nullable: true })
    expiresAt?: Date;

    // 發照機關
    @Column({ name: 'issuer', type: 'varchar', length: 200, nullable: true })
    issuer?: string;

    // 檔案 URL
    @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
    fileUrl?: string;

    // 已驗證
    @Column({ type: 'boolean', default: false })
    verified: boolean;

    // 驗證人
    @Column({ name: 'verified_by', type: 'uuid', nullable: true })
    verifiedBy?: string;

    // 驗證時間
    @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
    verifiedAt?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
