import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

/**
 * Task Claim Entity
 * Tracks who has claimed a task for execution
 */
@Entity('task_claims')
@Index(['taskId'])
@Index(['claimedBy'])
export class TaskClaim {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'task_id', type: 'uuid' })
    taskId: string;

    @ManyToOne(() => Task, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task?: Task;

    // Claimer
    @Column({ name: 'claimed_by', type: 'text' })
    claimedBy: string;

    @Column({ name: 'claimed_by_name', type: 'text' })
    claimedByName: string;

    @CreateDateColumn({ name: 'claimed_at', type: 'timestamptz' })
    claimedAt: Date;

    // Release info (null = still active)
    @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
    releasedAt: Date;

    @Column({ name: 'release_reason', type: 'varchar', length: 50, nullable: true })
    releaseReason: string;
}
