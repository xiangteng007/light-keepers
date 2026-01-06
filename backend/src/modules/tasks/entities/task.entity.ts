import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Event } from '../../events/entities';

export enum TaskStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    CLAIMED = 'claimed',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    BLOCKED = 'blocked',
}

export interface ChecklistItem {
    id: string;
    text: string;
    done: boolean;
    doneAt?: string;
    doneBy?: string;
}

@Entity('tasks')
@Index(['missionSessionId', 'status'])
@Index(['assignedTeamId'])
@Index(['sectorId'])
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 任務場次連結
    @Column({ name: 'mission_session_id', type: 'uuid', nullable: true })
    missionSessionId: string;

    @Column({ name: 'event_id', type: 'uuid', nullable: true })
    eventId: string;

    @Column({ length: 200 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'smallint', default: 3 })
    priority: number;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: TaskStatus;

    // 個人指派 (舊有相容)
    @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
    assignedTo: string;

    @Column({ name: 'assigned_to_name', type: 'varchar', nullable: true })
    assignedToName: string;

    // 小隊指派 (新增)
    @Column({ name: 'assigned_team_id', type: 'uuid', nullable: true })
    assignedTeamId: string;

    @Column({ name: 'assigned_team_name', type: 'varchar', nullable: true })
    assignedTeamName: string;

    // 責任區連結
    @Column({ name: 'sector_id', type: 'uuid', nullable: true })
    sectorId: string;

    // 集結點
    @Column({ name: 'rally_point_id', type: 'uuid', nullable: true })
    rallyPointId: string;

    // 地點
    @Column({ type: 'text', nullable: true })
    address: string;

    // 座標 (PostGIS Point as GeoJSON)
    @Column({ type: 'jsonb', nullable: true })
    location: { lat: number; lng: number } | null;

    @Column({ name: 'due_at', type: 'timestamp', nullable: true })
    dueAt: Date;

    // 來源回報 ID
    @Column({ name: 'source_report_id', type: 'uuid', nullable: true })
    sourceReportId: string;

    // AI 來源連結
    @Column({ name: 'source_ai_job_id', type: 'uuid', nullable: true })
    sourceAiJobId: string;

    // 檢查清單 (SOP steps)
    @Column({ type: 'jsonb', default: '[]' })
    checklist: ChecklistItem[];

    // 結案相關
    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    @Column({ name: 'completed_by', type: 'varchar', nullable: true })
    completedBy: string;

    @Column({ type: 'text', nullable: true })
    outcome: string;

    // 版本控制
    @Column({ type: 'int', default: 1 })
    version: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'created_by', type: 'varchar', nullable: true })
    createdBy: string;

    @ManyToOne(() => Event, { nullable: true })
    @JoinColumn({ name: 'event_id' })
    event?: Event;
}

