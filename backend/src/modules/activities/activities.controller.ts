import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import {
    ActivitiesService,
    CreateActivityDto,
    RegisterActivityDto,
    ActivityFilter,
} from './activities.service';
import { ActivityCategory, ActivityStatus } from './activities.entity';

@Controller('activities')
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    // ===== 活動 API =====

    // 取得活動列表
    @Get()
    async findAll(
        @Query('category') category?: ActivityCategory,
        @Query('status') status?: ActivityStatus,
        @Query('upcoming') upcoming?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: ActivityFilter = {
            category,
            status,
            upcoming: upcoming === 'true',
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const activities = await this.activitiesService.findActivities(filter);
        return {
            success: true,
            data: activities,
            count: activities.length,
        };
    }

    // 取得單一活動
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const activity = await this.activitiesService.findActivity(id);
        return {
            success: true,
            data: activity,
        };
    }

    // 取得活動統計
    @Get(':id/stats')
    async getStats(@Param('id') id: string) {
        const stats = await this.activitiesService.getActivityStats(id);
        return {
            success: true,
            data: stats,
        };
    }

    // 建立活動
    @Post()
    async create(@Body() dto: CreateActivityDto) {
        const activity = await this.activitiesService.createActivity(dto);
        return {
            success: true,
            message: '活動已建立',
            data: activity,
        };
    }

    // 更新活動
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: Partial<CreateActivityDto>,
    ) {
        const activity = await this.activitiesService.updateActivity(id, dto);
        return {
            success: true,
            message: '活動已更新',
            data: activity,
        };
    }

    // 發布活動
    @Patch(':id/publish')
    async publish(@Param('id') id: string) {
        const activity = await this.activitiesService.publishActivity(id);
        return {
            success: true,
            message: '活動已發布',
            data: activity,
        };
    }

    // 關閉報名
    @Patch(':id/close')
    async close(@Param('id') id: string) {
        const activity = await this.activitiesService.closeRegistration(id);
        return {
            success: true,
            message: '報名已關閉',
            data: activity,
        };
    }

    // 取消活動
    @Patch(':id/cancel')
    async cancel(@Param('id') id: string) {
        const activity = await this.activitiesService.cancelActivity(id);
        return {
            success: true,
            message: '活動已取消',
            data: activity,
        };
    }

    // 完成活動
    @Patch(':id/complete')
    async complete(@Param('id') id: string) {
        const activity = await this.activitiesService.completeActivity(id);
        return {
            success: true,
            message: '活動已完成',
            data: activity,
        };
    }

    // ===== 報名 API =====

    // 取得活動報名列表
    @Get(':id/registrations')
    async getRegistrations(@Param('id') id: string) {
        const registrations = await this.activitiesService.getRegistrations(id);
        return {
            success: true,
            data: registrations,
            count: registrations.length,
        };
    }

    // 報名活動
    @Post(':id/register')
    async register(
        @Param('id') activityId: string,
        @Body() dto: Omit<RegisterActivityDto, 'activityId'>,
    ) {
        const registration = await this.activitiesService.register({
            ...dto,
            activityId,
        });
        return {
            success: true,
            message: registration.status === 'waitlist' ? '已加入候補名單' : '報名成功',
            data: registration,
        };
    }

    // 取得用戶報名記錄
    @Get('user/:userId/registrations')
    async getUserRegistrations(@Param('userId') userId: string) {
        const registrations = await this.activitiesService.getUserRegistrations(userId);
        return {
            success: true,
            data: registrations,
            count: registrations.length,
        };
    }

    // 審核報名
    @Patch('registrations/:registrationId/approve')
    async approveRegistration(
        @Param('registrationId') registrationId: string,
        @Body() dto: { reviewedBy: string; note?: string },
    ) {
        const registration = await this.activitiesService.approveRegistration(
            registrationId,
            dto.reviewedBy,
            dto.note,
        );
        return {
            success: true,
            message: '報名已審核',
            data: registration,
        };
    }

    // 取消報名
    @Delete('registrations/:registrationId')
    async cancelRegistration(
        @Param('registrationId') registrationId: string,
        @Query('userId') userId: string,
    ) {
        await this.activitiesService.cancelRegistration(registrationId, userId);
        return {
            success: true,
            message: '已取消報名',
        };
    }

    // 簽到
    @Patch('registrations/:registrationId/attendance')
    async markAttendance(
        @Param('registrationId') registrationId: string,
        @Body() dto: { attended: boolean },
    ) {
        const registration = await this.activitiesService.markAttendance(
            registrationId,
            dto.attended,
        );
        return {
            success: true,
            message: dto.attended ? '簽到成功' : '已取消簽到',
            data: registration,
        };
    }
}
