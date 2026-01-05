import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { EncryptedColumnTransformer } from '../../common/crypto.util';

// 志工狀態
export type VolunteerStatus = 'available' | 'busy' | 'offline';

// 審核狀態
export type VolunteerApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// 性別
export type Gender = 'male' | 'female' | 'other';

@Entity('volunteers')
export class Volunteer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工編號 (審核通過後系統自動產生)
    @Column({ name: 'volunteer_code', type: 'varchar', length: 20, nullable: true, unique: true })
    volunteerCode?: string;

    // 關聯帳號 ID
    @Column({ name: 'account_id', type: 'uuid', nullable: true })
    accountId?: string;

    // ===== 新增: 帳號關聯 =====
    // 一對一關聯到 Account (雙向)
    // 使用 lazy loading 避免循環依賴
    @OneToOne('Account', 'volunteer')
    @JoinColumn({ name: 'account_id' })
    account?: any;  // 使用 any 避免循環引用問題

    // ===== 基本資料 =====

    // 姓名
    @Column({ type: 'varchar', length: 100 })
    name: string;

    // 🔐 身分證字號 - 加密儲存 (高敏感)
    @Column({
        name: 'id_number',
        type: 'varchar',
        length: 500,
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    idNumber?: string;

    // 生日
    @Column({ name: 'birth_date', type: 'date', nullable: true })
    birthDate?: Date;

    // 性別
    @Column({ type: 'varchar', length: 10, nullable: true })
    gender?: Gender;

    // 🔐 手機 - 加密儲存
    @Column({
        type: 'varchar',
        length: 500,
        transformer: EncryptedColumnTransformer
    })
    phone: string;

    // Email
    @Column({ type: 'varchar', length: 200, nullable: true })
    email?: string;

    // 所在區域
    @Column({ type: 'varchar', length: 100 })
    region: string;

    // 🔐 詳細地址 - 加密儲存 (高敏感)
    @Column({
        type: 'varchar',
        length: 1000,
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    address?: string;

    // ===== 緊急聯絡人 =====

    // 🔐 緊急聯絡人姓名
    @Column({
        name: 'emergency_contact_name',
        type: 'varchar',
        length: 500,
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    emergencyContactName?: string;

    // 🔐 緊急聯絡電話
    @Column({
        name: 'emergency_contact_phone',
        type: 'varchar',
        length: 500,
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    emergencyContactPhone?: string;

    // 緊急聯絡人關係
    @Column({ name: 'emergency_contact_relation', type: 'varchar', length: 50, nullable: true })
    emergencyContactRelation?: string;

    // ===== 專長與服務 =====

    // 技能標籤 (簡化版，詳細用 VolunteerSkill)
    @Column({ type: 'simple-array', nullable: true })
    skills: string[];

    // 🔐 健康/體能備註 - 加密儲存 (高敏感)
    @Column({
        name: 'health_notes',
        type: 'text',
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    healthNotes?: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 📷 志工照片 URL
    @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
    photoUrl?: string;

    // ===== 統計 =====

    // 累計服務時數
    @Column({ name: 'service_hours', type: 'decimal', precision: 10, scale: 2, default: 0 })
    serviceHours: number;

    // 累計積分
    @Column({ name: 'total_points', type: 'int', default: 0 })
    totalPoints: number;

    // 累計任務數
    @Column({ name: 'task_count', type: 'int', default: 0 })
    taskCount: number;

    // ===== 社群綁定 =====

    // LINE User ID
    @Column({ name: 'line_user_id', type: 'varchar', length: 100, nullable: true })
    lineUserId?: string;

    // ===== 個資同意 =====

    // 個資同意書已勾選
    @Column({ name: 'privacy_consent', type: 'boolean', default: false })
    privacyConsent: boolean;

    // 個資同意時間
    @Column({ name: 'privacy_consent_at', type: 'timestamp', nullable: true })
    privacyConsentAt?: Date;

    // ===== 可用狀態 =====

    @Column({ type: 'varchar', length: 20, default: 'available' })
    status: VolunteerStatus;

    // ===== 審核狀態 =====

    @Column({
        name: 'approval_status',
        type: 'varchar',
        length: 20,
        default: 'pending'
    })
    approvalStatus: VolunteerApprovalStatus;

    // 審核備註
    @Column({ name: 'approval_note', type: 'text', nullable: true })
    approvalNote?: string;

    // 審核人
    @Column({ name: 'approved_by', type: 'uuid', nullable: true })
    approvedBy?: string;

    // 審核時間
    @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
    approvedAt?: Date;

    // ===== 時間戳記 =====

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
