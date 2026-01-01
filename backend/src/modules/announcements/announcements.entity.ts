import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Account } from '../accounts/entities';

export type AnnouncementCategory = 'disaster' | 'event' | 'training' | 'maintenance' | 'general';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementPriority = 'normal' | 'high' | 'urgent';

@Entity('announcements')
export class Announcement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ===== 基本資訊 =====

    @Column({ type: 'varchar', length: 200 })
    title: string;

    @Column({ type: 'text' })
    content: string;

    // 摘要（用於列表顯示）
    @Column({ type: 'varchar', length: 500, nullable: true })
    summary?: string;

    // ===== 分類與狀態 =====

    @Column({ type: 'varchar', length: 20, default: 'general' })
    category: AnnouncementCategory;

    @Column({ type: 'varchar', length: 20, default: 'draft' })
    status: AnnouncementStatus;

    @Column({ type: 'varchar', length: 20, default: 'normal' })
    priority: AnnouncementPriority;

    // ===== 置頂與排序 =====

    @Column({ type: 'boolean', default: false })
    isPinned: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    // ===== 發布時間控制 =====

    @Column({ type: 'timestamp', nullable: true })
    publishAt?: Date;

    @Column({ type: 'timestamp', nullable: true })
    expireAt?: Date;

    // ===== 附件 =====

    @Column({ type: 'simple-array', nullable: true })
    attachments?: string[];

    // 封面圖片
    @Column({ type: 'varchar', length: 500, nullable: true })
    coverImage?: string;

    // ===== 標籤 =====

    @Column({ type: 'simple-array', nullable: true })
    tags?: string[];

    // ===== 發布者 =====

    @Column({ type: 'uuid' })
    authorId: string;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'authorId' })
    author: Account;

    @Column({ type: 'varchar', length: 100, nullable: true })
    authorName?: string;

    // ===== 統計 =====

    @Column({ type: 'int', default: 0 })
    viewCount: number;

    // ===== 通知設定 =====

    // 是否發送推播通知
    @Column({ type: 'boolean', default: false })
    sendNotification: boolean;

    // 是否已發送通知
    @Column({ type: 'boolean', default: false })
    notificationSent: boolean;

    // ===== 時間戳記 =====

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // 實際發布時間
    @Column({ type: 'timestamp', nullable: true })
    publishedAt?: Date;
}
