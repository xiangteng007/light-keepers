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
 * - GET endpoints: 需要 VOLUNTEER 以上權限（有 rate limiting）
 * - POST endpoints: 需要 OFFICER 以上權限
 *
 * 定級理由（本次補 types／findAll／map／stats 四個讀取端點，寫入端 handler 既有定級不動）：
 * 這些是政府發布的國家級示警，資料本身不敏感，且同一份內容已經由 `GET /public/alerts`
 * （PublicController 為 class 級 `@Public()`）匿名對外提供，因此讀取端不需要營運等級 → 定為 L1。
 *
 * 為何不定 L0：`@RequiredLevel(0)` 在 GlobalAuthGuard 中等同 `@Public()`（見 global-auth.guard.ts:77），
 * 會把目前被 default-deny 擋住的端點改為匿名可存取，屬「擴大公開介面」。而
 * `docs/policy/public-surface.policy.json`（公開介面的 SSOT）目前並未收錄 `/ncdr-alerts`，
 * 在治理文件更新前不由本次安全強化任務單方面放寬。
 *
 * 待決事項：多處跡象顯示原始設計意圖是 L0——本檔原註解寫「GET endpoints: 公開」、
 * `seed.service.ts` 將 pageKey `ncdr-alerts` 設為 `RoleLevel.PUBLIC`、前端 NcdrAlertsPage 路由
 * 未包 `ProtectedRoute`、`api/client.ts` 亦把 `/ncdr-alerts` 列為 publicPaths。
 * 若要恢復匿名存取，正確作法是先把這四個端點寫入 public-surface.policy.json，再改標 `@Public()`。
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
