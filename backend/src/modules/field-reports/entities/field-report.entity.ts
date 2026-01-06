import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { MissionSession } from '../../mission-sessions/entities/mission-session.entity';

export type FieldReportType = 'incident' | 'resource' | 'medical' | 'traffic' | 'sos' | 'other';
export type FieldReportStatus = 'new' | 'triaged' | 'task_created' | 'assigned' | 'in_progress' | 'closed' | 'cancelled';

/**
 * Field Report Entity
 * Core entity for real-time field reports within a mission session
 * Supports PostGIS geometry for spatial queries
 */
@Entity('field_reports')
@Index(['missionSessionId', 'updatedAt'])
@Index(['status', 'severity'])
@Index(['type'])
export class FieldReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Mission context
    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'mission_session_id' })
    missionSession?: MissionSession;

    // Reporter
    @Column({ name: 'reporter_user_id', type: 'text' })
    reporterUserId: string;

    @Column({ name: 'reporter_name', type: 'text' })
    reporterName: string;

    // Classification
    @Column({ type: 'varchar', length: 20 })
    type: FieldReportType;

    @Column({ type: 'varchar', length: 50, nullable: true })
    category: string;

    @Column({ type: 'smallint', default: 0 })
    severity: number; // 0-4

    @Column({ type: 'smallint', default: 50 })
    confidence: number; // 0-100

    // Status workflow
    @Column({ type: 'varchar', length: 20, default: 'new' })
    status: FieldReportStatus;

    // Content
    @Column({ type: 'text', nullable: true })
    message: string;

    // Location (PostGIS) - stored as WKT, queried with ST_* functions
    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
    })
    geom: string; // GeoJSON Point stored as geometry

    @Column({ name: 'accuracy_m', type: 'real', nullable: true })
    accuracyM: number;

    @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' })
    occurredAt: Date;

    // Attachments count (denormalized for performance)
    @Column({ name: 'attachments_count', type: 'int', default: 0 })
    attachmentsCount: number;

    // Flexible metadata
    @Column({ type: 'jsonb', default: '{}' })
    metadata: Record<string, any>;

    // Versioning for optimistic locking
    @Column({ type: 'int', default: 1 })
    version: number;

    // Audit
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Column({ name: 'updated_by', type: 'text', nullable: true })
    updatedBy: string;

    @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt: Date;

    // Relations (defined in other entities)
    // attachments: ReportAttachment[];
    // sosSignal: SosSignal;
}
