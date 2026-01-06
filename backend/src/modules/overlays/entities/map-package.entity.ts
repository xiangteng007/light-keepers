import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Map Package Entity
 * Server-side registry of available offline map packages
 * Includes basemaps, terrain, and AOI-specific high-detail packages
 */
@Entity('map_packages')
@Index(['type'])
@Index(['isActive'])
export class MapPackage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Identification
    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 20 })
    type: string; // 'basemap', 'terrain', 'contours', 'aoi'

    @Column({ type: 'varchar', length: 100, nullable: true })
    region: string; // 'taiwan', 'aoi:{session_id}'

    // File information
    @Column({ name: 'file_url', type: 'varchar', length: 500 })
    fileUrl: string;

    @Column({ name: 'file_size', type: 'bigint' })
    fileSize: number;

    @Column({ type: 'varchar', length: 64 })
    sha256: string;

    // Version
    @Column({ type: 'varchar', length: 20 })
    version: string;

    @CreateDateColumn({ name: 'published_at' })
    publishedAt: Date;

    // Status
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    // Metadata
    @Column({ type: 'jsonb', default: '{}' })
    metadata: Record<string, any>; // bounds, zoom levels, etc.
}
