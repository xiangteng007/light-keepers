import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NcdrAlertsService } from './ncdr-alerts.service';
import { NcdrAlertQueryDto, SyncAlertTypesDto, CORE_ALERT_TYPES } from './dto';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

/**
 * NCDR 警報 Controller
 * - GET endpoints: 公開（有 rate limiting）
 * - POST endpoints: 需要 OFFICER 以上權限
 */
@Controller('ncdr-alerts')
// 預設：每分鐘 30 次
// 覆核（2026-08-01, BE-5）：30/min per IP 合理，維持——符合「public 查詢類 30/min」基準。
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class NcdrAlertsController {
    constructor(private readonly ncdrAlertsService: NcdrAlertsService) { }

    /**
     * 獲取所有示警類別定義
     * GET /ncdr-alerts/types
     */
    @Get('types')
    getAlertTypes() {
        return {
            types: this.ncdrAlertsService.getAlertTypes(),
            coreTypes: this.ncdrAlertsService.getCoreAlertTypes(),
        };
    }

    /**
     * 獲取警報列表
     * GET /ncdr-alerts?types=33,34&activeOnly=true&limit=20
     */
    @Get()
    async findAll(@Query() query: NcdrAlertQueryDto) {
        // 解析 types 查詢參數
        if (query.types && typeof query.types === 'string') {
            query.types = (query.types as unknown as string).split(',').map(Number);
        }
        return this.ncdrAlertsService.findAll(query);
    }

    /**
     * 獲取有座標的警報 (地圖用)
     * GET /ncdr-alerts/map?types=33,34
     */
    @Get('map')
    async findForMap(@Query('types') types?: string) {
        const typeIds = types ? types.split(',').map(Number) : undefined;
        const alerts = await this.ncdrAlertsService.findWithLocation(typeIds);
        return { data: alerts, total: alerts.length };
    }

    /**
     * 獲取統計資料
     * GET /ncdr-alerts/stats
     */
    @Get('stats')
    async getStats() {
        return this.ncdrAlertsService.getStats();
    }

    /**
     * 手動觸發同步 (僅核心類別) - 🔐 需要 OFFICER 權限
     * POST /ncdr-alerts/sync
     */
    @Post('sync')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @HttpCode(HttpStatus.OK)
    async syncCore() {
        const result = await this.ncdrAlertsService.syncAlertTypes(CORE_ALERT_TYPES);
        return {
            message: 'Sync completed',
            ...result,
        };
    }

    /**
     * 手動觸發同步指定類別
     * POST /ncdr-alerts/sync-types
     * Body: { typeIds: [33, 34, 5] }
     */
    @Post('sync-types')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @HttpCode(HttpStatus.OK)
    async syncTypes(@Body() dto: SyncAlertTypesDto) {
        // 限制一次最多同步 10 個類別，避免濫用
        const limitedTypes = dto.typeIds.slice(0, 10);
        const result = await this.ncdrAlertsService.syncAlertTypes(limitedTypes);
        return {
            message: 'Sync completed',
            syncedTypes: limitedTypes,
            ...result,
        };
    }

    /**
     * 更新現有警報的 sourceLink 為 HTML 網頁連結
     * POST /ncdr-alerts/update-source-links
     */
    @Post('update-source-links')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @HttpCode(HttpStatus.OK)
    async updateSourceLinks() {
        const result = await this.ncdrAlertsService.updateExistingSourceLinks();
        return {
            message: 'Source links update completed',
            ...result,
        };
    }

    /**
     * 批次更新現有警報的座標
     * POST /ncdr-alerts/update-coordinates
     */
    @Post('update-coordinates')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @HttpCode(HttpStatus.OK)
    async updateCoordinates() {
        const result = await this.ncdrAlertsService.updateExistingCoordinates();
        return {
            message: 'Coordinates update completed',
            ...result,
        };
    }

    /**
     * 手動觸發 CWA 地震同步
     * POST /ncdr-alerts/sync-cwa-earthquakes
     */
    @Post('sync-cwa-earthquakes')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @HttpCode(HttpStatus.OK)
    async syncCwaEarthquakes() {
        const result = await this.ncdrAlertsService.syncCwaEarthquakes();
        return {
            message: 'CWA earthquake sync completed',
            ...result,
        };
    }

    /**
     * 清除所有 NCDR 警報資料（用於重置）
     * DELETE /ncdr-alerts/clear-all - 🔐 需要 DIRECTOR 權限
     */
    @Post('clear-all')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 清除所有資料需要主任級別
    @HttpCode(HttpStatus.OK)
    async clearAll() {
        const result = await this.ncdrAlertsService.clearAllAlerts();
        return {
            message: 'All NCDR alerts cleared',
            ...result,
        };
    }
}
