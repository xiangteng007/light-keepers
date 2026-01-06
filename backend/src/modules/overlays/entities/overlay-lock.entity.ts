import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { MissionOverlay } from './mission-overlay.entity';

/**
 * Overlay Lock Entity
 * Tracks which user has acquired a lock on an overlay for editing
 * Used for multi-user collaboration to prevent concurrent edits
 */
@Entity('overlay_locks')
export class OverlayLock {
    @PrimaryColumn({ name: 'overlay_id', type: 'uuid' })
    overlayId: string;

    @ManyToOne(() => MissionOverlay, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'overlay_id' })
    overlay: MissionOverlay;

    @Column({ name: 'locked_by', type: 'varchar', length: 255 })
    lockedBy: string;

    @Column({ name: 'locked_at', type: 'timestamp', default: () => 'NOW()' })
    lockedAt: Date;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;
}
