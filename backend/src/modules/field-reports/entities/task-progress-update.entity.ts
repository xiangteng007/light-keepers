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
import { ReportAttachment } from './report-attachment.entity';

/**
 * Task Progress Update Entity
 * Tracks progress reports on tasks with optional evidence
 */
@Entity('task_progress_updates')
@Index(['taskId', 'createdAt'])
export class TaskProgressUpdate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'task_id', type: 'uuid' })
    taskId: string;

    @ManyToOne(() => Task, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task?: Task;

    // Reporter
    @Column({ name: 'user_id', type: 'text' })
    userId: string;

    @Column({ name: 'user_name', type: 'text' })
    userName: string;

    // Progress info
    @Column({ type: 'smallint', nullable: true })
    percent: number; // 0-100

    @Column({ type: 'varchar', length: 30, nullable: true })
    status: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    // Optional evidence attachment
    @Column({ name: 'attachment_id', type: 'uuid', nullable: true })
    attachmentId: string;

    @ManyToOne(() => ReportAttachment, { nullable: true })
    @JoinColumn({ name: 'attachment_id' })
    attachment?: ReportAttachment;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
