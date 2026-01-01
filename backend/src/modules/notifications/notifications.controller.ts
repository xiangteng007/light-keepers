import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { NotificationsService, CreateNotificationDto } from './notifications.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('notifications')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    // 建立通知
    @Post()
    async create(@Body() dto: CreateNotificationDto) {
        const notification = await this.notificationsService.create(dto);
        return {
            success: true,
            message: '通知已發送',
            data: notification,
        };
    }

    // 系統廣播
    @Post('broadcast')
    async broadcast(@Body() dto: Omit<CreateNotificationDto, 'volunteerId'>) {
        const notification = await this.notificationsService.broadcast(dto);
        return {
            success: true,
            message: '廣播已發送',
            data: notification,
        };
    }

    // 批量發送動員通知
    @Post('mobilize')
    async mobilize(
        @Body('volunteerIds') volunteerIds: string[],
        @Body('title') title: string,
        @Body('message') message: string,
    ) {
        const count = await this.notificationsService.sendMobilizationNotification(
            volunteerIds, title, message
        );
        return {
            success: true,
            message: `已發送 ${count} 則動員通知`,
            data: { count },
        };
    }

    // 取得志工通知
    @Get('volunteer/:volunteerId')
    async getByVolunteer(
        @Param('volunteerId') volunteerId: string,
        @Query('unreadOnly') unreadOnly?: string,
    ) {
        const notifications = await this.notificationsService.getByVolunteer(
            volunteerId,
            unreadOnly === 'true'
        );
        return {
            success: true,
            data: notifications,
            count: notifications.length,
        };
    }

    // 未讀數量
    @Get('volunteer/:volunteerId/unread-count')
    async getUnreadCount(@Param('volunteerId') volunteerId: string) {
        const count = await this.notificationsService.getUnreadCount(volunteerId);
        return {
            success: true,
            data: { count },
        };
    }

    // 標記已讀
    @Patch(':id/read')
    async markAsRead(@Param('id') id: string) {
        const notification = await this.notificationsService.markAsRead(id);
        return {
            success: true,
            message: '已標記為已讀',
            data: notification,
        };
    }

    // 標記全部已讀
    @Patch('volunteer/:volunteerId/read-all')
    async markAllAsRead(@Param('volunteerId') volunteerId: string) {
        const count = await this.notificationsService.markAllAsRead(volunteerId);
        return {
            success: true,
            message: `已標記 ${count} 則通知為已讀`,
            data: { count },
        };
    }

    // =========================================
    // FCM Push Notification API
    // =========================================

    // 註冊 FCM Token
    @Post('fcm/register')
    async registerFcmToken(
        @Body('accountId') accountId: string,
        @Body('fcmToken') fcmToken: string,
    ) {
        const success = await this.notificationsService.registerFcmToken(accountId, fcmToken);
        return {
            success,
            message: success ? 'FCM Token 已註冊' : 'FCM Token 註冊失敗',
        };
    }

    // 取消註冊 FCM Token
    @Post('fcm/unregister')
    async unregisterFcmToken(
        @Body('accountId') accountId: string,
        @Body('fcmToken') fcmToken: string,
    ) {
        const success = await this.notificationsService.unregisterFcmToken(accountId, fcmToken);
        return {
            success,
            message: success ? 'FCM Token 已取消註冊' : 'FCM Token 取消註冊失敗',
        };
    }

    // 發送廣播推播 (含 FCM)
    @Post('broadcast/push')
    async broadcastWithPush(
        @Body('title') title: string,
        @Body('message') message: string,
        @Body('actionUrl') actionUrl?: string,
    ) {
        await this.notificationsService.broadcastWithPush(title, message, actionUrl);
        return {
            success: true,
            message: '廣播已發送 (含 FCM 推播)',
        };
    }
}
