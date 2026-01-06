import {
    Entity,
    Column,
    CreateDateColumn,
    Index,
    PrimaryColumn,
} from 'typeorm';

/**
 * Entity Lock Entity
 * Pessimistic locking for multi-user collaboration
 */
@Entity('entity_locks')
@Index(['expiresAt'])
export class EntityLock {
    @PrimaryColumn({ name: 'entity_type', type: 'varchar', length: 30 })
    entityType: string;

    @PrimaryColumn({ name: 'entity_id', type: 'uuid' })
    entityId: string;

    // Lock holder
    @Column({ name: 'locked_by', type: 'text' })
    lockedBy: string;

    @Column({ name: 'locked_by_name', type: 'text', nullable: true })
    lockedByName: string;

    @CreateDateColumn({ name: 'locked_at', type: 'timestamptz' })
    lockedAt: Date;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt: Date;
}
