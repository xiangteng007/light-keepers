import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { NcdrAlertsService } from './ncdr-alerts.service';
import { NcdrAlertQueryDto, SyncAlertTypesDto, CORE_ALERT_TYPES } from './dto';

@Controller('ncdr-alerts')
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
     * 手動觸發同步 (僅核心類別)
     * POST /ncdr-alerts/sync
     */
    @Post('sync')
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
}
