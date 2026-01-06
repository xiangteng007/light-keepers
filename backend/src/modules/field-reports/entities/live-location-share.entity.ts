import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { MissionSession } from '../../mission-sessions/entities/mission-session.entity';

export type LocationShareMode = 'off' | 'mission' | 'sos';

/**
 * Live Location Share Entity
 * Tracks user location sharing status and last known position
 */
@Entity('live_location_shares')
@Index(['missionSessionId', 'isEnabled'])
@Index(['userId', 'missionSessionId'], { unique: true })
export class LiveLocationShare {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // User
    @Column({ name: 'user_id', type: 'text' })
    userId: string;

    @Column({ name: 'user_name', type: 'text' })
    userName: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    callsign: string;

    // Mission context
    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession?: MissionSession;

    // Mode
    @Column({ type: 'varchar', length: 10, default: 'off' })
    mode: LocationShareMode;

    @Column({ name: 'is_enabled', type: 'boolean', default: false })
    isEnabled: boolean;

    // Last known location
    @Column({
        name: 'last_geom',
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    lastGeom: string;

    @Column({ name: 'last_accuracy_m', type: 'real', nullable: true })
    lastAccuracyM: number;

    @Column({ name: 'last_heading', type: 'real', nullable: true })
    lastHeading: number;

    @Column({ name: 'last_speed', type: 'real', nullable: true })
    lastSpeed: number;

    @Column({ name: 'last_at', type: 'timestamptz', nullable: true })
    lastAt: Date;

    // Timing
    @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
    startedAt: Date;

    @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
    endedAt: Date;

    @Column({ name: 'ttl_expires_at', type: 'timestamptz', nullable: true })
    ttlExpiresAt: Date;

    // Audit
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
