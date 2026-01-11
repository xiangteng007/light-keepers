/**
 * domain-events.entity.ts
 * 
 * P3: Outbox Pattern - Event Outbox Entity
 * 
 * Stores domain events for reliable cross-module communication
 * Ensures eventual consistency through transactional outbox pattern
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum DomainEventStatus {
    Pending = 'pending',
    Published = 'published',
    Failed = 'failed',
}

export enum AggregateType {
    Alert = 'Alert',
    Incident = 'Incident',
    Task = 'Task',
    Resource = 'Resource',
    Person = 'Person',
    Comms = 'Comms',
    Attachment = 'Attachment',
}

@Entity('domain_events_outbox')
@Index(['status', 'createdAt'])
@Index(['aggregateType', 'aggregateId'])
export class DomainEventOutbox {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    @Index()
    eventType: string;

    @Column({ type: 'enum', enum: AggregateType })
    aggregateType: AggregateType;

    @Column({ type: 'uuid' })
    aggregateId: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        userId?: string;
        tenantId?: string;
        correlationId?: string;
        version?: number;
    };

    @Column({ type: 'enum', enum: DomainEventStatus, default: DomainEventStatus.Pending })
    @Index()
    status: DomainEventStatus;

    @Column({ type: 'int', default: 0 })
    retryCount: number;

    @Column({ type: 'text', nullable: true })
    lastError: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    publishedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date;
}
