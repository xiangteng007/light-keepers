import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { MissionSession } from './mission-session.entity';

export enum EventType {
    INFO = 'info',
    WARNING = 'warning',
    CRITICAL = 'critical',
    SUCCESS = 'success',
}

@Entity('events')
export class Event {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: EventType,
        default: EventType.INFO,
    })
    type: EventType;

    @Column({ name: 'reporter_id', type: 'varchar', nullable: true })
    reporterId: string;

    @Column({ name: 'reporter_name', type: 'varchar', nullable: true })
    reporterName: string;

    @Column({ type: 'jsonb', nullable: true, comment: 'Location coordinates [lng, lat]' })
    location: number[];

    @Column({ type: 'jsonb', nullable: true, comment: 'Additional event metadata' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => MissionSession, (session) => session.events, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'session_id' })
    session: MissionSession;
}
