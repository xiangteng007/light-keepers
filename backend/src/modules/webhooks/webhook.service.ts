/**
 * Webhook Service
 * Outbound webhook delivery with retry logic
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CacheService } from '../cache/cache.service';
import { firstValueFrom } from 'rxjs';

export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    secret?: string;
    events: string[];
    enabled: boolean;
    headers?: Record<string, string>;
    retryCount: number;
    retryDelayMs: number;
    timeoutMs: number;
    createdAt: Date;
    lastTriggered?: Date;
    successCount: number;
    failureCount: number;
}

export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: string;
    payload: any;
    status: 'pending' | 'success' | 'failed';
    attempts: number;
    lastAttemptAt?: Date;
    responseStatus?: number;
    responseBody?: string;
    error?: string;
    createdAt: Date;
}

export interface WebhookPayload {
    event: string;
    timestamp: string;
    data: any;
    signature?: string;
}

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);
    private readonly WEBHOOKS_KEY = 'webhooks:config';
    private readonly DELIVERIES_KEY = 'webhooks:deliveries';
    private webhooksCache: WebhookConfig[] = [];

    constructor(
        private httpService: HttpService,
        private cache: CacheService,
    ) {
        this.loadWebhooks();
    }

    // ==================== Webhook Management ====================

    /**
     * Register a new webhook
     */
    async registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'successCount' | 'failureCount'>): Promise<WebhookConfig> {
        const webhook: WebhookConfig = {
            ...config,
            id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            successCount: 0,
            failureCount: 0,
        };

        this.webhooksCache.push(webhook);
        await this.saveWebhooks();

        this.logger.log(`Registered webhook: ${webhook.name} -> ${webhook.url}`);
        return webhook;
    }

    /**
     * Get all webhooks
     */
    async getAllWebhooks(): Promise<WebhookConfig[]> {
        return this.webhooksCache;
    }

    /**
     * Get webhook by ID
     */
    async getWebhook(id: string): Promise<WebhookConfig | null> {
        return this.webhooksCache.find(w => w.id === id) || null;
    }

    /**
     * Update a webhook
     */
    async updateWebhook(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
        const index = this.webhooksCache.findIndex(w => w.id === id);
        if (index === -1) return null;

        this.webhooksCache[index] = { ...this.webhooksCache[index], ...updates };
        await this.saveWebhooks();

        return this.webhooksCache[index];
    }

    /**
     * Delete a webhook
     */
    async deleteWebhook(id: string): Promise<boolean> {
        const index = this.webhooksCache.findIndex(w => w.id === id);
        if (index === -1) return false;

        this.webhooksCache.splice(index, 1);
        await this.saveWebhooks();

        return true;
    }

    // ==================== Event Triggering ====================

    /**
     * Trigger webhooks for an event
     */
    async trigger(event: string, data: any): Promise<void> {
        const webhooks = this.webhooksCache.filter(
            w => w.enabled && w.events.includes(event)
        );

        for (const webhook of webhooks) {
            this.deliverWebhook(webhook, event, data).catch(err => {
                this.logger.error(`Webhook delivery failed for ${webhook.name}:`, err);
            });
        }
    }

    /**
     * Deliver webhook with retry logic
     */
    private async deliverWebhook(
        webhook: WebhookConfig,
        event: string,
        data: any
    ): Promise<void> {
        const delivery: WebhookDelivery = {
            id: `delivery-${Date.now()}`,
            webhookId: webhook.id,
            event,
            payload: data,
            status: 'pending',
            attempts: 0,
            createdAt: new Date(),
        };

        const payload: WebhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            data,
        };

        // Generate signature if secret is set
        if (webhook.secret) {
            payload.signature = this.generateSignature(payload, webhook.secret);
        }

        for (let attempt = 0; attempt <= webhook.retryCount; attempt++) {
            delivery.attempts = attempt + 1;
            delivery.lastAttemptAt = new Date();

            try {
                const response = await firstValueFrom(
                    this.httpService.post(webhook.url, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Webhook-Event': event,
                            'X-Webhook-Delivery': delivery.id,
                            'X-Webhook-Signature': payload.signature || '',
                            ...webhook.headers,
                        },
                        timeout: webhook.timeoutMs,
                    })
                );

                delivery.status = 'success';
                delivery.responseStatus = response.status;
                delivery.responseBody = JSON.stringify(response.data).slice(0, 1000);

                await this.updateWebhookStats(webhook.id, true);
                this.logger.log(`Webhook delivered: ${webhook.name} (${event})`);

                await this.saveDelivery(delivery);
                return;
            } catch (error: any) {
                delivery.error = error.message;
                delivery.responseStatus = error.response?.status;

                if (attempt < webhook.retryCount) {
                    this.logger.warn(`Webhook retry ${attempt + 1}/${webhook.retryCount}: ${webhook.name}`);
                    await this.delay(webhook.retryDelayMs * (attempt + 1)); // Exponential backoff
                }
            }
        }

        // All retries failed
        delivery.status = 'failed';
        await this.updateWebhookStats(webhook.id, false);
        await this.saveDelivery(delivery);

        this.logger.error(`Webhook failed after ${delivery.attempts} attempts: ${webhook.name}`);
    }

    // ==================== Deliveries ====================

    /**
     * Get recent deliveries
     */
    async getDeliveries(webhookId?: string, limit = 50): Promise<WebhookDelivery[]> {
        const deliveries = await this.cache.get<WebhookDelivery[]>(this.DELIVERIES_KEY) || [];

        let filtered = webhookId
            ? deliveries.filter(d => d.webhookId === webhookId)
            : deliveries;

        return filtered
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }

    /**
     * Retry a failed delivery
     */
    async retryDelivery(deliveryId: string): Promise<boolean> {
        const deliveries = await this.cache.get<WebhookDelivery[]>(this.DELIVERIES_KEY) || [];
        const delivery = deliveries.find(d => d.id === deliveryId);

        if (!delivery || delivery.status !== 'failed') {
            return false;
        }

        const webhook = await this.getWebhook(delivery.webhookId);
        if (!webhook) {
            return false;
        }

        await this.deliverWebhook(webhook, delivery.event, delivery.payload);
        return true;
    }

    // ==================== Helpers ====================

    private generateSignature(payload: any, secret: string): string {
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return `sha256=${hmac.digest('hex')}`;
    }

    private async updateWebhookStats(id: string, success: boolean): Promise<void> {
        const index = this.webhooksCache.findIndex(w => w.id === id);
        if (index === -1) return;

        const webhook = this.webhooksCache[index];
        webhook.lastTriggered = new Date();

        if (success) {
            webhook.successCount++;
        } else {
            webhook.failureCount++;
        }

        await this.saveWebhooks();
    }

    private async saveDelivery(delivery: WebhookDelivery): Promise<void> {
        const deliveries = await this.cache.get<WebhookDelivery[]>(this.DELIVERIES_KEY) || [];
        deliveries.unshift(delivery);

        // Keep only last 500 deliveries
        if (deliveries.length > 500) {
            deliveries.length = 500;
        }

        await this.cache.set(this.DELIVERIES_KEY, deliveries, { ttl: 86400 * 7 }); // 7 days
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async loadWebhooks(): Promise<void> {
        try {
            const webhooks = await this.cache.get<WebhookConfig[]>(this.WEBHOOKS_KEY);
            this.webhooksCache = webhooks || [];
        } catch (error) {
            this.logger.error('Failed to load webhooks', error);
        }
    }

    private async saveWebhooks(): Promise<void> {
        await this.cache.set(this.WEBHOOKS_KEY, this.webhooksCache, { ttl: 0 });
    }
}
