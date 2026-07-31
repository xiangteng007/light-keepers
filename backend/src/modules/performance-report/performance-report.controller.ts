import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PerformanceReportService } from './performance-report.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('Performance 績效報表')
@Controller('api/performance')
// 定級理由：績效報表可查詢任意志工／團隊／區域的個人績效並可匯出，屬幹部以上的人事管理用途，整份 controller 一律 L2。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class PerformanceReportController {
    constructor(private readonly reportService: PerformanceReportService) { }

    @Get('volunteer/:id')
    @ApiOperation({ summary: '志工績效', description: '取得特定志工的績效報表' })
    getVolunteerPerformance(@Param('id') id: string): any {
        const period = { startDate: new Date(Date.now() - 30 * 24 * 3600000), endDate: new Date() };
        return this.reportService.getVolunteerPerformance(id, period);
    }

    @Get('team/:id')
    @ApiOperation({ summary: '團隊績效', description: '取得特定團隊的績效摘要' })
    getTeamPerformance(@Param('id') id: string): any {
        const period = { startDate: new Date(Date.now() - 30 * 24 * 3600000), endDate: new Date() };
        return this.reportService.getTeamPerformanceSummary(id, period);
    }

    @Get('area')
    @ApiOperation({ summary: '區域績效', description: '取得所有區域的績效分析' })
    getAreaPerformance(): any {
        const period = { startDate: new Date(Date.now() - 30 * 24 * 3600000), endDate: new Date() };
        return this.reportService.getAreaPerformanceAnalysis(period);
    }

    @Get('monthly/:year/:month')
    @ApiOperation({ summary: '月度報表', description: '取得指定月份的報表' })
    getMonthlyReport(@Param('year') year: number, @Param('month') month: number): any {
        return this.reportService.getMonthlyReport(year, month);
    }

    @Get('annual/:year')
    @ApiOperation({ summary: '年度報表', description: '取得指定年度的報表' })
    getAnnualReport(@Param('year') year: number): any {
        return this.reportService.getAnnualReport(year);
    }

    @Get('export/:type')
    @ApiOperation({ summary: '匯出報表', description: '匯出報表為 PDF/Excel/CSV' })
    @ApiQuery({ name: 'format', enum: ['pdf', 'excel', 'csv'], required: true })
    async exportReport(@Param('type') type: string, @Query('format') format: 'pdf' | 'excel' | 'csv'): Promise<any> {
        return this.reportService.exportReport(type, format);
    }
}
