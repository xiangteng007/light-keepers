/**
 * Webhook Subscription Entity
 * 
 * Stores external webhook subscriptions for event notifications
 * v1.0
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum WebhookEventType {
    // Disaster Events
    ALERT_CREATED = 'alert.created',
    ALERT_UPDATED = 'alert.updated',
    ALERT_RESOLVED = 'alert.resolved',

    // Task Events
    TASK_CREATED = 'task.created',
    TASK_ASSIGNED = 'task.assigned',
    TASK_STARTED = 'task.started',
    TASK_COMPLETED = 'task.completed',
    TASK_CANCELLED = 'task.cancelled',

    // Resource Events
    RESOURCE_LOW = 'resource.low',
    RESOURCE_DEPLETED = 'resource.depleted',
    RESOURCE_RESTOCKED = 'resource.restocked',

    // Volunteer Events
    VOLUNTEER_CHECKIN = 'volunteer.checkin',
    VOLUNTEER_CHECKOUT = 'volunteer.checkout',
    VOLUNTEER_DISPATCH = 'volunteer.dispatch',

    // Mission Events
    MISSION_STARTED = 'mission.started',
    MISSION_ENDED = 'mission.ended',
    MISSION_ESCALATED = 'mission.escalated',

    // System Events
    SYSTEM_ALERT = 'system.alert',
    SYNC_COMPLETED = 'sync.completed',

    // Wildcard
    ALL = '*',
}

@Entity('webhook_subscriptions')
@Index(['tenantId', 'active'])
export class WebhookSubscription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    @Index()
    tenantId?: string;

    @Column()
    name: string;

    @Column()
    @Index()
    url: string;

    @Column({ nullable: true })
    description?: string;

    @Column()
    secret: string;

    @Column('simple-array')
    events: WebhookEventType[];

    @Column({ default: true })
    active: boolean;

    @Column({ default: 0 })
    failureCount: number;

    @Column({ nullable: true })
    lastFailureAt?: Date;

    @Column({ nullable: true })
    lastSuccessAt?: Date;

    @Column({ nullable: true })
    lastError?: string;

    @Column({ default: 3 })
    maxRetries: number;

    @Column({ default: 30000 })
    timeoutMs: number;

    @Column('jsonb', { nullable: true })
    headers?: Record<string, string>;

    @Column({ default: false })
    verifySSL: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    createdBy?: string;
}
