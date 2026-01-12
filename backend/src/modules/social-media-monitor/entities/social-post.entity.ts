/**
 * social-post.entity.ts
 * 
 * 社群貼文實體 - 儲存監控到的社群媒體貼文及分析結果
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'ptt' | 'line' | 'other';
export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface PostAnalysis {
    matchedKeywords: string[];
    sentiment: SentimentType;
    urgency: number;  // 1-10
    location: string | null;
}

@Entity('social_posts')
@Index(['platform'])
@Index(['urgency'])
@Index(['createdAt'])
@Index(['alertSent'])
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
