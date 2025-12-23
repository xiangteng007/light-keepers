import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { NotificationsService, CreateNotificationDto } from './notifications.service';

@Controller('notifications')
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
}
