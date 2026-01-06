/**
 * 決策紀錄實體 (Decision Log Entity)
 * 指揮官決策可追溯：派遣、採信 AI、調整嚴重度、合併、升級等
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

export enum DecisionType {
    DISPATCH = 'dispatch',           // 派遣任務
    SEVERITY_CHANGE = 'severity',    // 調整嚴重度
    ACCEPT_AI = 'accept_ai',         // 採信 AI 建議
    REJECT_AI = 'reject_ai',         // 拒絕 AI 建議
    MERGE_REPORTS = 'merge',         // 合併回報
    CLOSE_TASK = 'close',            // 結案
    ESCALATE = 'escalate',           // 升級/請求支援
    RESOURCE_ALLOC = 'resource',     // 資源分配
    SECTOR_ASSIGN = 'sector',        // 責任區指派
    EVACUATION = 'evacuation',       // 撤離命令
    OTHER = 'other',
}

@Entity('decision_logs')
@Index(['missionSessionId', 'createdAt'])
@Index(['decisionType'])
export class DecisionLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    // 決策時間
    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    timestamp: Date;

    // 決策類型
    @Column({
        name: 'decision_type',
        type: 'enum',
        enum: DecisionType,
    })
    decisionType: DecisionType;

    // 決策描述
    @Column({ type: 'text' })
    description: string;

    // 決策依據/理由
    @Column({ type: 'text', nullable: true })
    rationale: string;

    // 決策者
    @Column({ name: 'decided_by', type: 'varchar' })
    decidedBy: string;

    @Column({ name: 'decided_by_name', type: 'varchar', nullable: true })
    decidedByName: string;

    // 核准者 (如需上級核准)
    @Column({ name: 'approved_by', type: 'varchar', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
    approvedAt: Date;

    // 關聯實體
    @Column({ name: 'related_entity_type', type: 'varchar', nullable: true })
    relatedEntityType: string; // task, report, sector, etc.

    @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
    relatedEntityId: string;

    // AI 輔助標記
    @Column({ name: 'ai_assisted', type: 'boolean', default: false })
    aiAssisted: boolean;

    @Column({ name: 'ai_job_id', type: 'uuid', nullable: true })
    aiJobId: string;

    @Column({ name: 'ai_confidence', type: 'real', nullable: true })
    aiConfidence: number;

    // 決策前後狀態快照
    @Column({ name: 'before_state', type: 'jsonb', nullable: true })
    beforeState: Record<string, any>;

    @Column({ name: 'after_state', type: 'jsonb', nullable: true })
    afterState: Record<string, any>;

    // 影響範圍
    @Column({ name: 'impact_summary', type: 'text', nullable: true })
    impactSummary: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
