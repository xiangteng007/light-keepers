import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToOne } from 'typeorm';
import { Role } from './role.entity';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, nullable: true, length: 255 })
    email: string;

    @Column({ unique: true, nullable: true, length: 20 })
    phone: string;

    @Column({ name: 'password_hash', length: 255 })
    passwordHash: string;

    @Column({ name: 'display_name', nullable: true, length: 100 })
    displayName: string;

    @Column({ name: 'avatar_url', type: 'text', nullable: true })
    avatarUrl: string;

    // LINE Login 綁定欄位
    @Column({ name: 'line_user_id', unique: true, nullable: true, length: 50 })
    lineUserId: string;

    @Column({ name: 'line_display_name', nullable: true, length: 100 })
    lineDisplayName: string;

    // Google Login 綁定欄位
    @Column({ name: 'google_id', unique: true, nullable: true, length: 50 })
    googleId: string;

    @Column({ name: 'google_email', nullable: true, length: 255 })
    googleEmail: string;

    // Firebase Authentication UID
    @Column({ name: 'firebase_uid', unique: true, nullable: true, length: 128 })
    firebaseUid: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // 通知偏好設定
    @Column({ name: 'pref_alert_notifications', default: true })
    prefAlertNotifications: boolean;

    @Column({ name: 'pref_task_notifications', default: true })
    prefTaskNotifications: boolean;

    @Column({ name: 'pref_training_notifications', default: true })
    prefTrainingNotifications: boolean;

    // 驗證狀態
    @Column({ name: 'phone_verified', default: false })
    phoneVerified: boolean;

    @Column({ name: 'email_verified', default: false })
    emailVerified: boolean;

    // 註冊審核
    @Column({
        name: 'approval_status',
        type: 'varchar',
        length: 20,
        default: 'pending'
    })
    approvalStatus: 'pending' | 'approved' | 'rejected';

    @Column({ name: 'approval_note', nullable: true, type: 'text' })
    approvalNote: string;

    @Column({ name: 'approved_by', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
    approvedAt: Date;

    // 志工資料完成狀態
    @Column({ name: 'volunteer_profile_completed', default: false })
    volunteerProfileCompleted: boolean;

    // FCM Push Notification Tokens (支援多裝置)
    @Column({ name: 'fcm_tokens', type: 'text', array: true, nullable: true, default: '{}' })
    fcmTokens: string[];

    // ============ Break-Glass Protocol (v3.0) ============

    // 心跳時間戳 - 用於指揮官在線狀態監控
    @Column({ name: 'last_heartbeat', type: 'timestamp', nullable: true })
    lastHeartbeat: Date;

    // 緊急接班人 - 副指揮官帳號 ID
    @Column({ name: 'emergency_successor', type: 'uuid', nullable: true })
    emergencySuccessor: string;

    // 是否啟用 Break-Glass 協議
    @Column({ name: 'break_glass_enabled', default: false })
    breakGlassEnabled: boolean;

    // Break-Glass 觸發超時時間 (分鐘)
    @Column({ name: 'break_glass_timeout_minutes', default: 15 })
    breakGlassTimeoutMinutes: number;

    @ManyToMany(() => Role)
    @JoinTable({
        name: 'account_roles',
        joinColumn: { name: 'account_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
    })
    roles: Role[];

    // ===== 新增: 志工關聯 =====
    // 一對一關聯到 Volunteer (雙向)
    // 使用 lazy loading 避免循環依賴
    @OneToOne('Volunteer', 'account')
    volunteer?: any;  // 使用 any 避免循環引用問題
}

