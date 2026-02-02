/**
 * Webhook Management Controller
 * 
 * API endpoints for webhook subscription management
 * v1.0
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import {
    WebhookSubscriptionService,
    CreateSubscriptionDto,
    UpdateSubscriptionDto,
} from './services/webhook-subscription.service';
import { WebhookDispatcherService, WebhookEvent } from './services/webhook-dispatcher.service';
import { WebhookEventType } from './entities/webhook-subscription.entity';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@ApiBearerAuth()
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        private readonly subscriptionService: WebhookSubscriptionService,
        private readonly dispatcherService: WebhookDispatcherService,
    ) { }

    // ===== Subscription Management =====

    @Get('subscriptions')
    @ApiOperation({ summary: 'List all webhook subscriptions' })
    @RequiredLevel(3)
    async listSubscriptions(@Query('tenantId') tenantId?: string) {
        const subscriptions = await this.subscriptionService.findAll(tenantId);
        return {
            success: true,
            data: subscriptions,
            total: subscriptions.length,
        };
    }

    @Get('subscriptions/:id')
    @ApiOperation({ summary: 'Get a webhook subscription by ID' })
    @RequiredLevel(3)
    async getSubscription(@Param('id') id: string) {
        const subscription = await this.subscriptionService.findById(id);
        return {
            success: true,
            data: subscription,
        };
    }

    @Post('subscriptions')
    @ApiOperation({ summary: 'Create a new webhook subscription' })
    @RequiredLevel(4)
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'My System Webhook' },
                url: { type: 'string', example: 'https://myapp.com/webhooks/lightkeepers' },
                events: { type: 'array', items: { type: 'string' }, example: ['task.created', 'alert.created'] },
                description: { type: 'string' },
            },
            required: ['name', 'url', 'events'],
        },
    })
    async createSubscription(@Body() dto: CreateSubscriptionDto) {
        const subscription = await this.subscriptionService.create(dto);
        return {
            success: true,
            message: 'Webhook 訂閱已建立',
            data: subscription,
        };
    }

    @Put('subscriptions/:id')
    @ApiOperation({ summary: 'Update a webhook subscription' })
    @RequiredLevel(4)
    async updateSubscription(
        @Param('id') id: string,
        @Body() dto: UpdateSubscriptionDto,
    ) {
        const subscription = await this.subscriptionService.update(id, dto);
        return {
            success: true,
            message: 'Webhook 訂閱已更新',
            data: subscription,
        };
    }

    @Delete('subscriptions/:id')
    @ApiOperation({ summary: 'Delete a webhook subscription' })
    @RequiredLevel(5)
    async deleteSubscription(@Param('id') id: string) {
        await this.subscriptionService.delete(id);
        return {
            success: true,
            message: 'Webhook 訂閱已刪除',
        };
    }

    @Post('subscriptions/:id/regenerate-secret')
    @ApiOperation({ summary: 'Regenerate webhook secret' })
    @RequiredLevel(4)
    async regenerateSecret(@Param('id') id: string) {
        const newSecret = await this.subscriptionService.regenerateSecret(id);
        return {
            success: true,
            message: '已重新產生 Webhook 密鑰',
            data: { secret: newSecret },
        };
    }

    @Post('subscriptions/:id/test')
    @ApiOperation({ summary: 'Test a webhook endpoint' })
    @RequiredLevel(3)
    async testSubscription(@Param('id') id: string) {
        const result = await this.subscriptionService.testEndpoint(id);
        return {
            success: result.success,
            message: result.success ? '測試成功' : '測試失敗',
            data: result,
        };
    }

    @Post('subscriptions/:id/enable')
    @ApiOperation({ summary: 'Enable a webhook subscription' })
    @RequiredLevel(4)
    async enableSubscription(@Param('id') id: string) {
        const subscription = await this.subscriptionService.update(id, { active: true });
        return {
            success: true,
            message: 'Webhook 訂閱已啟用',
            data: subscription,
        };
    }

    @Post('subscriptions/:id/disable')
    @ApiOperation({ summary: 'Disable a webhook subscription' })
    @RequiredLevel(4)
    async disableSubscription(@Param('id') id: string) {
        const subscription = await this.subscriptionService.update(id, { active: false });
        return {
            success: true,
            message: 'Webhook 訂閱已停用',
            data: subscription,
        };
    }

    // ===== Event Types =====

    @Get('event-types')
    @ApiOperation({ summary: 'List all available webhook event types' })
    @RequiredLevel(2)
    async getEventTypes() {
        const eventTypes = Object.values(WebhookEventType);
        return {
            success: true,
            data: eventTypes.map(type => ({
                type,
                description: this.getEventDescription(type),
            })),
        };
    }

    private getEventDescription(type: WebhookEventType): string {
        const descriptions: Record<WebhookEventType, string> = {
            [WebhookEventType.ALERT_CREATED]: '新警報建立',
            [WebhookEventType.ALERT_UPDATED]: '警報更新',
            [WebhookEventType.ALERT_RESOLVED]: '警報已解除',
            [WebhookEventType.TASK_CREATED]: '新任務建立',
            [WebhookEventType.TASK_ASSIGNED]: '任務已指派',
            [WebhookEventType.TASK_STARTED]: '任務開始執行',
            [WebhookEventType.TASK_COMPLETED]: '任務已完成',
            [WebhookEventType.TASK_CANCELLED]: '任務已取消',
            [WebhookEventType.RESOURCE_LOW]: '資源存量低於警戒值',
            [WebhookEventType.RESOURCE_DEPLETED]: '資源已耗盡',
            [WebhookEventType.RESOURCE_RESTOCKED]: '資源已補充',
            [WebhookEventType.VOLUNTEER_CHECKIN]: '志工簽到',
            [WebhookEventType.VOLUNTEER_CHECKOUT]: '志工簽退',
            [WebhookEventType.VOLUNTEER_DISPATCH]: '志工出勤派遣',
            [WebhookEventType.MISSION_STARTED]: '任務開始',
            [WebhookEventType.MISSION_ENDED]: '任務結束',
            [WebhookEventType.MISSION_ESCALATED]: '任務升級',
            [WebhookEventType.SYSTEM_ALERT]: '系統警示',
            [WebhookEventType.SYNC_COMPLETED]: '資料同步完成',
            [WebhookEventType.ALL]: '所有事件 (萬用)',
        };
        return descriptions[type] || type;
    }

    // ===== Delivery Logs =====

    @Get('logs')
    @ApiOperation({ summary: 'Get webhook delivery logs' })
    @ApiQuery({ name: 'subscriptionId', required: false })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @RequiredLevel(3)
    async getDeliveryLogs(
        @Query('subscriptionId') subscriptionId?: string,
        @Query('limit') limit?: number,
    ) {
        const logs = await this.dispatcherService.getRecentLogs(subscriptionId, limit || 50);
        return {
            success: true,
            data: logs,
            total: logs.length,
        };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get webhook statistics' })
    @RequiredLevel(3)
    async getStats(@Query('subscriptionId') subscriptionId?: string) {
        const [subStats, deliveryStats] = await Promise.all([
            this.subscriptionService.getStats(),
            this.dispatcherService.getDeliveryStats(subscriptionId),
        ]);

        return {
            success: true,
            data: {
                subscriptions: subStats,
                deliveries: deliveryStats,
            },
        };
    }

    // ===== Manual Dispatch (for testing) =====

    @Post('dispatch')
    @ApiOperation({ summary: 'Manually dispatch a webhook event (testing)' })
    @RequiredLevel(5)
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                type: { type: 'string', example: 'task.created' },
                data: { type: 'object', example: { id: '123', title: 'Test Task' } },
            },
            required: ['type', 'data'],
        },
    })
    async manualDispatch(@Body() event: WebhookEvent) {
        const deliveryIds = await this.dispatcherService.dispatch(event);
        return {
            success: true,
            message: `事件已派送至 ${deliveryIds.length} 個訂閱`,
            data: { deliveryIds },
        };
    }
}
