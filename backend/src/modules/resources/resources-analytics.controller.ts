import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ResourcesAnalyticsService } from './resources-analytics.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('resources/analytics')
// 定級理由：物資分析報表揭露全域庫存水位、過期與缺料弱點，屬幹部層級的營運研判資料（L2）；原本僅有 CoreJwtGuard（任何登入者可讀），補上角色判斷。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class ResourcesAnalyticsController {
    constructor(private readonly analyticsService: ResourcesAnalyticsService) { }

    /**
     * 取得完整分析摘要
     * GET /resources/analytics/summary
     */
    @Get('summary')
    async getSummary(@Query('days') days?: string) {
        const daysNum = days ? parseInt(days, 10) : 30;
        const data = await this.analyticsService.getAnalyticsSummary(daysNum);
        return { success: true, data };
    }

    /**
     * 取得庫存趨勢
     * GET /resources/analytics/trend
     */
    @Get('trend')
    async getTrend(@Query('days') days?: string) {
        const daysNum = days ? parseInt(days, 10) : 30;
        const data = await this.analyticsService.getInventoryTrend(daysNum);
        return { success: true, data };
    }

    /**
     * 取得類別分佈
     * GET /resources/analytics/categories
     */
    @Get('categories')
    async getCategories() {
        const data = await this.analyticsService.getCategoryDistribution();
        return { success: true, data };
    }

    /**
     * 取得低庫存預警
     * GET /resources/analytics/low-stock
     */
    @Get('low-stock')
    async getLowStock() {
        const data = await this.analyticsService.getLowStockAlerts();
        return { success: true, data };
    }

    /**
     * 取得即將過期物資
     * GET /resources/analytics/expiring
     */
    @Get('expiring')
    async getExpiring(@Query('days') days?: string) {
        const daysNum = days ? parseInt(days, 10) : 30;
        const data = await this.analyticsService.getExpiringItems(daysNum);
        return { success: true, data };
    }
}
