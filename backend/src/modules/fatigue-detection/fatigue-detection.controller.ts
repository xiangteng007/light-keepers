import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { FatigueDetectionService } from './fatigue-detection.service';

// 定級理由：疲勞評分由個人出勤時數推導，屬健康相關個資，且是排班安全的把關依據。
// 查閱本人疲勞狀態與閾值設定 → L1（志工需知道自己還能不能上工）；
// 「需要休息清單」是跨人員健康狀態名單（批次個資）、排班驗證與出勤登錄屬督導職權 → L2。class 基準 L2。
@ApiTags('Fatigue Detection 疲勞偵測')
@Controller('api/fatigue')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class FatigueDetectionController {
    constructor(private readonly fatigueService: FatigueDetectionService) { }

    @Get('volunteer/:id')
    @ApiOperation({ summary: '志工疲勞狀態', description: '取得特定志工的疲勞評分' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getVolunteerFatigue(@Param('id') id: string): any {
        return this.fatigueService.getFatigueLevel(id);
    }

    @Get('needs-rest')
    @ApiOperation({ summary: '需要休息清單', description: '取得需要休息的志工' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getVolunteersNeedingRest(): any {
        return this.fatigueService.getVolunteersNeedingRest();
    }

    @Post('validate-shift')
    @ApiOperation({ summary: '驗證班次', description: '驗證 proposed 排班是否符合疲勞限制' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    validateShift(@Body() body: { volunteerId: string; date: string; startTime: string; endTime: string; hours: number }): any {
        return this.fatigueService.canSchedule(body.volunteerId, {
            date: new Date(body.date),
            startTime: body.startTime,
            endTime: body.endTime,
            hours: body.hours,
        });
    }

    @Get('thresholds')
    @ApiOperation({ summary: '疲勞閾值', description: '取得疲勞閾值設定' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getThresholds(): any {
        return this.fatigueService.getThresholds();
    }

    @Post('record-duty')
    @ApiOperation({ summary: '記錄出勤', description: '記錄志工出勤紀錄' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    recordDuty(@Body() body: { volunteerId: string; startTime: string; endTime: string }): any {
        this.fatigueService.recordDuty(body.volunteerId, new Date(body.startTime), new Date(body.endTime));
        return { success: true };
    }
}
