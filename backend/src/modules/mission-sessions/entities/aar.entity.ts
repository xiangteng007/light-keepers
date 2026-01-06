/**
 * AAR 實體 (After Action Review Entity)
 * 事後復盤：時間軸回放、決策回顧、經驗教訓
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { MissionSession } from './mission-session.entity';

export enum AARStatus {
    DRAFT = 'draft',
    REVIEW = 'review',
    FINALIZED = 'finalized',
}

export interface TimelineEvent {
    timestamp: string;
    eventType: 'report' | 'task' | 'decision' | 'sos' | 'dispatch' | 'status_change' | 'other';
    title: string;
    description: string;
    severity?: number;
    location?: { lat: number; lng: number };
    actorName?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
}

export interface DecisionReview {
    decisionId: string;
    timestamp: string;
    description: string;
    rationale: string;
    outcome: 'effective' | 'partially_effective' | 'ineffective' | 'pending';
    notes?: string;
    recommendations?: string[];
}

export interface LessonLearned {
    id: string;
    category: 'operations' | 'communications' | 'logistics' | 'coordination' | 'safety' | 'technology' | 'other';
    observation: string;
    impact: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    assignedTo?: string;
    status: 'identified' | 'in_progress' | 'implemented' | 'deferred';
}

@Entity('after_action_reviews')
@Index(['missionSessionId'])
export class AfterActionReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    // 事件時間軸
    @Column({ type: 'jsonb', default: '[]' })
    timeline: TimelineEvent[];

    // 任務統計
    @Column({ type: 'jsonb', default: '{}' })
    statistics: {
        duration?: number; // minutes
        totalReports?: number;
        totalTasks?: number;
        completedTasks?: number;
        sosCount?: number;
        totalPersonnel?: number;
        resourcesDeployed?: Record<string, number>;
        casualties?: {
            injured?: number;
            deceased?: number;
            rescued?: number;
            evacuated?: number;
        };
    };

    // 決策回顧
    @Column({ name: 'decisions_review', type: 'jsonb', default: '[]' })
    decisionsReview: DecisionReview[];

    // 經驗教訓
    @Column({ name: 'lessons_learned', type: 'jsonb', default: '[]' })
    lessonsLearned: LessonLearned[];

    // 改進建議
    @Column({ type: 'jsonb', default: '[]' })
    recommendations: string[];

    // 執行摘要
    @Column({ name: 'executive_summary', type: 'text', nullable: true })
    executiveSummary: string;

    // 成功事項
    @Column({ type: 'jsonb', default: '[]' })
    successes: string[];

    // 挑戰/問題
    @Column({ type: 'jsonb', default: '[]' })
    challenges: string[];

    // 附件
    @Column({ type: 'jsonb', default: '[]' })
    attachments: { id: string; name: string; url: string; type: string }[];

    // 狀態
    @Column({
        type: 'enum',
        enum: AARStatus,
        default: AARStatus.DRAFT,
    })
    status: AARStatus;

    @Column({ type: 'int', default: 1 })
    version: number;

    // AI 生成標記
    @Column({ name: 'ai_generated', type: 'boolean', default: false })
    aiGenerated: boolean;

    // 審計
    @Column({ name: 'created_by', type: 'varchar' })
    createdBy: string;

    @Column({ name: 'finalized_by', type: 'varchar', nullable: true })
    finalizedBy: string;

    @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
    finalizedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
