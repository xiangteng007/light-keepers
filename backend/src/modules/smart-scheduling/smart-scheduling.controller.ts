import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SmartSchedulingService } from './smart-scheduling.service';

@ApiTags('Smart Scheduling 智慧排班')
@Controller('api/scheduling')
export class SmartSchedulingController {
    constructor(private readonly schedulingService: SmartSchedulingService) { }

    @Post('suggest-dispatch')
    @ApiOperation({ summary: '派遣建議', description: '取得 AI 派遣建議' })
    suggestDispatch(@Body() body: any): any {
        return this.schedulingService.suggestDispatch(body);
    }

    @Post('generate-schedule')
    @ApiOperation({ summary: '產生排班表', description: '自動產生最佳排班表' })
    generateSchedule(@Body() body: { startDate: string; endDate: string }): any {
        return this.schedulingService.generateSchedule({
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
        });
    }

    @Post('find-backup')
    @ApiOperation({ summary: '找替補', description: '尋找可替補的志工' })
    findBackup(@Body() body: { volunteerId: string; date: string; shift: string }): any {
        return this.schedulingService.findBackup(body.volunteerId, { date: new Date(body.date), shift: body.shift });
    }

    @Get('predict-staffing')
    @ApiOperation({ summary: '人力預測', description: '預測特定日期的人力需求' })
    predictStaffing(@Query('region') region: string, @Query('date') date: string): any {
        return this.schedulingService.predictStaffingNeeds(region, new Date(date));
    }
}
