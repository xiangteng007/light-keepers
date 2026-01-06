import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Location } from './location.entity';

/**
 * Location Alias Entity
 * Stores alternative names for locations (e.g., nicknames, abbreviations)
 */
@Entity('location_aliases')
export class LocationAlias {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'location_id', type: 'uuid' })
    locationId: string;

    @ManyToOne(() => Location, (location) => location.aliases, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'location_id' })
    location: Location;

    @Column({ type: 'varchar', length: 255 })
    @Index()
    alias: string;

    @Column({ type: 'varchar', length: 10, default: 'zh-TW' })
    language: string;
}
