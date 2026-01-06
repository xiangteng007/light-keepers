import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FatigueDetectionService } from './fatigue-detection.service';

@ApiTags('Fatigue Detection 疲勞偵測')
@Controller('api/fatigue')
export class FatigueDetectionController {
    constructor(private readonly fatigueService: FatigueDetectionService) { }

    @Get('volunteer/:id')
    @ApiOperation({ summary: '志工疲勞狀態', description: '取得特定志工的疲勞評分' })
    getVolunteerFatigue(@Param('id') id: string): any {
        return this.fatigueService.getFatigueLevel(id);
    }

    @Get('needs-rest')
    @ApiOperation({ summary: '需要休息清單', description: '取得需要休息的志工' })
    getVolunteersNeedingRest(): any {
        return this.fatigueService.getVolunteersNeedingRest();
    }

    @Post('validate-shift')
    @ApiOperation({ summary: '驗證班次', description: '驗證 proposed 排班是否符合疲勞限制' })
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
    getThresholds(): any {
        return this.fatigueService.getThresholds();
    }

    @Post('record-duty')
    @ApiOperation({ summary: '記錄出勤', description: '記錄志工出勤紀錄' })
    recordDuty(@Body() body: { volunteerId: string; startTime: string; endTime: string }): any {
        this.fatigueService.recordDuty(body.volunteerId, new Date(body.startTime), new Date(body.endTime));
        return { success: true };
    }
}
