import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ResourcesAnalyticsService } from './resources-analytics.service';
import { CoreJwtGuard } from '../shared/guards';

@Controller('resources/analytics')
@UseGuards(CoreJwtGuard)
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
