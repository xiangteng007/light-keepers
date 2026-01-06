import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Overlay Audit Log Entity
 * Records all changes to overlays for audit trail
 * Stores before/after state as JSON snapshots
 */
@Entity('overlay_audit_logs')
@Index(['overlayId'])
@Index(['sessionId', 'createdAt'])
export class OverlayAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'overlay_id', type: 'uuid' })
    overlayId: string;

    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: string;

    @Column({ type: 'varchar', length: 20 })
    action: string; // 'create', 'update', 'publish', 'remove'

    @Column({ type: 'varchar', length: 255 })
    actor: string;

    @Column({ name: 'before_state', type: 'jsonb', nullable: true })
    beforeState: Record<string, any>;

    @Column({ name: 'after_state', type: 'jsonb', nullable: true })
    afterState: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
