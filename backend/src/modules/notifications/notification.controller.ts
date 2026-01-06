/**
 * Notification Controller
 * REST API for notification management
 */

import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationQueueService, NotificationChannel, NotificationPriority } from './notification-queue.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

class SendNotificationDto {
    title: string;
    body: string;
    type?: string;
    recipients: string[];
    channels?: NotificationChannel[];
    priority?: NotificationPriority;
    data?: Record<string, any>;
    actionUrl?: string;
}

class RegisterTokenDto {
    token: string;
    platform?: 'ios' | 'android' | 'web';
}

@Controller('notifications')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class NotificationController {
    constructor(private readonly notificationQueue: NotificationQueueService) { }

    /**
     * Send a notification (admin only)
     */
    @Post('send')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async sendNotification(@Body() dto: SendNotificationDto) {
        const id = await this.notificationQueue.queue({
            type: dto.type || 'custom',
            title: dto.title,
            body: dto.body,
            recipients: dto.recipients,
            channels: dto.channels,
            priority: dto.priority,
            data: dto.data,
            actionUrl: dto.actionUrl,
        });

        return { success: true, data: { id } };
    }

    /**
     * Get notification result
     */
    @Get('result/:id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getResult(@Param('id') id: string) {
        const result = await this.notificationQueue.getResult(id);
        return { success: true, data: result };
    }

    /**
     * Register FCM token for push notifications
     */
    @Post('register-token')
    @RequiredLevel(ROLE_LEVELS.PUBLIC)
    async registerToken(@Req() req: any, @Body() dto: RegisterTokenDto) {
        const userId = req.user?.id || req.user?.uid;
        if (!userId) {
            return { success: false, error: 'User not authenticated' };
        }

        await this.notificationQueue.registerFcmToken(userId, dto.token);
        return { success: true, message: 'Token registered' };
    }

    /**
     * Send test notification to self
     */
    @Post('test')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async testNotification(@Req() req: any) {
        const userId = req.user?.id || req.user?.uid;
        if (!userId) {
            return { success: false, error: 'User not authenticated' };
        }

        const id = await this.notificationQueue.queue({
            type: 'test',
            title: '🔔 測試通知',
            body: '這是一則測試通知，如果您收到了表示通知功能正常運作。',
            recipients: [userId],
            channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
            priority: NotificationPriority.NORMAL,
        });

        return { success: true, data: { id } };
    }

    /**
     * Get notification preferences
     */
    @Get('preferences')
    @RequiredLevel(ROLE_LEVELS.PUBLIC)
    async getPreferences(@Req() req: any) {
        // Placeholder - would fetch from user settings
        return {
            success: true,
            data: {
                push: true,
                email: true,
                line: false,
                sms: false,
                quietHoursStart: null,
                quietHoursEnd: null,
            },
        };
    }
}
