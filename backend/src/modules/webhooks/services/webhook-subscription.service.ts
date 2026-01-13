/**
 * Webhook Subscription Service
 * 
 * Manages webhook subscriptions for external systems
 * v1.0
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { WebhookSubscription, WebhookEventType } from '../entities/webhook-subscription.entity';

export interface CreateSubscriptionDto {
    name: string;
    url: string;
    description?: string;
    events: WebhookEventType[];
    headers?: Record<string, string>;
    maxRetries?: number;
    timeoutMs?: number;
    verifySSL?: boolean;
    tenantId?: string;
}

export interface UpdateSubscriptionDto {
    name?: string;
    url?: string;
    description?: string;
    events?: WebhookEventType[];
    active?: boolean;
    headers?: Record<string, string>;
    maxRetries?: number;
    timeoutMs?: number;
    verifySSL?: boolean;
}

@Injectable()
export class WebhookSubscriptionService {
    private readonly logger = new Logger(WebhookSubscriptionService.name);

    constructor(
        @InjectRepository(WebhookSubscription)
        private readonly subscriptionRepo: Repository<WebhookSubscription>,
    ) { }

    /**
     * Generate a secure secret for HMAC signing
     */
    private generateSecret(): string {
        return 'whsec_' + crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create a new webhook subscription
     */
    async create(dto: CreateSubscriptionDto, createdBy?: string): Promise<WebhookSubscription> {
        // Validate URL
        try {
            new URL(dto.url);
        } catch {
            throw new BadRequestException('Invalid webhook URL');
        }

        // Validate events
        if (!dto.events || dto.events.length === 0) {
            throw new BadRequestException('At least one event type is required');
        }

        const subscription = this.subscriptionRepo.create({
            ...dto,
            secret: this.generateSecret(),
            createdBy,
        });

        const saved = await this.subscriptionRepo.save(subscription);
        this.logger.log(`Created webhook subscription: ${saved.id} for ${saved.url}`);

        return saved;
    }

    /**
     * Get all subscriptions (optionally filtered by tenant)
     */
    async findAll(tenantId?: string): Promise<WebhookSubscription[]> {
        const query = this.subscriptionRepo.createQueryBuilder('ws');

        if (tenantId) {
            query.where('ws.tenantId = :tenantId', { tenantId });
        }

        return query.orderBy('ws.createdAt', 'DESC').getMany();
    }

    /**
     * Get active subscriptions for a specific event type
     */
    async findByEventType(eventType: WebhookEventType): Promise<WebhookSubscription[]> {
        const subscriptions = await this.subscriptionRepo
            .createQueryBuilder('ws')
            .where('ws.active = :active', { active: true })
            .andWhere('ws.failureCount < ws.maxRetries')
            .getMany();

        // Filter by event type (including wildcard)
        return subscriptions.filter(sub =>
            sub.events.includes(eventType) || sub.events.includes(WebhookEventType.ALL)
        );
    }

    /**
     * Get a single subscription by ID
     */
    async findById(id: string): Promise<WebhookSubscription> {
        const subscription = await this.subscriptionRepo.findOne({ where: { id } });
        if (!subscription) {
            throw new NotFoundException(`Webhook subscription ${id} not found`);
        }
        return subscription;
    }

    /**
     * Update a subscription
     */
    async update(id: string, dto: UpdateSubscriptionDto): Promise<WebhookSubscription> {
        const subscription = await this.findById(id);

        if (dto.url) {
            try {
                new URL(dto.url);
            } catch {
                throw new BadRequestException('Invalid webhook URL');
            }
        }

        Object.assign(subscription, dto);

        // Reset failure count if reactivating
        if (dto.active === true && subscription.failureCount > 0) {
            subscription.failureCount = 0;
            subscription.lastError = undefined;
        }

        const saved = await this.subscriptionRepo.save(subscription);
        this.logger.log(`Updated webhook subscription: ${saved.id}`);

        return saved;
    }

    /**
     * Delete a subscription
     */
    async delete(id: string): Promise<void> {
        const subscription = await this.findById(id);
        await this.subscriptionRepo.remove(subscription);
        this.logger.log(`Deleted webhook subscription: ${id}`);
    }

    /**
     * Regenerate secret for a subscription
     */
    async regenerateSecret(id: string): Promise<string> {
        const subscription = await this.findById(id);
        subscription.secret = this.generateSecret();
        await this.subscriptionRepo.save(subscription);
        this.logger.log(`Regenerated secret for webhook subscription: ${id}`);
        return subscription.secret;
    }

    /**
     * Record delivery success
     */
    async recordSuccess(id: string): Promise<void> {
        await this.subscriptionRepo.update(id, {
            lastSuccessAt: new Date(),
            failureCount: 0,
            lastError: undefined,
        });
    }

    /**
     * Record delivery failure
     */
    async recordFailure(id: string, error: string): Promise<void> {
        const subscription = await this.findById(id);
        subscription.failureCount += 1;
        subscription.lastFailureAt = new Date();
        subscription.lastError = error;

        // Deactivate if max retries exceeded
        if (subscription.failureCount >= subscription.maxRetries) {
            subscription.active = false;
            this.logger.warn(`Deactivated webhook ${id} after ${subscription.failureCount} failures`);
        }

        await this.subscriptionRepo.save(subscription);
    }

    /**
     * Get subscription statistics
     */
    async getStats(): Promise<{
        total: number;
        active: number;
        failed: number;
        byEventType: Record<string, number>;
    }> {
        const all = await this.subscriptionRepo.find();

        const eventCounts: Record<string, number> = {};
        all.forEach(sub => {
            sub.events.forEach(event => {
                eventCounts[event] = (eventCounts[event] || 0) + 1;
            });
        });

        return {
            total: all.length,
            active: all.filter(s => s.active && s.failureCount < s.maxRetries).length,
            failed: all.filter(s => s.failureCount >= s.maxRetries).length,
            byEventType: eventCounts,
        };
    }

    /**
     * Test a webhook endpoint
     */
    async testEndpoint(id: string): Promise<{ success: boolean; responseTime: number; error?: string }> {
        const subscription = await this.findById(id);
        const startTime = Date.now();

        try {
            const testPayload = {
                event: 'test',
                timestamp: new Date().toISOString(),
                data: { message: 'Webhook test from Light Keepers' },
            };

            const signature = this.generateSignature(testPayload, subscription.secret);

            const response = await fetch(subscription.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Lightkeepers-Signature': signature,
                    'X-Lightkeepers-Timestamp': startTime.toString(),
                    ...subscription.headers,
                },
                body: JSON.stringify(testPayload),
                signal: AbortSignal.timeout(subscription.timeoutMs),
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                return { success: true, responseTime };
            } else {
                return {
                    success: false,
                    responseTime,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                };
            }
        } catch (error: any) {
            return {
                success: false,
                responseTime: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    /**
     * Generate HMAC signature for payload
     */
    generateSignature(payload: any, secret: string): string {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return 'sha256=' + hmac.digest('hex');
    }
}
