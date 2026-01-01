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
import { RecognitionService, AwardBadgeDto, CreateRecognitionDto } from './entities/recognition.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('volunteers/recognition')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class RecognitionController {
    constructor(private readonly recognitionService: RecognitionService) { }

    // ===== 徽章 =====

    // 取得所有徽章
    @Get('badges')
    async getBadges() {
        const badges = await this.recognitionService.getBadges();
        return {
            success: true,
            data: badges,
            count: badges.length,
        };
    }

    // 取得志工的徽章
    @Get(':volunteerId/badges')
    async getVolunteerBadges(@Param('volunteerId') volunteerId: string) {
        const badges = await this.recognitionService.getVolunteerBadges(volunteerId);
        return {
            success: true,
            data: badges,
            count: badges.length,
        };
    }

    // 頒發徽章
    @Post('badges/award')
    async awardBadge(@Body() dto: AwardBadgeDto) {
        const earned = await this.recognitionService.awardBadge(dto);
        return {
            success: true,
            message: '徽章已頒發',
            data: earned,
        };
    }

    // ===== 表揚記錄 =====

    // 取得志工的表揚記錄
    @Get(':volunteerId/records')
    async getVolunteerRecognitions(@Param('volunteerId') volunteerId: string) {
        const recognitions = await this.recognitionService.getVolunteerRecognitions(volunteerId);
        return {
            success: true,
            data: recognitions,
            count: recognitions.length,
        };
    }

    // 取得公開表揚（光榮榜）
    @Get('public')
    async getPublicRecognitions(@Query('limit') limit?: string) {
        const recognitions = await this.recognitionService.getPublicRecognitions(
            limit ? parseInt(limit, 10) : 20
        );
        return {
            success: true,
            data: recognitions,
            count: recognitions.length,
        };
    }

    // 建立表揚
    @Post('records')
    async createRecognition(@Body() dto: CreateRecognitionDto) {
        const recognition = await this.recognitionService.createRecognition(dto);
        return {
            success: true,
            message: '表揚已建立',
            data: recognition,
        };
    }

    // ===== 里程碑 =====

    // 檢查並頒發里程碑
    @Post(':volunteerId/check-milestones')
    async checkMilestones(@Param('volunteerId') volunteerId: string) {
        const newRecognitions = await this.recognitionService.checkMilestones(volunteerId);
        return {
            success: true,
            message: newRecognitions.length > 0 ? `獲得 ${newRecognitions.length} 個新里程碑！` : '沒有新里程碑',
            data: newRecognitions,
        };
    }

    // ===== 排行榜 =====

    @Get('leaderboard')
    async getLeaderboard(
        @Query('type') type?: 'hours' | 'tasks' | 'points',
        @Query('limit') limit?: string,
    ) {
        const leaderboard = await this.recognitionService.getLeaderboard(
            type || 'hours',
            limit ? parseInt(limit, 10) : 10
        );
        return {
            success: true,
            data: leaderboard,
        };
    }

    // ===== 統計 =====

    @Get('stats')
    async getStats() {
        const stats = await this.recognitionService.getRecognitionStats();
        return {
            success: true,
            data: stats,
        };
    }
}
