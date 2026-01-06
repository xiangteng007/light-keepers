/**
 * 作戰週期實體 (Operational Period Entity)
 * ICS 指揮系統核心概念：每個作戰週期有明確的目標、優先序、資源配置
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { MissionSession } from './mission-session.entity';

export enum OperationalPeriodStatus {
    DRAFT = 'draft',
    APPROVED = 'approved',
    ACTIVE = 'active',
    CLOSED = 'closed',
}

export interface Objective {
    id: string;
    priority: number;
    description: string;
    measurable: string;
    assignedTo?: string;
    status: 'pending' | 'in_progress' | 'achieved' | 'not_achieved';
}

export interface RiskAssessment {
    id: string;
    hazard: string;
    likelihood: 1 | 2 | 3 | 4 | 5;
    consequence: 1 | 2 | 3 | 4 | 5;
    mitigation: string;
    responsible?: string;
}

export interface ResourceAllocation {
    resourceType: string;
    quantity: number;
    assignedTo?: string;
    location?: string;
    notes?: string;
}

@Entity('operational_periods')
@Index(['missionSessionId', 'periodNumber'])
export class OperationalPeriod {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    @Column({ name: 'period_number', type: 'int' })
    periodNumber: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    // 作戰目標
    @Column({ type: 'jsonb', default: '[]' })
    objectives: Objective[];

    // 優先序
    @Column({ type: 'jsonb', default: '[]' })
    priorities: string[];

    // 風險評估
    @Column({ name: 'risk_assessment', type: 'jsonb', default: '[]' })
    riskAssessment: RiskAssessment[];

    // 資源配置
    @Column({ name: 'resource_allocation', type: 'jsonb', default: '[]' })
    resourceAllocation: ResourceAllocation[];

    // 指揮官指導
    @Column({ name: 'commander_guidance', type: 'text', nullable: true })
    commanderGuidance: string;

    // 時間範圍
    @Column({ name: 'start_time', type: 'timestamptz' })
    startTime: Date;

    @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
    endTime: Date;

    // 狀態與版本
    @Column({
        type: 'enum',
        enum: OperationalPeriodStatus,
        default: OperationalPeriodStatus.DRAFT,
    })
    status: OperationalPeriodStatus;

    @Column({ type: 'int', default: 1 })
    version: number;

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

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
