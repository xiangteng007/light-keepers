/**
 * Webhook Dispatcher Service
 * 
 * Handles asynchronous dispatch of webhook events with retry logic
 * v1.0
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { WebhookSubscription, WebhookEventType } from '../entities/webhook-subscription.entity';
import { WebhookDeliveryLog, DeliveryStatus } from '../entities/webhook-delivery-log.entity';
import { WebhookSubscriptionService } from './webhook-subscription.service';

export interface WebhookEvent {
    type: WebhookEventType;
    data: any;
    timestamp?: Date;
    sourceId?: string;
    tenantId?: string;
}

@Injectable()
export class WebhookDispatcherService implements OnModuleInit {
    private readonly logger = new Logger(WebhookDispatcherService.name);
    private isProcessing = false;

    constructor(
        @InjectRepository(WebhookDeliveryLog)
        private readonly deliveryLogRepo: Repository<WebhookDeliveryLog>,
        private readonly subscriptionService: WebhookSubscriptionService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.logger.log('Webhook Dispatcher Service initialized');
    }

    /**
     * Dispatch an event to all matching subscriptions
     */
    async dispatch(event: WebhookEvent): Promise<string[]> {
        const subscriptions = await this.subscriptionService.findByEventType(event.type);

        if (subscriptions.length === 0) {
            this.logger.debug(`No subscriptions found for event: ${event.type}`);
            return [];
        }

        const deliveryIds: string[] = [];

        for (const subscription of subscriptions) {
            // Create delivery log entry
            const deliveryLog = this.deliveryLogRepo.create({
                subscriptionId: subscription.id,
                eventType: event.type,
                payload: {
                    event: event.type,
                    timestamp: event.timestamp || new Date().toISOString(),
                    data: event.data,
                    sourceId: event.sourceId,
                },
                status: DeliveryStatus.PENDING,
            });

            const saved = await this.deliveryLogRepo.save(deliveryLog);
            deliveryIds.push(saved.id);

            // Dispatch immediately (async)
            this.deliverWebhook(saved.id, subscription).catch(err => {
                this.logger.error(`Failed to deliver webhook ${saved.id}: ${err.message}`);
            });
        }

        this.logger.log(`Dispatched event ${event.type} to ${subscriptions.length} subscriptions`);
        return deliveryIds;
    }

    /**
     * Deliver a single webhook
     */
    private async deliverWebhook(deliveryId: string, subscription: WebhookSubscription): Promise<void> {
        const delivery = await this.deliveryLogRepo.findOne({ where: { id: deliveryId } });
        if (!delivery) return;

        const startTime = Date.now();

        try {
            // Generate signature
            const timestamp = Date.now().toString();
            const signature = this.generateSignature(delivery.payload, subscription.secret, timestamp);

            // Make HTTP request
            const response = await fetch(subscription.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Lightkeepers-Signature': signature,
                    'X-Lightkeepers-Timestamp': timestamp,
                    'X-Lightkeepers-Delivery-ID': deliveryId,
                    'X-Lightkeepers-Event': delivery.eventType,
                    'User-Agent': 'Lightkeepers-Webhook/1.0',
                    ...subscription.headers,
                },
                body: JSON.stringify(delivery.payload),
                signal: AbortSignal.timeout(subscription.timeoutMs),
            });

            const durationMs = Date.now() - startTime;
            const responseBody = await response.text().catch(() => '');

            if (response.ok) {
                // Success
                delivery.status = DeliveryStatus.SUCCESS;
                delivery.responseStatus = response.status;
                delivery.responseBody = responseBody.substring(0, 1000);
                delivery.durationMs = durationMs;
                delivery.deliveredAt = new Date();
                delivery.attempt += 1;

                await this.deliveryLogRepo.save(delivery);
                await this.subscriptionService.recordSuccess(subscription.id);

                this.logger.log(`Webhook delivered: ${deliveryId} to ${subscription.url} in ${durationMs}ms`);
            } else {
                // Non-2xx response
                throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`);
            }
        } catch (error: any) {
            const durationMs = Date.now() - startTime;

            delivery.status = DeliveryStatus.FAILED;
            delivery.error = error.message;
            delivery.durationMs = durationMs;
            delivery.attempt += 1;

            // Calculate next retry with exponential backoff
            if (delivery.attempt < subscription.maxRetries) {
                const backoffMs = Math.min(
                    1000 * Math.pow(2, delivery.attempt), // 2s, 4s, 8s, ...
                    60 * 60 * 1000 // Max 1 hour
                );
                delivery.status = DeliveryStatus.RETRYING;
                delivery.nextRetryAt = new Date(Date.now() + backoffMs);
            }

            await this.deliveryLogRepo.save(delivery);
            await this.subscriptionService.recordFailure(subscription.id, error.message);

            this.logger.warn(`Webhook delivery failed: ${deliveryId} - ${error.message}`);
        }
    }

    /**
     * Generate HMAC-SHA256 signature
     */
    private generateSignature(payload: any, secret: string, timestamp: string): string {
        const signatureBase = `${timestamp}.${JSON.stringify(payload)}`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(signatureBase);
        return 'v1=' + hmac.digest('hex');
    }

    /**
     * Process pending retries (runs every minute)
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async processRetries(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const pendingRetries = await this.deliveryLogRepo.find({
                where: {
                    status: DeliveryStatus.RETRYING,
                    nextRetryAt: LessThan(new Date()),
                },
                take: 50,
            });

            if (pendingRetries.length > 0) {
                this.logger.log(`Processing ${pendingRetries.length} pending webhook retries`);

                for (const delivery of pendingRetries) {
                    try {
                        const subscription = await this.subscriptionService.findById(delivery.subscriptionId);
                        await this.deliverWebhook(delivery.id, subscription);
                    } catch (error: any) {
                        this.logger.error(`Retry failed for ${delivery.id}: ${error.message}`);
                    }
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Clean up old delivery logs (runs daily)
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async cleanupOldLogs(): Promise<void> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await this.deliveryLogRepo.delete({
            createdAt: LessThan(thirtyDaysAgo),
            status: DeliveryStatus.SUCCESS,
        });

        if (result.affected && result.affected > 0) {
            this.logger.log(`Cleaned up ${result.affected} old webhook delivery logs`);
        }
    }

    /**
     * Get delivery statistics
     */
    async getDeliveryStats(subscriptionId?: string): Promise<{
        total: number;
        success: number;
        failed: number;
        pending: number;
        avgDurationMs: number;
    }> {
        const query = this.deliveryLogRepo.createQueryBuilder('dl');

        if (subscriptionId) {
            query.where('dl.subscriptionId = :subscriptionId', { subscriptionId });
        }

        const logs = await query.getMany();

        const successLogs = logs.filter(l => l.status === DeliveryStatus.SUCCESS);
        const avgDuration = successLogs.length > 0
            ? successLogs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / successLogs.length
            : 0;

        return {
            total: logs.length,
            success: successLogs.length,
            failed: logs.filter(l => l.status === DeliveryStatus.FAILED).length,
            pending: logs.filter(l => l.status === DeliveryStatus.PENDING || l.status === DeliveryStatus.RETRYING).length,
            avgDurationMs: Math.round(avgDuration),
        };
    }

    /**
     * Get recent delivery logs
     */
    async getRecentLogs(subscriptionId?: string, limit = 50): Promise<WebhookDeliveryLog[]> {
        const query = this.deliveryLogRepo.createQueryBuilder('dl');

        if (subscriptionId) {
            query.where('dl.subscriptionId = :subscriptionId', { subscriptionId });
        }

        return query
            .orderBy('dl.createdAt', 'DESC')
            .take(limit)
            .getMany();
    }

    // ===== Event Listeners =====

    @OnEvent('alert.created')
    async onAlertCreated(payload: any) {
        await this.dispatch({
            type: WebhookEventType.ALERT_CREATED,
            data: payload,
        });
    }

    @OnEvent('task.created')
    async onTaskCreated(payload: any) {
        await this.dispatch({
            type: WebhookEventType.TASK_CREATED,
            data: payload,
        });
    }

    @OnEvent('task.completed')
    async onTaskCompleted(payload: any) {
        await this.dispatch({
            type: WebhookEventType.TASK_COMPLETED,
            data: payload,
        });
    }

    @OnEvent('mission.started')
    async onMissionStarted(payload: any) {
        await this.dispatch({
            type: WebhookEventType.MISSION_STARTED,
            data: payload,
        });
    }

    @OnEvent('resource.low')
    async onResourceLow(payload: any) {
        await this.dispatch({
            type: WebhookEventType.RESOURCE_LOW,
            data: payload,
        });
    }
}
