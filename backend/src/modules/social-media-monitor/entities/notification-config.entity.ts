/**
 * notification-config.entity.ts
 * 
 * v3.0: 通知配置實體 - 管理各頻道通知設定
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export type NotificationChannel = 'email' | 'telegram' | 'line' | 'slack' | 'webhook';

export interface TelegramConfig {
    botToken: string;
    chatId: string;
}

export interface LineNotifyConfig {
    accessToken: string;
}

export interface EmailConfig {
    recipients: string[];
    smtpHost?: string;
    smtpPort?: number;
}

export interface WebhookConfig {
    url: string;
    headers?: Record<string, string>;
}

export interface SlackConfig {
    webhookUrl: string;
    channel?: string;
}

@Entity('notification_configs')
export class NotificationConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** 頻道名稱 */
    @Column({ type: 'varchar', length: 50 })
    name: string;

    /** 頻道類型 */
    @Column({ type: 'varchar', length: 20 })
    channel: NotificationChannel;

    /** 是否啟用 */
    @Column({ default: true })
    enabled: boolean;

    /** 最低緊急度 (只有 >= 此值才發送) */
    @Column({ name: 'min_urgency', type: 'int', default: 7 })
    minUrgency: number;

    /** 頻道配置 (JSON) */
    @Column({ type: 'jsonb' })
    config: TelegramConfig | LineNotifyConfig | EmailConfig | WebhookConfig | SlackConfig;

    /** 篩選平台 (空 = 全部) */
    @Column({ type: 'simple-array', nullable: true })
    platforms: string[];

    /** 篩選關鍵字 (空 = 全部) */
    @Column({ type: 'simple-array', nullable: true })
    keywords: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
