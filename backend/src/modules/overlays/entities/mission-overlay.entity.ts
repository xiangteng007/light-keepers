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
import { MissionSession } from '../../mission-sessions/entities/mission-session.entity';

// Overlay type enum
export enum OverlayType {
    AOI = 'aoi',
    HAZARD = 'hazard',
    POI = 'poi',
    LINE = 'line',
    POLYGON = 'polygon',
}

// Overlay state enum
export enum OverlayState {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    REMOVED = 'removed',
}

// Hazard status enum
export enum HazardStatus {
    ACTIVE = 'active',
    WATCH = 'watch',
    CLEARED = 'cleared',
}

/**
 * Mission Overlay Entity
 * Unified table for AOI, Hazards, POIs, Lines, and Polygons
 * Uses PostGIS geometry for spatial data
 */
@Entity('mission_overlays')
@Index(['sessionId', 'updatedAt'])
@Index(['state'])
export class MissionOverlay {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Session relationship
    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: string;

    @ManyToOne(() => MissionSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: MissionSession;

    // Type and identification
    @Column({
        type: 'enum',
        enum: OverlayType,
    })
    type: OverlayType;

    @Column({ type: 'varchar', length: 50, nullable: true })
    code: string; // e.g., "AOI-001", "HAZ-003"

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    // Geometry (PostGIS) - stored as GeoJSON
    // Note: For full PostGIS support, use geometry type. 
    // Using jsonb for compatibility without PostGIS extension
    @Column({ type: 'jsonb', comment: 'GeoJSON geometry' })
    geometry: Record<string, any>;

    // Hazard-specific fields
    @Column({ name: 'hazard_type', type: 'varchar', length: 50, nullable: true })
    hazardType: string; // fire, flood, landslide, earthquake, etc.

    @Column({ type: 'smallint', nullable: true })
    severity: number; // 0-4

    @Column({
        name: 'hazard_status',
        type: 'enum',
        enum: HazardStatus,
        nullable: true,
    })
    hazardStatus: HazardStatus;

    @Column({ type: 'smallint', nullable: true })
    confidence: number; // 0-100

    // POI-specific fields
    @Column({ name: 'poi_type', type: 'varchar', length: 50, nullable: true })
    poiType: string; // shelter, aed, rally_point, supply, hospital, etc.

    @Column({ type: 'integer', nullable: true })
    capacity: number;

    // Location reference
    @Column({ name: 'location_id', type: 'uuid', nullable: true })
    locationId: string;

    @Column({ name: 'follow_location', type: 'boolean', default: false })
    followLocation: boolean;

    // Flexible properties (jsonb)
    @Column({ type: 'jsonb', default: '{}' })
    props: Record<string, any>;

    // State and versioning
    @Column({
        type: 'enum',
        enum: OverlayState,
        default: OverlayState.DRAFT,
    })
    state: OverlayState;

    @Column({ type: 'integer', default: 1 })
    version: number;

    // Audit fields
    @Column({ name: 'created_by', type: 'varchar', length: 255 })
    createdBy: string;

    @Column({ name: 'updated_by', type: 'varchar', length: 255 })
    updatedBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Soft delete
    @Column({ name: 'removed_at', type: 'timestamp', nullable: true })
    removedAt: Date;

    @Column({ name: 'removed_by', type: 'varchar', length: 255, nullable: true })
    removedBy: string;
}
