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
    ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReportsService, CreateReportDto, ReviewReportDto, ReportFilter } from './reports.service';
import { ReportStatus, ReportType, ReportSeverity } from './reports.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

// 定級理由（本次補 create／map／stats 三個缺口，其餘 handler 既有定級不動）：
// 三者原本標註為「公開」但實際沒有任何 Guard，本次統一定為 L1（志工）。
// `create`：災情回報是第一線志工的核心動作，不能收到 L2；但也不宜開放匿名——
//   系統已有專屬的匿名通報管道 `POST /intake`（`@Public()` + 已列入 public-surface.policy.json），
//   本端點維持 L1 可避免未認證來源灌入未經審核的回報（審核端 `PATCH :id/review` 仍為 L2）。
// `map`／`stats`：僅回傳已確認（confirmed）的回報，敏感度低，但含災情位置，維持 L1。
// 與 ncdr-alerts 同一原則：不以 `@RequiredLevel(0)` 單方面擴大公開介面，
// 若確定要匿名開放，應先更新 docs/policy/public-surface.policy.json 再改標 `@Public()`。
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    // =========================================
    // 低權限端點 (L1 + Rate Limiting)
    // =========================================

    /**
     * 提交新災情回報 (需登入志工，並套用速率限制)
     * 每分鐘最多 5 次請求
     *
     * 覆核（2026-08-01, BE-5）：5/min per IP 合理，維持。
     * 匿名可寫入端點，為垃圾資料灌入面。
     */
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
     * 取得地圖用回報 (需登入志工，僅限已確認的回報)
     */
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
     * 取得統計 (需登入志工)
     */
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
     * SEC-SD.2: includeDeleted=true 僅限 Admin/Owner (DIRECTOR 以上)
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
        @Query('includeDeleted') includeDeleted?: string,
        @Request() req?: { user?: { roleLevel?: number } },
        // CD-1 新增；刻意放在參數列最後，避免既有位置式呼叫（測試/內部）被打亂
        @Query('isMassCasualty') isMassCasualty?: string,
    ) {
        // SEC-SD.2 R3: includeDeleted=true 需要 DIRECTOR 以上權限
        const wantDeleted = includeDeleted === 'true';
        if (wantDeleted) {
            const userLevel = req?.user?.roleLevel ?? 0;
            if (userLevel < ROLE_LEVELS.DIRECTOR) {
                throw new ForbiddenException('只有總幹事或更高權限可查詢已刪除資料');
            }
        }

        const filter: ReportFilter = {
            status,
            type,
            severity,
            // 只有明確傳 true/false 才過濾，未傳＝擴充前行為
            isMassCasualty:
                isMassCasualty === undefined ? undefined : isMassCasualty === 'true',
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const reports = await this.reportsService.findAll(filter, wantDeleted);
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
