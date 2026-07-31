import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VolunteerPointsService } from './volunteer-points.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('Volunteer Points API')
@ApiBearerAuth()
@Controller('volunteer-points')
// 定級理由：積分查詢／排行榜／獎品清單／年度報告為志工本人可見資料（L1，跨人查詢的個資收斂另案處理）；發放積分、記錄時數、開帳與發放兌換屬管理寫入，提升至 L2。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class VolunteerPointsController {
    constructor(private readonly service: VolunteerPointsService) { }

    @Get(':volunteerId')
    @ApiOperation({ summary: '取得志工積分資訊' })
    getVolunteerPoints(@Param('volunteerId') volunteerId: string) {
        return this.service.getVolunteerPoints(volunteerId);
    }

    @Post(':volunteerId/initialize')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：開立他人積分帳戶
    @ApiOperation({ summary: '初始化志工積分帳戶' })
    initializeVolunteer(
        @Param('volunteerId') volunteerId: string,
        @Body('volunteerName') volunteerName: string
    ) {
        return this.service.initializeVolunteer(volunteerId, volunteerName);
    }

    @Post(':volunteerId/add')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：發放積分（可兌換實體獎品，等同價值發放）
    @ApiOperation({ summary: '增加積分' })
    addPoints(
        @Param('volunteerId') volunteerId: string,
        @Body() data: { points: number; reason: string; referenceId?: string }
    ) {
        return this.service.addPoints(volunteerId, data.points, data.reason, data.referenceId);
    }

    @Post(':volunteerId/service-hours')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：登錄服務時數（自動換算積分）
    @ApiOperation({ summary: '記錄服務時數並計算積分' })
    recordServiceHours(
        @Param('volunteerId') volunteerId: string,
        @Body() data: { hours: number; isNightShift?: boolean; isWeekend?: boolean; isEmergency?: boolean }
    ) {
        const earned = this.service.recordServiceHours(
            volunteerId,
            data.hours,
            data.isNightShift || false,
            data.isWeekend || false,
            data.isEmergency || false
        );
        return { earnedPoints: earned };
    }

    @Get('rewards/list')
    @ApiOperation({ summary: '取得可兌換獎品列表' })
    getRewards() {
        return this.service.getRewards();
    }

    @Post(':volunteerId/redeem/:rewardId')
    @ApiOperation({ summary: '兌換獎品' })
    redeemReward(
        @Param('volunteerId') volunteerId: string,
        @Param('rewardId') rewardId: string
    ) {
        return this.service.redeemReward(volunteerId, rewardId);
    }

    @Patch(':volunteerId/redemption/:redemptionId/fulfill')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：確認獎品實體發放
    @ApiOperation({ summary: '完成兌換發放' })
    fulfillRedemption(
        @Param('volunteerId') volunteerId: string,
        @Param('redemptionId') redemptionId: string
    ) {
        return { success: this.service.fulfillRedemption(volunteerId, redemptionId) };
    }

    @Get('leaderboard/top')
    @ApiOperation({ summary: '取得排行榜' })
    getLeaderboard(@Query('limit') limit?: number) {
        return this.service.getLeaderboard(limit || 10);
    }

    @Get(':volunteerId/annual-report/:year')
    @ApiOperation({ summary: '產生年度貢獻報告' })
    generateAnnualReport(
        @Param('volunteerId') volunteerId: string,
        @Param('year') year: number
    ) {
        return this.service.generateAnnualReport(volunteerId, +year);
    }
}
