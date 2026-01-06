/**
 * SITREP 實體 (Situation Report Entity)
 * 情勢報告：定期或按週期彙整的指揮態勢摘要
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
import { OperationalPeriod } from './operational-period.entity';

export enum SITREPStatus {
    DRAFT = 'draft',
    APPROVED = 'approved',
    DISTRIBUTED = 'distributed',
}

export interface KeyEvent {
    time: string;
    description: string;
    severity?: number;
    location?: string;
}

export interface ResourceStatus {
    resourceType: string;
    available: number;
    deployed: number;
    requested: number;
    notes?: string;
}

@Entity('sitreps')
@Index(['missionSessionId', 'sequence'])
export class SITREP {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    @Column({ name: 'operational_period_id', type: 'uuid', nullable: true })
    operationalPeriodId: string;

    @ManyToOne(() => OperationalPeriod, { nullable: true })
    @JoinColumn({ name: 'operational_period_id' })
    operationalPeriod: OperationalPeriod;

    // 序號（自動遞增）
    @Column({ type: 'int' })
    sequence: number;

    // 報告時間範圍
    @Column({ name: 'period_start', type: 'timestamptz' })
    periodStart: Date;

    @Column({ name: 'period_end', type: 'timestamptz' })
    periodEnd: Date;

    // 情勢摘要
    @Column({ type: 'text' })
    summary: string;

    // 重要事件
    @Column({ name: 'key_events', type: 'jsonb', default: '[]' })
    keyEvents: KeyEvent[];

    // 資源狀態
    @Column({ name: 'resource_status', type: 'jsonb', default: '[]' })
    resourceStatus: ResourceStatus[];

    // 傷亡/受災統計
    @Column({ type: 'jsonb', default: '{}' })
    casualties: {
        injured?: number;
        deceased?: number;
        missing?: number;
        rescued?: number;
        evacuated?: number;
    };

    // 下步作為
    @Column({ name: 'next_actions', type: 'jsonb', default: '[]' })
    nextActions: string[];

    // 需求/請求
    @Column({ type: 'jsonb', default: '[]' })
    requests: { type: string; description: string; priority: number }[];

    // 狀態
    @Column({
        type: 'enum',
        enum: SITREPStatus,
        default: SITREPStatus.DRAFT,
    })
    status: SITREPStatus;

    @Column({ type: 'int', default: 1 })
    version: number;

    // AI 生成標記
    @Column({ name: 'ai_generated', type: 'boolean', default: false })
    aiGenerated: boolean;

    // 審核
    @Column({ name: 'approved_by', type: 'varchar', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
    approvedAt: Date;

    // 審計
    @Column({ name: 'created_by', type: 'varchar' })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
