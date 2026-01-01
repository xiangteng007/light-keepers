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
import { ReportScheduleService, CreateScheduleDto } from './report-schedule.service';

@Controller('report-schedules')
export class ReportScheduleController {
    constructor(private readonly scheduleService: ReportScheduleService) { }

    // 取得所有排程
    @Get()
    async findAll() {
        const schedules = await this.scheduleService.findAll();
        return {
            success: true,
            data: schedules,
            count: schedules.length,
        };
    }

    // 取得單一排程
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const schedule = await this.scheduleService.findOne(id);
        return {
            success: true,
            data: schedule,
        };
    }

    // 取得排程執行記錄
    @Get(':id/executions')
    async getExecutions(
        @Param('id') id: string,
        @Query('limit') limit?: string,
    ) {
        const executions = await this.scheduleService.getExecutions(
            id,
            limit ? parseInt(limit, 10) : 20,
        );
        return {
            success: true,
            data: executions,
            count: executions.length,
        };
    }

    // 建立排程
    @Post()
    async create(@Body() dto: CreateScheduleDto) {
        const schedule = await this.scheduleService.create(dto);
        return {
            success: true,
            message: '報表排程已建立',
            data: schedule,
        };
    }

    // 更新排程
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: Partial<CreateScheduleDto>,
    ) {
        const schedule = await this.scheduleService.update(id, dto);
        return {
            success: true,
            message: '報表排程已更新',
            data: schedule,
        };
    }

    // 切換啟用狀態
    @Patch(':id/toggle')
    async toggleActive(@Param('id') id: string) {
        const schedule = await this.scheduleService.toggleActive(id);
        return {
            success: true,
            message: schedule.isActive ? '排程已啟用' : '排程已停用',
            data: schedule,
        };
    }

    // 手動執行
    @Post(':id/execute')
    async executeNow(@Param('id') id: string) {
        const execution = await this.scheduleService.executeNow(id);
        return {
            success: true,
            message: '報表已執行',
            data: execution,
        };
    }

    // 刪除排程
    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.scheduleService.delete(id);
        return {
            success: true,
            message: '報表排程已刪除',
        };
    }
}
