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
import { ReportsService, CreateReportDto, ReviewReportDto, ReportFilter } from './reports.service';
import { ReportStatus, ReportType, ReportSeverity } from './reports.entity';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    // 提交新災情回報 (公開)
    @Post()
    async create(@Body() dto: CreateReportDto) {
        const report = await this.reportsService.create(dto);
        return {
            success: true,
            message: '回報已提交，等待審核',
            data: report,
        };
    }

    // 取得所有回報 (管理員)
    @Get()
    async findAll(
        @Query('status') status?: ReportStatus,
        @Query('type') type?: ReportType,
        @Query('severity') severity?: ReportSeverity,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: ReportFilter = {
            status,
            type,
            severity,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const reports = await this.reportsService.findAll(filter);
        return {
            success: true,
            data: reports,
            count: reports.length,
        };
    }

    // 取得地圖用回報
    @Get('map')
    async findForMap() {
        const reports = await this.reportsService.findForMap();
        return {
            success: true,
            data: reports,
            count: reports.length,
        };
    }

    // 取得統計
    @Get('stats')
    async getStats() {
        const stats = await this.reportsService.getStats();
        return {
            success: true,
            data: stats,
        };
    }

    // 取得單一回報
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const report = await this.reportsService.findOne(id);
        return {
            success: true,
            data: report,
        };
    }

    // 審核回報 (管理員)
    @Patch(':id/review')
    async review(
        @Param('id') id: string,
        @Body() dto: ReviewReportDto,
    ) {
        const report = await this.reportsService.review(id, dto);
        return {
            success: true,
            message: `回報已${dto.status === 'confirmed' ? '確認' : '拒絕'}`,
            data: report,
        };
    }

    // 刪除回報 (管理員)
    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.reportsService.delete(id);
        return {
            success: true,
            message: '回報已刪除',
        };
    }
}
