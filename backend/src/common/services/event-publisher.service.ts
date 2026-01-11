/**
 * event-publisher.service.ts
 * 
 * P3: Outbox Pattern - Event Publisher Service
 * 
 * Provides methods to:
 * - Publish domain events to the outbox (transactionally)
 * - Process pending events from the outbox
 * - Handle retries and dead-letter scenarios
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DomainEventOutbox, DomainEventStatus, AggregateType } from '../entities/domain-events.entity';
import { v4 as uuidv4 } from 'uuid';

export interface PublishEventOptions {
    eventType: string;
    aggregateType: AggregateType;
    aggregateId: string;
    payload: Record<string, unknown>;
    metadata?: {
        userId?: string;
        tenantId?: string;
        correlationId?: string;
    };
}

@Injectable()
export class EventPublisherService implements OnModuleInit {
    private readonly logger = new Logger(EventPublisherService.name);
    private readonly MAX_RETRIES = 5;
    private readonly BATCH_SIZE = 100;

    constructor(
        @InjectRepository(DomainEventOutbox)
        private readonly outboxRepository: Repository<DomainEventOutbox>,
        private readonly dataSource: DataSource,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.logger.log('EventPublisherService initialized - Outbox Pattern active');
    }

    /**
     * Publish an event to the outbox within a transaction
     * This ensures the event is stored atomically with the business operation
     */
    async publish(
        options: PublishEventOptions,
        entityManager?: EntityManager,
    ): Promise<DomainEventOutbox> {
        const event = new DomainEventOutbox();
        event.eventType = options.eventType;
        event.aggregateType = options.aggregateType;
        event.aggregateId = options.aggregateId;
        event.payload = options.payload;
        event.metadata = {
            ...options.metadata,
            correlationId: options.metadata?.correlationId || uuidv4(),
            version: 1,
        };
        event.status = DomainEventStatus.Pending;

        const repo = entityManager
            ? entityManager.getRepository(DomainEventOutbox)
            : this.outboxRepository;

        const savedEvent = await repo.save(event);
        this.logger.debug(`Event published to outbox: ${options.eventType} [${savedEvent.id}]`);

        return savedEvent;
    }

    /**
     * Publish event within a transaction with other entities
     */
    async publishWithTransaction<T>(
        operations: (manager: EntityManager) => Promise<T>,
        events: PublishEventOptions[],
    ): Promise<{ result: T; events: DomainEventOutbox[] }> {
        return this.dataSource.transaction(async (manager) => {
            const result = await operations(manager);

            const publishedEvents: DomainEventOutbox[] = [];
            for (const eventOptions of events) {
                const event = await this.publish(eventOptions, manager);
                publishedEvents.push(event);
            }

            return { result, events: publishedEvents };
        });
    }

    /**
     * Process pending events from the outbox
     * Called by scheduler or can be triggered manually
     */
    @Cron(CronExpression.EVERY_5_SECONDS)
    async processOutbox(): Promise<number> {
        const pendingEvents = await this.outboxRepository.find({
            where: {
                status: DomainEventStatus.Pending,
            },
            order: { createdAt: 'ASC' },
            take: this.BATCH_SIZE,
        });

        if (pendingEvents.length === 0) {
            return 0;
        }

        this.logger.debug(`Processing ${pendingEvents.length} pending events`);

        let processedCount = 0;
        for (const event of pendingEvents) {
            try {
                // Emit the event to local listeners
                await this.eventEmitter.emitAsync(event.eventType, {
                    eventId: event.id,
                    eventType: event.eventType,
                    aggregateType: event.aggregateType,
                    aggregateId: event.aggregateId,
                    payload: event.payload,
                    metadata: event.metadata,
                    createdAt: event.createdAt,
                });

                // Mark as published
                event.status = DomainEventStatus.Published;
                event.publishedAt = new Date();
                event.processedAt = new Date();
                await this.outboxRepository.save(event);

                processedCount++;
                this.logger.debug(`Event processed: ${event.eventType} [${event.id}]`);
            } catch (error) {
                event.retryCount++;
                event.lastError = error.message;

                if (event.retryCount >= this.MAX_RETRIES) {
                    event.status = DomainEventStatus.Failed;
                    this.logger.error(
                        `Event failed after ${this.MAX_RETRIES} retries: ${event.eventType} [${event.id}]`,
                        error.stack,
                    );
                }

                await this.outboxRepository.save(event);
            }
        }

        return processedCount;
    }

    /**
     * Cleanup old processed events (retention: 7 days)
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async cleanupOldEvents(): Promise<number> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const result = await this.outboxRepository.delete({
            status: DomainEventStatus.Published,
            processedAt: LessThan(sevenDaysAgo),
        });

        this.logger.log(`Cleaned up ${result.affected} old events`);
        return result.affected || 0;
    }

    /**
     * Get failed events for manual review
     */
    async getFailedEvents(limit = 50): Promise<DomainEventOutbox[]> {
        return this.outboxRepository.find({
            where: { status: DomainEventStatus.Failed },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Retry a specific failed event
     */
    async retryEvent(eventId: string): Promise<DomainEventOutbox> {
        const event = await this.outboxRepository.findOneBy({ id: eventId });
        if (!event) {
            throw new Error(`Event not found: ${eventId}`);
        }

        event.status = DomainEventStatus.Pending;
        event.retryCount = 0;
        event.lastError = undefined as unknown as string;

        return this.outboxRepository.save(event);
    }
}
