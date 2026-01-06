import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { MissionSession } from './mission-session.entity';

export enum MissionEventType {
    INFO = 'info',
    WARNING = 'warning',
    CRITICAL = 'critical',
    SUCCESS = 'success',
}

/**
 * Mission Event Entity
 * Renamed from Event to avoid collision with events module
 */
@Entity('mission_events')
export class MissionEvent {
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
        enum: MissionEventType,
        default: MissionEventType.INFO,
    })
    type: MissionEventType;

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
