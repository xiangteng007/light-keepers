import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Location History Entity
 * Sampled location history for replay and analysis
 */
@Entity('location_history')
@Index(['missionSessionId', 'recordedAt'])
@Index(['userId', 'recordedAt'])
export class LocationHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'text' })
    userId: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    // Location
    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
    })
    geom: string;

    @Column({ name: 'accuracy_m', type: 'real', nullable: true })
    accuracyM: number;

    @Column({ type: 'real', nullable: true })
    heading: number;

    @Column({ type: 'real', nullable: true })
    speed: number;

    @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
    recordedAt: Date;
}
