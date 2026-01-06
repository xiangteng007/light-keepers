import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { DispatchTask } from './dispatch-task.entity';

/**
 * Assignment Status
 */
export enum AssignmentStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

/**
 * Task Assignment Entity
 * Represents an assignment of a task to a volunteer
 */
@Entity('task_assignments')
@Index(['taskId', 'volunteerId'], { unique: true })
@Index(['volunteerId', 'status'])
export class TaskAssignment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'task_id', type: 'uuid' })
    taskId: string;

    @ManyToOne(() => DispatchTask, (task) => task.assignments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task: DispatchTask;

    @Column({ name: 'volunteer_id', type: 'text' })
    volunteerId: string;

    @Column({ name: 'volunteer_name', type: 'text' })
    volunteerName: string;

    @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.PENDING })
    status: AssignmentStatus;

    @Column({ name: 'assigned_by', type: 'text' })
    assignedBy: string;

    @Column({ name: 'assigned_at', type: 'timestamptz' })
    assignedAt: Date;

    @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
    respondedAt: Date | null;

    @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
    completedAt: Date | null;

    @Column({ name: 'decline_reason', type: 'text', nullable: true })
    declineReason: string | null;

    @Column({ name: 'completion_notes', type: 'text', nullable: true })
    completionNotes: string | null;

    @Column({ type: 'jsonb', default: '{}' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
