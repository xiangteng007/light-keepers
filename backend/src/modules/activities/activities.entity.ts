import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Account } from '../accounts/entities/account.entity';

export type ActivityCategory = 'training' | 'community' | 'drill' | 'volunteer' | 'other';
export type ActivityStatus = 'draft' | 'open' | 'closed' | 'cancelled' | 'completed';
export type RegistrationStatus = 'pending' | 'confirmed' | 'waitlist' | 'cancelled' | 'attended';

// ===== 活動實體 =====
@Entity('activities')
export class Activity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ===== 基本資訊 =====

    @Column({ type: 'varchar', length: 200 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    summary?: string;

    @Column({ type: 'varchar', length: 20, default: 'other' })
    category: ActivityCategory;

    // ===== 時間 =====

    @Column({ type: 'timestamp' })
    startAt: Date;

    @Column({ type: 'timestamp' })
    endAt: Date;

    // 報名截止時間
    @Column({ type: 'timestamp', nullable: true })
    registrationDeadline?: Date;

    // ===== 地點 =====

    @Column({ type: 'varchar', length: 500, nullable: true })
    location?: string;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    latitude?: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    longitude?: number;

    // 線上活動連結
    @Column({ type: 'varchar', length: 500, nullable: true })
    onlineUrl?: string;

    // ===== 報名設定 =====

    // 最大報名人數
    @Column({ type: 'int', default: 0 })
    maxParticipants: number;

    // 目前報名人數
    @Column({ type: 'int', default: 0 })
    currentParticipants: number;

    // 候補人數上限
    @Column({ type: 'int', default: 0 })
    waitlistLimit: number;

    // 需要審核
    @Column({ type: 'boolean', default: false })
    requireApproval: boolean;

    // ===== 狀態 =====

    @Column({ type: 'varchar', length: 20, default: 'draft' })
    status: ActivityStatus;

    // ===== 主辦資訊 =====

    @Column({ type: 'uuid' })
    organizerId: string;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'organizerId' })
    organizer: Account;

    @Column({ type: 'varchar', length: 100, nullable: true })
    organizerName?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    contactPhone?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    contactEmail?: string;

    // ===== 附加資訊 =====

    @Column({ type: 'varchar', length: 500, nullable: true })
    coverImage?: string;

    @Column({ type: 'simple-array', nullable: true })
    tags?: string[];

    // 備註（內部用）
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // ===== 時間戳記 =====

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// ===== 報名記錄實體 =====
@Entity('activity_registrations')
export class ActivityRegistration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ===== 關聯 =====

    @Column({ type: 'uuid' })
    activityId: string;

    @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'activityId' })
    activity: Activity;

    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => Account, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: Account;

    // ===== 報名資訊 =====

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: RegistrationStatus;

    @Column({ type: 'varchar', length: 100 })
    userName: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    userPhone?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    userEmail?: string;

    // 報名備註
    @Column({ type: 'text', nullable: true })
    remarks?: string;

    // ===== 審核 =====

    @Column({ type: 'uuid', nullable: true })
    reviewedBy?: string;

    @Column({ type: 'timestamp', nullable: true })
    reviewedAt?: Date;

    @Column({ type: 'text', nullable: true })
    reviewNote?: string;

    // ===== 出席 =====

    @Column({ type: 'boolean', default: false })
    attended: boolean;

    @Column({ type: 'timestamp', nullable: true })
    attendedAt?: Date;

    // 候補順位
    @Column({ type: 'int', nullable: true })
    waitlistPosition?: number;

    // ===== 時間戳記 =====

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
