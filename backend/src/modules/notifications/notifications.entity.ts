import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from '../volunteers/volunteers.entity';

export type NotificationType = 'assignment' | 'mobilization' | 'reminder' | 'training' | 'system' | 'alert';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 接收者 (可選: null 為系統廣播)
    @Column({ type: 'uuid', nullable: true })
    volunteerId?: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'volunteerId' })
    volunteer?: Volunteer;

    // 通知類型
    @Column({ type: 'varchar', length: 30 })
    type: NotificationType;

    // 優先度
    @Column({ type: 'varchar', length: 20, default: 'normal' })
    priority: NotificationPriority;

    // 標題
    @Column({ type: 'varchar', length: 200 })
    title: string;

    // 內容
    @Column({ type: 'text' })
    message: string;

    // 相關連結
    @Column({ type: 'varchar', length: 500, nullable: true })
    actionUrl?: string;

    // 相關資源 ID (任務、課程等)
    @Column({ type: 'varchar', length: 100, nullable: true })
    relatedId?: string;

    // 是否已讀
    @Column({ type: 'boolean', default: false })
    isRead: boolean;

    // 已讀時間
    @Column({ type: 'timestamp', nullable: true })
    readAt?: Date;

    // 發送時間
    @CreateDateColumn()
    createdAt: Date;

    // 過期時間
    @Column({ type: 'timestamp', nullable: true })
    expiresAt?: Date;
}
