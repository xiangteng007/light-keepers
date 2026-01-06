import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { LocationAlias } from './location-alias.entity';

/**
 * Location Entity
 * Directory of known locations (shelters, AEDs, hospitals, rally points, etc.)
 * Can be imported from government data or manually created
 */
@Entity('locations')
@Index(['category'])
@Index(['isActive'])
export class Location {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Source identification
    @Column({ type: 'varchar', length: 50 })
    source: string; // 'gov_shelter', 'gov_aed', 'gov_hospital', 'manual'

    @Column({ name: 'source_id', type: 'varchar', length: 100, nullable: true })
    sourceId: string; // Original ID from source data

    // Basic info
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    category: string; // shelter, aed, hospital, fire_station, police, rally_point

    // Location (stored as GeoJSON Point)
    @Column({ type: 'jsonb', comment: 'GeoJSON Point geometry' })
    geometry: { type: 'Point'; coordinates: [number, number] };

    @Column({ type: 'varchar', length: 500, nullable: true })
    address?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    city?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    district?: string;

    // Flexible properties
    @Column({ type: 'jsonb', default: '{}' })
    props: Record<string, any>;

    // Versioning
    @Column({ type: 'integer', default: 1 })
    version: number;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Soft delete
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    // Relations
    @OneToMany(() => LocationAlias, (alias) => alias.location, { cascade: true })
    aliases: LocationAlias[];
}
