import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftCalendarService } from './shift-calendar.service';

@ApiTags('排班管理')
@Controller('shift-calendar')
export class ShiftCalendarController {
    constructor(private readonly service: ShiftCalendarService) { }

    @Post()
    @ApiOperation({ summary: '建立班次' })
    @ApiResponse({ status: 201, description: '班次已建立' })
    @ApiBearerAuth()
    createShift(@Body() body: { date: string; templateId: string; volunteerId: string; volunteerName: string; notes?: string }) {
        return this.service.createShift(body);
    }

    @Get('calendar')
    @ApiOperation({ summary: '取得日曆檢視' })
    @ApiResponse({ status: 200, description: '日曆資料' })
    @ApiBearerAuth()
    getCalendarView(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        return this.service.getCalendarView(new Date(startDate), new Date(endDate));
    }

    @Get('volunteer/:volunteerId')
    @ApiOperation({ summary: '取得志工排班' })
    @ApiResponse({ status: 200, description: '志工排班列表' })
    @ApiBearerAuth()
    getVolunteerSchedule(
        @Param('volunteerId') volunteerId: string,
        @Query('month') month: number,
        @Query('year') year: number
    ) {
        return this.service.getVolunteerSchedule(volunteerId, +month, +year);
    }

    @Put(':shiftId')
    @ApiOperation({ summary: '更新班次' })
    @ApiResponse({ status: 200, description: '班次已更新' })
    @ApiBearerAuth()
    updateShift(@Param('shiftId') shiftId: string, @Body() body: any) {
        return this.service.updateShift(shiftId, body);
    }

    @Delete(':shiftId')
    @ApiOperation({ summary: '刪除班次' })
    @ApiResponse({ status: 200, description: '班次已刪除' })
    @ApiBearerAuth()
    deleteShift(@Param('shiftId') shiftId: string) {
        return { success: this.service.deleteShift(shiftId) };
    }

    @Post('swap')
    @ApiOperation({ summary: '交換班次' })
    @ApiResponse({ status: 200, description: '交換成功' })
    @ApiBearerAuth()
    swapShifts(@Body() body: { shiftId1: string; shiftId2: string }) {
        return { success: this.service.swapShifts(body.shiftId1, body.shiftId2) };
    }

    @Post('copy-week')
    @ApiOperation({ summary: '複製週排班' })
    @ApiResponse({ status: 200, description: '複製成功' })
    @ApiBearerAuth()
    copyWeekSchedule(@Body() body: { sourceWeekStart: string; targetWeekStart: string }) {
        const count = this.service.copyWeekSchedule(new Date(body.sourceWeekStart), new Date(body.targetWeekStart));
        return { success: true, copiedCount: count };
    }

    @Get('vacancies')
    @ApiOperation({ summary: '取得空缺' })
    @ApiResponse({ status: 200, description: '空缺列表' })
    @ApiBearerAuth()
    getVacancies(@Query('date') date: string) {
        return this.service.getVacancies(date);
    }

    @Get('templates')
    @ApiOperation({ summary: '取得班次模板' })
    @ApiResponse({ status: 200, description: '模板列表' })
    getTemplates() {
        return this.service.getTemplates();
    }
}
