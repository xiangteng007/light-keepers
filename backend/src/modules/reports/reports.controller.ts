import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReportsService, CreateReportDto, ReviewReportDto, ReportFilter } from './reports.service';
import { ReportStatus, ReportType, ReportSeverity } from './reports.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    // =========================================
    // 公開端點 (需要 Rate Limiting)
    // =========================================

    /**
     * 提交新災情回報 (公開，但需要速率限制)
     * 每分鐘最多 5 次請求
     */
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post()
    async create(@Body() dto: CreateReportDto) {
        const report = await this.reportsService.create(dto);
        return {
            success: true,
            message: '回報已提交，等待審核',
            data: report,
        };
    }

    /**
     * 取得地圖用回報 (公開，僅限已確認的回報)
     */
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @Get('map')
    async findForMap() {
        const reports = await this.reportsService.findForMap();
        return {
            success: true,
            data: reports,
            count: reports.length,
        };
    }

    /**
     * 取得統計 (公開)
     */
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @Get('stats')
    async getStats() {
        const stats = await this.reportsService.getStats();
        return {
            success: true,
            data: stats,
        };
    }

    // =========================================
    // 認證端點 (需要登入)
    // =========================================

    /**
     * 取得所有回報 (需要幹部權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
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

    /**
     * 取得單一回報 (需要幹部權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const report = await this.reportsService.findOne(id);
        return {
            success: true,
            data: report,
        };
    }

    /**
     * 審核回報 (需要幹部權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @Patch(':id/review')
    async review(
        @Param('id') id: string,
        @Body() dto: ReviewReportDto,
        @Request() req: { user: { id: string } },
    ) {
        // 記錄審核者
        dto.reviewedBy = req.user.id;
        const report = await this.reportsService.review(id, dto);
        return {
            success: true,
            message: `回報已${dto.status === 'confirmed' ? '確認' : '拒絕'}`,
            data: report,
        };
    }

    /**
     * 刪除回報 (需要總幹事權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.reportsService.delete(id);
        return {
            success: true,
            message: '回報已刪除',
        };
    }

    // =========================================
    // 分析端點 (需要幹部權限)
    // =========================================

    /**
     * 災情熱點分析 (需要幹部權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @Get('analysis/hotspots')
    async getHotspots(
        @Query('gridSizeKm') gridSizeKm?: string,
        @Query('minCount') minCount?: string,
        @Query('days') days?: string,
    ) {
        const result = await this.reportsService.getHotspots({
            gridSizeKm: gridSizeKm ? parseFloat(gridSizeKm) : undefined,
            minCount: minCount ? parseInt(minCount, 10) : undefined,
            days: days ? parseInt(days, 10) : undefined,
        });
        return {
            success: true,
            data: result,
        };
    }

    /**
     * 回報趨勢數據 (需要幹部權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @Get('analysis/trend')
    async getTrend(@Query('days') days?: string) {
        const result = await this.reportsService.getTrendData(
            days ? parseInt(days, 10) : 7
        );
        return {
            success: true,
            data: result,
        };
    }

    /**
     * 區域分佈統計 (需要幹部權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @Get('analysis/regions')
    async getRegions(@Query('days') days?: string) {
        const result = await this.reportsService.getRegionStats(
            days ? parseInt(days, 10) : 30
        );
        return {
            success: true,
            data: result,
        };
    }

    /**
     * 時段分佈統計 (需要幹部權限)
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @Get('analysis/hourly')
    async getHourly(@Query('days') days?: string) {
        const result = await this.reportsService.getHourlyStats(
            days ? parseInt(days, 10) : 7
        );
        return {
            success: true,
            data: result,
        };
    }
}
