import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Audit Log Entity
 * Records all significant actions for accountability
 */
@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['missionSessionId', 'createdAt'])
@Index(['actorUserId'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Actor
    @Column({ name: 'actor_user_id', type: 'text' })
    actorUserId: string;

    @Column({ name: 'actor_name', type: 'text', nullable: true })
    actorName: string;

    // Action
    @Column({ type: 'varchar', length: 50 })
    action: string;

    // Target entity
    @Column({ name: 'entity_type', type: 'varchar', length: 30 })
    entityType: string;

    @Column({ name: 'entity_id', type: 'uuid' })
    entityId: string;

    // Context
    @Column({ name: 'mission_session_id', type: 'uuid', nullable: true })
    missionSessionId: string;

    // Snapshots
    @Column({ name: 'before_snapshot', type: 'jsonb', nullable: true })
    beforeSnapshot: Record<string, any>;

    @Column({ name: 'after_snapshot', type: 'jsonb', nullable: true })
    afterSnapshot: Record<string, any>;

    // Request metadata
    @Column({ name: 'ip_address', type: 'inet', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
