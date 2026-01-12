/**
 * social-post.entity.ts
 * 
 * v3.0: 社群貼文實體 - 含互動指標、地區、擴展分析
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'threads' | 'ptt' | 'line' | 'other';
export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface PostAnalysis {
    matchedKeywords: string[];
    sentiment: SentimentType;
    urgency: number;  // 1-10
    location: string | null;
}

// v3.0: 互動指標
export interface EngagementMetrics {
    likeCount: number;
    commentCount: number;
    shareCount: number;
    viewCount: number;
}

@Entity('social_posts')
@Index(['platform'])
@Index(['urgency'])
@Index(['createdAt'])
@Index(['alertSent'])
@Index(['location'])
@Index(['likeCount'])
export class SocialPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** 來源平台 */
    @Column({ type: 'varchar', length: 20 })
    platform: SocialPlatform;

    /** 平台原始貼文 ID */
    @Column({ name: 'external_id', type: 'varchar', nullable: true })
    externalId: string;

    /** 貼文內容 */
    @Column({ type: 'text' })
    content: string;

    /** 作者名稱 */
    @Column({ type: 'varchar', nullable: true })
    author: string;

    /** 原始貼文連結 */
    @Column({ type: 'varchar', nullable: true })
    url: string;

    /** 分析結果 */
    @Column({ type: 'jsonb', nullable: true })
    analysis: PostAnalysis;

    /** 緊急度 (冗餘欄位方便查詢) */
    @Column({ type: 'int', default: 0 })
    urgency: number;

    /** 地區 (冗餘欄位方便查詢) */
    @Column({ type: 'varchar', length: 50, nullable: true })
    location: string;

    // ===== v3.0: 互動指標 =====
    /** 按讚數 */
    @Column({ name: 'like_count', type: 'int', default: 0 })
    likeCount: number;

    /** 留言數 */
    @Column({ name: 'comment_count', type: 'int', default: 0 })
    commentCount: number;

    /** 分享數 */
    @Column({ name: 'share_count', type: 'int', default: 0 })
    shareCount: number;

    /** 瀏覽數 */
    @Column({ name: 'view_count', type: 'int', default: 0 })
    viewCount: number;

    /** 是否已發送警報 */
    @Column({ name: 'alert_sent', default: false })
    alertSent: boolean;

    /** 原始貼文時間 */
    @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
    postedAt: Date;

    /** 分析時間 */
    @Column({ name: 'analyzed_at', type: 'timestamptz', nullable: true })
    analyzedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

