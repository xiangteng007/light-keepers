import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Volunteer } from '../volunteers.entity';
import { Account } from '../../accounts/entities/account.entity';

export type RecognitionType = 'badge' | 'certificate' | 'award' | 'milestone' | 'special';
export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// ===== 徽章定義 =====
@Entity('volunteer_badges')
export class VolunteerBadge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 徽章代碼
    @Column({ type: 'varchar', length: 50, unique: true })
    code: string;

    // 徽章名稱
    @Column({ type: 'varchar', length: 100 })
    name: string;

    // 描述
    @Column({ type: 'text', nullable: true })
    description?: string;

    // 圖示 (emoji 或 URL)
    @Column({ type: 'varchar', length: 200, nullable: true })
    icon?: string;

    // 等級
    @Column({ type: 'varchar', length: 20, default: 'bronze' })
    level: BadgeLevel;

    // 獲得條件（JSON）
    @Column({ type: 'text', nullable: true })
    criteria?: string;

    // 積分價值
    @Column({ type: 'int', default: 0 })
    pointValue: number;

    // 是否啟用
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // 排序
    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// ===== 志工獲得的徽章 =====
@Entity('volunteer_earned_badges')
export class VolunteerEarnedBadge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteerId' })
    volunteer: Volunteer;

    @Column({ type: 'uuid' })
    badgeId: string;

    @ManyToOne(() => VolunteerBadge, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'badgeId' })
    badge: VolunteerBadge;

    // 獲得日期
    @Column({ type: 'timestamp' })
    earnedAt: Date;

    // 頒發原因
    @Column({ type: 'text', nullable: true })
    reason?: string;

    // 頒發者
    @Column({ type: 'uuid', nullable: true })
    awardedBy?: string;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'awardedBy' })
    awarder?: Account;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

// ===== 表揚記錄 =====
@Entity('volunteer_recognitions')
export class VolunteerRecognition {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteerId' })
    volunteer: Volunteer;

    // 表揚類型
    @Column({ type: 'varchar', length: 20 })
    type: RecognitionType;

    // 標題
    @Column({ type: 'varchar', length: 200 })
    title: string;

    // 描述
    @Column({ type: 'text', nullable: true })
    description?: string;

    // 年度
    @Column({ type: 'int', nullable: true })
    year?: number;

    // 月份（月度表揚）
    @Column({ type: 'int', nullable: true })
    month?: number;

    // 證書編號
    @Column({ type: 'varchar', length: 50, nullable: true })
    certificateNumber?: string;

    // 獎項/里程碑數值
    @Column({ type: 'int', nullable: true })
    milestoneValue?: number;

    // 關聯徽章
    @Column({ type: 'uuid', nullable: true })
    badgeId?: string;

    @ManyToOne(() => VolunteerBadge, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'badgeId' })
    badge?: VolunteerBadge;

    // 是否公開顯示
    @Column({ type: 'boolean', default: true })
    isPublic: boolean;

    // 頒發者
    @Column({ type: 'uuid', nullable: true })
    awardedBy?: string;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'awardedBy' })
    awarder?: Account;

    // 頒發日期
    @Column({ type: 'timestamp' })
    awardedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

// ===== 里程碑定義 =====
export const MILESTONES = {
    HOURS_10: { hours: 10, badge: 'hours_10', title: '服務新星', points: 50 },
    HOURS_50: { hours: 50, badge: 'hours_50', title: '熱心志工', points: 100 },
    HOURS_100: { hours: 100, badge: 'hours_100', title: '資深志工', points: 200 },
    HOURS_500: { hours: 500, badge: 'hours_500', title: '傑出志工', points: 500 },
    HOURS_1000: { hours: 1000, badge: 'hours_1000', title: '榮譽志工', points: 1000 },
    TASKS_10: { tasks: 10, badge: 'tasks_10', title: '任務新手', points: 30 },
    TASKS_50: { tasks: 50, badge: 'tasks_50', title: '任務達人', points: 150 },
    TASKS_100: { tasks: 100, badge: 'tasks_100', title: '任務專家', points: 300 },
};
