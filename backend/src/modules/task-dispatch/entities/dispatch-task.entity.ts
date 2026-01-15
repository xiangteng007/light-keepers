import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { MissionSession } from '../../mission-sessions/entities/mission-session.entity';
import { TaskAssignment } from './task-assignment.entity';

/**
 * Task Priority Levels
 */
export enum TaskPriority {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2,
    CRITICAL = 3,
    EMERGENCY = 4,
}

/**
 * Task Status
 */
export enum TaskStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    ACCEPTED = 'accepted',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

/**
 * Task Category
 */
export enum TaskCategory {
    RESCUE = 'rescue',
    MEDICAL = 'medical',
    LOGISTICS = 'logistics',
    COMMUNICATION = 'communication',
    EVACUATION = 'evacuation',
    ASSESSMENT = 'assessment',
    OTHER = 'other',
}

/**
 * Dispatch Task Entity
 * Represents a task to be dispatched to volunteers
 */
@Entity('dispatch_tasks')
@Index(['missionSessionId', 'status'])
@Index(['priority', 'createdAt'])
export class DispatchTask {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession: MissionSession;

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: TaskCategory, default: TaskCategory.OTHER })
    category: TaskCategory;

    @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
    priority: TaskPriority;

    @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.DRAFT })
    status: TaskStatus;

    @Column({ name: 'source_report_id', type: 'uuid', nullable: true })
    sourceReportId: string | null;

    @Column({ name: 'source_ai_job_id', type: 'uuid', nullable: true })
    sourceAiJobId: string | null;

    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    location: object | null;

    @Column({ name: 'location_description', type: 'text', nullable: true })
    locationDescription: string | null;

    @Column({ name: 'required_skills', type: 'text', array: true, default: '{}' })
    requiredSkills: string[];

    @Column({ name: 'required_resources', type: 'text', array: true, default: '{}' })
    requiredResources: string[];

    @Column({ name: 'estimated_duration_min', type: 'integer', nullable: true })
    estimatedDurationMin: number | null;

    @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
    dueAt: Date | null;

    @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
    startedAt: Date | null;

    @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
    completedAt: Date | null;

    @Column({ name: 'created_by', type: 'text' })
    createdBy: string;

    @Column({ type: 'jsonb', default: '{}' })
    metadata: Record<string, any>;

    @OneToMany(() => TaskAssignment, (assignment) => assignment.task)
    assignments: TaskAssignment[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    // Soft-delete support (SEC-SD.1)
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt?: Date;
}
