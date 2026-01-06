/**
 * Audit Log Entity
 * Records all important actions for security and compliance
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
@Index(['userId'])
@Index(['action'])
@Index(['resourceType'])
@Index(['createdAt'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** User who performed the action */
    @Column({ nullable: true })
    userId?: string;

    @Column({ nullable: true })
    userName?: string;

    /** Action performed */
    @Column({ length: 50 })
    action: string;

    /** Resource type (e.g., 'FieldReport', 'Task', 'User') */
    @Column({ length: 50, nullable: true })
    resourceType?: string;

    /** Resource ID */
    @Column({ nullable: true })
    resourceId?: string;

    /** Description of the action */
    @Column({ type: 'text', nullable: true })
    description?: string;

    /** Previous state (for updates) */
    @Column({ type: 'jsonb', nullable: true })
    previousState?: Record<string, any>;

    /** New state (for creates/updates) */
    @Column({ type: 'jsonb', nullable: true })
    newState?: Record<string, any>;

    /** Additional metadata */
    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    /** IP address */
    @Column({ length: 45, nullable: true })
    ipAddress?: string;

    /** User agent */
    @Column({ type: 'text', nullable: true })
    userAgent?: string;

    /** Request ID for tracing */
    @Column({ nullable: true })
    requestId?: string;

    /** Duration in ms (for operations) */
    @Column({ type: 'int', nullable: true })
    durationMs?: number;

    /** Success/failure */
    @Column({ default: true })
    success: boolean;

    /** Error message if failed */
    @Column({ type: 'text', nullable: true })
    errorMessage?: string;

    @CreateDateColumn()
    createdAt: Date;
}
