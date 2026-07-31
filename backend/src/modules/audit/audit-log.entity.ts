/**
 * Audit Log Entity (canonical)
 *
 * Single source of truth for the `audit_logs` table.
 *
 * History: three entity classes used to map to `audit_logs`:
 *   - `modules/audit/audit-log.entity.ts`            (security / compliance logging)
 *   - `modules/field-reports/entities/audit-log.entity.ts` (mission / entity trail)
 *   - `modules/audit/entities/audit-log.entity.ts`   (unreferenced dead code)
 * Multiple classes on one table make TypeORM emit bogus `migration:generate`
 * diffs (see migration 1768494672978, which drops + re-adds both column sets).
 * They are now merged here; the field union below is intentional.
 *
 * NOTE on nullability: `actorUserId` / `entityType` / `entityId` were NOT NULL
 * in the field-reports variant, but the security/compliance writers never set
 * them (and vice versa for `userId` / `resourceType`). Per the "keep the looser
 * definition" rule they are all optional here. Aligning the physical NOT NULL
 * constraints is a follow-up DB task; no migration is written by this change.
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export type AuditAction =
    | 'create' | 'update' | 'delete' | 'read'
    | 'login' | 'logout' | 'login_failed'
    | 'role_change' | 'permission_grant' | 'permission_revoke'
    | 'sos_trigger' | 'sos_ack' | 'sos_resolve'
    | 'task_assign' | 'task_complete' | 'task_cancel'
    | 'report_submit' | 'report_verify'
    | 'export' | 'import'
    | 'BREAK_GLASS_EXECUTED' | 'BREAK_GLASS_CONFIGURED';  // v3.0 Break-Glass Protocol

@Entity('audit_logs')
// --- indexes from the security/compliance variant ---
@Index(['userId'])
@Index(['action'])
@Index(['resourceType'])
@Index(['createdAt'])
// --- indexes from the field-reports variant ---
@Index(['actorUserId'])
@Index(['entityType', 'entityId'])
@Index(['missionSessionId', 'createdAt'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ------------------------------------------------------------------
    // Actor
    // ------------------------------------------------------------------

    /** User who performed the action (security/compliance variant) */
    @Column({ nullable: true })
    userId?: string;

    @Column({ nullable: true })
    userName?: string;

    /** Actor id used by the field-reports / mission trail */
    @Column({ name: 'actor_user_id', type: 'text', nullable: true })
    actorUserId?: string;

    @Column({ name: 'actor_name', type: 'text', nullable: true })
    actorName?: string;

    // ------------------------------------------------------------------
    // Action
    // ------------------------------------------------------------------

    /** Action performed (free-form; see AuditAction for the known set) */
    @Column({ length: 50 })
    action: string;

    // ------------------------------------------------------------------
    // Target
    // ------------------------------------------------------------------

    /** Resource type (e.g., 'FieldReport', 'Task', 'User') */
    @Column({ length: 50, nullable: true })
    resourceType?: string;

    /** Resource ID */
    @Column({ nullable: true })
    resourceId?: string;

    /** Target entity type (field-reports variant) */
    @Column({ name: 'entity_type', type: 'varchar', length: 30, nullable: true })
    entityType?: string;

    /** Target entity id (field-reports variant) */
    @Column({ name: 'entity_id', type: 'uuid', nullable: true })
    entityId?: string;

    /** Mission session context (field-reports variant) */
    @Column({ name: 'mission_session_id', type: 'uuid', nullable: true })
    missionSessionId?: string;

    /** Description of the action */
    @Column({ type: 'text', nullable: true })
    description?: string;

    // ------------------------------------------------------------------
    // State snapshots
    // ------------------------------------------------------------------

    /** Previous state (for updates) */
    @Column({ type: 'jsonb', nullable: true })
    previousState?: Record<string, unknown>;

    /** New state (for creates/updates) */
    @Column({ type: 'jsonb', nullable: true })
    newState?: Record<string, unknown>;

    /** Before snapshot (field-reports variant of previousState) */
    @Column({ name: 'before_snapshot', type: 'jsonb', nullable: true })
    beforeSnapshot?: Record<string, unknown>;

    /** After snapshot (field-reports variant of newState) */
    @Column({ name: 'after_snapshot', type: 'jsonb', nullable: true })
    afterSnapshot?: Record<string, unknown>;

    /** Additional metadata */
    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, unknown>;

    // ------------------------------------------------------------------
    // Request metadata
    // ------------------------------------------------------------------

    /**
     * IP address.
     *
     * CONFLICT: `modules/audit/audit-log.entity.ts` declared this as
     * `varchar(45)` on column "ipAddress"; `modules/field-reports/entities/
     * audit-log.entity.ts` declared it as `inet` on column "ip_address".
     * Resolution: keep the physical column that the hand-written migration
     * 1735954350000 actually created (`ip_address`) with the looser
     * `varchar(45)` type, so proxy-supplied values (X-Forwarded-For lists,
     * "unknown", IPv6 zone ids) cannot break inserts.
     * A follow-up migration is required to widen the column type in the DB.
     */
    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress?: string;

    /**
     * User agent.
     * CONFLICT (name only): "userAgent" vs "user_agent"; both were `text`.
     * Resolution: keep "user_agent" (the column created by migration
     * 1735954350000).
     */
    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string;

    /** Request ID for tracing */
    @Column({ nullable: true })
    requestId?: string;

    /** Duration in ms (for operations) */
    @Column({ type: 'int', nullable: true })
    durationMs?: number;

    // ------------------------------------------------------------------
    // Outcome
    // ------------------------------------------------------------------

    /** Success/failure */
    @Column({ default: true })
    success: boolean;

    /** Error message if failed */
    @Column({ type: 'text', nullable: true })
    errorMessage?: string;

    /**
     * Creation timestamp.
     * CONFLICT: "createdAt" (`timestamp`) vs "created_at" (`timestamptz`).
     * Resolution: keep the looser/safer `timestamptz` on "created_at"
     * (the column created by migration 1735954350000).
     */
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
