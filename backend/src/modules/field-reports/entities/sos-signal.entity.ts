import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    OneToOne,
} from 'typeorm';
import { MissionSession } from '../../mission-sessions/entities/mission-session.entity';
import { FieldReport } from './field-report.entity';

export type SosStatus = 'active' | 'acked' | 'resolved' | 'cancelled';

/**
 * SOS Signal Entity
 * Tracks emergency distress signals with ACK workflow
 */
@Entity('sos_signals')
@Index(['missionSessionId', 'status'])
@Index(['userId'])
export class SosSignal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession?: MissionSession;

    // Optional link to auto-created report
    @Column({ name: 'report_id', type: 'uuid', nullable: true })
    reportId: string;

    @OneToOne(() => FieldReport, { nullable: true })
    @JoinColumn({ name: 'report_id' })
    report?: FieldReport;

    // Sender
    @Column({ name: 'user_id', type: 'text' })
    userId: string;

    @Column({ name: 'user_name', type: 'text' })
    userName: string;

    // Status workflow
    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: SosStatus;

    // Trigger location
    @Column({
        name: 'trigger_geom',
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
    })
    triggerGeom: string;

    @Column({ name: 'trigger_accuracy_m', type: 'real', nullable: true })
    triggerAccuracyM: number;

    // Last known location (updated while active)
    @Column({
        name: 'last_location_geom',
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    lastLocationGeom: string;

    @Column({ name: 'last_location_at', type: 'timestamptz', nullable: true })
    lastLocationAt: Date;

    // ACK workflow
    @Column({ name: 'acked_by', type: 'text', nullable: true })
    ackedBy: string;

    @Column({ name: 'acked_at', type: 'timestamptz', nullable: true })
    ackedAt: Date;

    @Column({ name: 'resolved_by', type: 'text', nullable: true })
    resolvedBy: string;

    @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
    resolvedAt: Date;

    @Column({ name: 'resolution_note', type: 'text', nullable: true })
    resolutionNote: string;

    // TTL for auto-expiry
    @Column({ name: 'ttl_expires_at', type: 'timestamptz', nullable: true })
    ttlExpiresAt: Date;

    // Audit
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
