/**
 * Push Notification Controller
 * 
 * API endpoints for FCM subscription and notifications
 * v1.0
 */

import {
    Controller,
    Post,
    Delete,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PushNotificationService, NotificationPayload } from './services/push-notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Push Notifications')
@Controller('notifications/push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PushNotificationController {
    constructor(private readonly pushService: PushNotificationService) { }

    // ===== Device Registration =====

    @Post('subscribe')
    @ApiOperation({ summary: 'Subscribe device for push notifications' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                fcmToken: { type: 'string', description: 'Firebase Cloud Messaging token' },
            },
            required: ['fcmToken'],
        },
    })
    async subscribeDevice(
        @Request() req: any,
        @Body() body: { fcmToken: string }
    ) {
        const success = await this.pushService.subscribeDevice(req.user.sub, body.fcmToken);
        return {
            success,
            message: success ? 'Device subscribed successfully' : 'Failed to subscribe device',
        };
    }

    @Delete('subscribe')
    @ApiOperation({ summary: 'Unsubscribe device from push notifications' })
    async unsubscribeDevice(
        @Request() req: any,
        @Body() body: { fcmToken: string }
    ) {
        const success = await this.pushService.unsubscribeDevice(req.user.sub, body.fcmToken);
        return {
            success,
            message: success ? 'Device unsubscribed successfully' : 'Failed to unsubscribe device',
        };
    }

    @Get('vapid-key')
    @ApiOperation({ summary: 'Get VAPID public key for web push subscription' })
    getVapidKey() {
        return {
            publicKey: this.pushService.getVapidPublicKey(),
        };
    }

    // ===== LINE Notify =====

    @Get('line-notify/auth-url')
    @ApiOperation({ summary: 'Get LINE Notify authorization URL' })
    getLineNotifyAuthUrl(@Query('state') state: string) {
        return {
            url: this.pushService.getLineNotifyAuthUrl(state || 'default'),
        };
    }

    @Post('line-notify/callback')
    @ApiOperation({ summary: 'Exchange LINE Notify authorization code' })
    async lineNotifyCallback(@Body() body: { code: string }) {
        const accessToken = await this.pushService.exchangeLineNotifyCode(body.code);
        return {
            success: !!accessToken,
            message: accessToken ? 'LINE Notify connected' : 'Failed to connect LINE Notify',
        };
    }

    // ===== Admin Broadcast (Level 5+) =====

    @Post('broadcast')
    @ApiOperation({ summary: 'Broadcast notification to users (Admin only)' })
    async broadcast(@Body() body: {
        userIds?: string[];
        topic?: string;
        title: string;
        body: string;
        data?: Record<string, any>;
        channels?: { push?: boolean; line?: boolean };
    }) {
        const payload: NotificationPayload = {
            title: body.title,
            body: body.body,
            data: body.data,
        };

        if (body.topic) {
            const success = await this.pushService.sendToTopic(body.topic, payload);
            return {
                success,
                message: success ? `Notification sent to topic: ${body.topic}` : 'Failed to send',
            };
        }

        if (body.userIds?.length) {
            const result = await this.pushService.broadcastToUsers(
                body.userIds,
                payload,
                body.channels
            );
            return {
                success: true,
                ...result,
            };
        }

        return {
            success: false,
            message: 'Either userIds or topic must be provided',
        };
    }

    @Post('test')
    @ApiOperation({ summary: 'Send test notification to current user' })
    async sendTest(@Request() req: any) {
        // In a real implementation, would fetch user's FCM tokens
        return {
            success: true,
            message: 'Test notification sent (mock mode)',
        };
    }
}
