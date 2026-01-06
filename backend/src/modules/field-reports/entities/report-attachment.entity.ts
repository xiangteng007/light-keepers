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
import { FieldReport } from './field-report.entity';

export type AttachmentKind = 'photo' | 'video' | 'file';
export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';
export type LocationSource = 'exif' | 'device' | 'manual' | 'unknown';

/**
 * Report Attachment Entity
 * Stores file metadata and photo location for map layer display
 */
@Entity('report_attachments')
@Index(['reportId'])
@Index(['missionSessionId'])
@Index(['uploadStatus'])
export class ReportAttachment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'report_id', type: 'uuid' })
    reportId: string;

    @ManyToOne(() => FieldReport, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'report_id' })
    report?: FieldReport;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    // File info
    @Column({ type: 'varchar', length: 10 })
    kind: AttachmentKind;

    @Column({ type: 'varchar', length: 100 })
    mime: string;

    @Column({ type: 'bigint' })
    size: number;

    @Column({ type: 'varchar', length: 64, nullable: true })
    sha256: string;

    @Column({ name: 'original_filename', type: 'text', nullable: true })
    originalFilename: string;

    // Storage
    @Column({ name: 'gcs_path', type: 'text', nullable: true })
    gcsPath: string;

    @Column({ name: 'thumbnail_path', type: 'text', nullable: true })
    thumbnailPath: string;

    @Column({ name: 'upload_status', type: 'varchar', length: 20, default: 'pending' })
    uploadStatus: UploadStatus;

    // Photo location (for Photo Evidence map layer)
    @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
    capturedAt: Date;

    @Column({
        name: 'photo_geom',
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    photoGeom: string;

    @Column({ name: 'photo_accuracy_m', type: 'real', nullable: true })
    photoAccuracyM: number;

    @Column({ name: 'location_source', type: 'varchar', length: 10, nullable: true })
    locationSource: LocationSource;

    // EXIF metadata (minimal)
    @Column({ name: 'exif_json', type: 'jsonb', nullable: true })
    exifJson: Record<string, any>;

    // Map visibility flag (opt-in)
    @Column({ name: 'show_on_map', type: 'boolean', default: false })
    showOnMap: boolean;

    // Audit
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
