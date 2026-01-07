import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { MissionSession } from './mission-session.entity';

export enum TaskStatus {
    TODO = 'todo',
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Entity('mission_tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: string;

    // Alias for backward compatibility
    get missionSessionId(): string {
        return this.sessionId;
    }

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: TaskStatus,
        default: TaskStatus.TODO,
    })
    status: TaskStatus;

    @Column({
        type: 'enum',
        enum: TaskPriority,
        default: TaskPriority.MEDIUM,
    })
    priority: TaskPriority;

    @Column({ name: 'assignee_id', type: 'varchar', nullable: true })
    assigneeId: string;

    @Column({ name: 'assignee_name', type: 'varchar', nullable: true })
    assigneeName: string;

    // Team assignment fields (for map-dispatch)
    @Column({ name: 'assigned_team_id', type: 'varchar', nullable: true })
    assignedTeamId: string;

    @Column({ name: 'assigned_team_name', type: 'varchar', nullable: true })
    assignedTeamName: string;

    @Column({ name: 'sector_id', type: 'uuid', nullable: true })
    sectorId: string;

    @Column({ type: 'jsonb', nullable: true, comment: 'Location {lat, lng}' })
    location: { lat: number; lng: number };

    @Column({ name: 'created_by', type: 'varchar', nullable: true })
    createdBy: string;

    @Column({ name: 'due_at', type: 'timestamp', nullable: true })
    dueAt: Date;

    @Column({ type: 'jsonb', nullable: true, comment: 'Task metadata' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    // Relations
    @ManyToOne(() => MissionSession, (session) => session.tasks, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'session_id' })
    session: MissionSession;
}
