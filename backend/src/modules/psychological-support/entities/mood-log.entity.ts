/**
 * 心情記錄實體 (Mood Log Entity)
 * 模組 C: 心理韌性與支持
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum MoodTag {
    FATIGUE = 'fatigue',       // 疲勞
    SADNESS = 'sadness',       // 悲傷
    ANGER = 'anger',           // 憤怒
    ANXIETY = 'anxiety',       // 焦慮
    CALM = 'calm',             // 平靜
    HOPEFUL = 'hopeful',       // 希望
    OVERWHELMED = 'overwhelmed', // 不堪負荷
    GRATEFUL = 'grateful',     // 感恩
}

@Entity('mood_logs')
export class MoodLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @Column({ type: 'int' })
    score: number; // 1-10

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ nullable: true })
    note: string;

    @Column({ nullable: true })
    taskId: string; // 關聯任務 ID

    @Column({ default: false })
    isAlertTriggered: boolean; // 是否已觸發預警

    @CreateDateColumn()
    createdAt: Date;
}

// 祈福牆留言
@Entity('blessing_wall')
export class BlessingMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    userId: string;

    @Column()
    displayName: string;

    @Column()
    message: string;

    @Column({ default: 'candle' })
    iconType: string; // candle, heart, star, prayer

    @Column({ type: 'int', default: 0 })
    likes: number;

    @Column({ default: true })
    isVisible: boolean;

    @CreateDateColumn()
    createdAt: Date;
}

// AI 對話記錄
@Entity('pfa_chat_logs')
export class PFAChatLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @Column()
    sessionId: string;

    @Column({ type: 'text' })
    userMessage: string;

    @Column({ type: 'text' })
    botResponse: string;

    @Column({ type: 'json', nullable: true })
    sentiment: { score: number; label: string };

    @CreateDateColumn()
    createdAt: Date;
}
