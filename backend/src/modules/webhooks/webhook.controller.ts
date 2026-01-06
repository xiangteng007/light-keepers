/**
 * Webhook Controller
 * REST API for webhook management
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WebhookService, WebhookConfig } from './webhook.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

class CreateWebhookDto {
    name: string;
    url: string;
    secret?: string;
    events: string[];
    enabled?: boolean;
    headers?: Record<string, string>;
    retryCount?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
}

@Controller('webhooks')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class WebhookController {
    constructor(private webhookService: WebhookService) { }

    /**
     * Get all webhooks
     */
    @Get()
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getAllWebhooks() {
        const webhooks = await this.webhookService.getAllWebhooks();
        return { success: true, data: webhooks };
    }

    /**
     * Get available events
     */
    @Get('events')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getEvents() {
        const events = [
            'sos.created',
            'sos.acknowledged',
            'sos.resolved',
            'report.created',
            'report.updated',
            'task.created',
            'task.assigned',
            'task.completed',
            'mission.started',
            'mission.ended',
            'alert.triggered',
            'user.registered',
            'volunteer.approved',
        ];
        return { success: true, data: events };
    }

    /**
     * Register a new webhook
     */
    @Post()
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async createWebhook(@Body() dto: CreateWebhookDto) {
        const webhook = await this.webhookService.registerWebhook({
            name: dto.name,
            url: dto.url,
            secret: dto.secret,
            events: dto.events,
            enabled: dto.enabled ?? true,
            headers: dto.headers,
            retryCount: dto.retryCount ?? 3,
            retryDelayMs: dto.retryDelayMs ?? 1000,
            timeoutMs: dto.timeoutMs ?? 10000,
        });
        return { success: true, data: webhook };
    }

    /**
     * Get webhook by ID
     */
    @Get(':id')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getWebhook(@Param('id') id: string) {
        const webhook = await this.webhookService.getWebhook(id);
        if (!webhook) {
            return { success: false, error: 'Webhook not found' };
        }
        return { success: true, data: webhook };
    }

    /**
     * Update a webhook
     */
    @Put(':id')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async updateWebhook(@Param('id') id: string, @Body() dto: Partial<CreateWebhookDto>) {
        const webhook = await this.webhookService.updateWebhook(id, dto as Partial<WebhookConfig>);
        if (!webhook) {
            return { success: false, error: 'Webhook not found' };
        }
        return { success: true, data: webhook };
    }

    /**
     * Delete a webhook
     */
    @Delete(':id')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async deleteWebhook(@Param('id') id: string) {
        const deleted = await this.webhookService.deleteWebhook(id);
        return { success: deleted };
    }

    /**
     * Get webhook deliveries
     */
    @Get(':id/deliveries')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getDeliveries(
        @Param('id') id: string,
        @Query('limit') limit?: string
    ) {
        const deliveries = await this.webhookService.getDeliveries(id, Number(limit) || 50);
        return { success: true, data: deliveries };
    }

    /**
     * Test a webhook
     */
    @Post(':id/test')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async testWebhook(@Param('id') id: string) {
        const webhook = await this.webhookService.getWebhook(id);
        if (!webhook) {
            return { success: false, error: 'Webhook not found' };
        }

        await this.webhookService.trigger('webhook.test', {
            message: 'This is a test webhook delivery',
            webhookId: id,
            timestamp: new Date().toISOString(),
        });

        return { success: true, message: 'Test webhook sent' };
    }

    /**
     * Retry a failed delivery
     */
    @Post('deliveries/:deliveryId/retry')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async retryDelivery(@Param('deliveryId') deliveryId: string) {
        const success = await this.webhookService.retryDelivery(deliveryId);
        return { success };
    }
}
