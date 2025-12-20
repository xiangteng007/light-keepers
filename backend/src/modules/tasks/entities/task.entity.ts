import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from '../../events/entities';

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'event_id', type: 'uuid', nullable: true })
    eventId: string;

    @Column({ length: 200 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'smallint', default: 3 })
    priority: number;

    @Column({ length: 20, default: 'pending' })
    status: string;

    @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
    assignedTo: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ name: 'due_at', type: 'timestamp', nullable: true })
    dueAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Event, { nullable: true })
    @JoinColumn({ name: 'event_id' })
    event?: Event;
}
