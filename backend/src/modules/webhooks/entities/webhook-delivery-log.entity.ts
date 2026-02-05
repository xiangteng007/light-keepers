/**
 * Webhook Delivery Log Entity
 * 
 * Tracks webhook delivery attempts
 * v1.0
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { WebhookSubscription, WebhookEventType } from './webhook-subscription.entity';

export enum DeliveryStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
    RETRYING = 'retrying',
}

@Entity('webhook_delivery_logs')
@Index(['subscriptionId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class WebhookDeliveryLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    subscriptionId: string;

    @ManyToOne(() => WebhookSubscription, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'subscriptionId' })
    subscription?: WebhookSubscription;

    @Column({ type: 'enum', enum: WebhookEventType })
    eventType: WebhookEventType;

    @Column('jsonb')
    payload: unknown;

    @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
    status: DeliveryStatus;

    @Column({ nullable: true })
    responseStatus?: number;

    @Column({ nullable: true, type: 'text' })
    responseBody?: string;

    @Column({ default: 0 })
    attempt: number;

    @Column({ nullable: true })
    error?: string;

    @Column({ nullable: true })
    durationMs?: number;

    @Column({ nullable: true })
    nextRetryAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ nullable: true })
    deliveredAt?: Date;
}
