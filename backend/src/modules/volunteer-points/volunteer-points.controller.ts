import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VolunteerPointsService } from './volunteer-points.service';

@ApiTags('Volunteer Points API')
@ApiBearerAuth()
@Controller('volunteer-points')
export class VolunteerPointsController {
    constructor(private readonly service: VolunteerPointsService) { }

    @Get(':volunteerId')
    @ApiOperation({ summary: '取得志工積分資訊' })
    getVolunteerPoints(@Param('volunteerId') volunteerId: string) {
        return this.service.getVolunteerPoints(volunteerId);
    }

    @Post(':volunteerId/initialize')
    @ApiOperation({ summary: '初始化志工積分帳戶' })
    initializeVolunteer(
        @Param('volunteerId') volunteerId: string,
        @Body('volunteerName') volunteerName: string
    ) {
        return this.service.initializeVolunteer(volunteerId, volunteerName);
    }

    @Post(':volunteerId/add')
    @ApiOperation({ summary: '增加積分' })
    addPoints(
        @Param('volunteerId') volunteerId: string,
        @Body() data: { points: number; reason: string; referenceId?: string }
    ) {
        return this.service.addPoints(volunteerId, data.points, data.reason, data.referenceId);
    }

    @Post(':volunteerId/service-hours')
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
