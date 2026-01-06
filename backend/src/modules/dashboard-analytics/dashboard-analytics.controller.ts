import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

@ApiTags('Dashboard Analytics')
@ApiBearerAuth()
@Controller('dashboard-analytics')
export class DashboardAnalyticsController {
    constructor(private readonly service: DashboardAnalyticsService) { }

    // ===== KPI =====

    @Post('kpis')
    @ApiOperation({ summary: '建立 KPI 定義' })
    createKpi(@Body() dto: any) {
        return this.service.createKpi(dto);
    }

    @Get('kpis')
    @ApiOperation({ summary: '取得所有 KPI' })
    getAllKpis() {
        return this.service.getAllKpis();
    }

    @Get('kpis/current')
    @ApiOperation({ summary: '取得所有 KPI 當前值' })
    getCurrentValues() {
        return this.service.getCurrentValues();
    }

    @Get('kpis/:id')
    @ApiOperation({ summary: '取得單一 KPI' })
    getKpi(@Param('id') id: string) {
        return this.service.getKpi(id);
    }

    @Get('kpis/:id/history')
    @ApiOperation({ summary: '取得 KPI 歷史值' })
    getKpiHistory(@Param('id') id: string, @Query('limit') limit?: number) {
        return this.service.getKpiHistory(id, limit || 100);
    }

    @Post('kpis/:id/record')
    @ApiOperation({ summary: '記錄 KPI 值' })
    recordKpiValue(@Param('id') id: string, @Body() dto: { value: number }) {
        return this.service.recordKpiValue(id, dto.value);
    }

    @Put('kpis/:id')
    @ApiOperation({ summary: '更新 KPI' })
    updateKpi(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateKpi(id, dto);
    }

    @Delete('kpis/:id')
    @ApiOperation({ summary: '刪除 KPI' })
    deleteKpi(@Param('id') id: string) {
        return { deleted: this.service.deleteKpi(id) };
    }

    // ===== 警報規則 =====

    @Post('alerts')
    @ApiOperation({ summary: '建立警報規則' })
    createAlertRule(@Body() dto: any) {
        return this.service.createAlertRule(dto);
    }

    @Get('alerts')
    @ApiOperation({ summary: '取得所有警報規則' })
    getAlertRules() {
        return this.service.getAlertRules();
    }

    @Put('alerts/:id')
    @ApiOperation({ summary: '更新警報規則' })
    updateAlertRule(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateAlertRule(id, dto);
    }

    @Delete('alerts/:id')
    @ApiOperation({ summary: '刪除警報規則' })
    deleteAlertRule(@Param('id') id: string) {
        return { deleted: this.service.deleteAlertRule(id) };
    }

    // ===== 儀表板 =====

    @Post('dashboards')
    @ApiOperation({ summary: '建立儀表板' })
    createDashboard(@Body() dto: any) {
        return this.service.createDashboard(dto);
    }

    @Get('dashboards')
    @ApiOperation({ summary: '取得所有儀表板' })
    getAllDashboards(@Query('userId') userId?: string) {
        return this.service.getAllDashboards(userId);
    }

    @Get('dashboards/:id')
    @ApiOperation({ summary: '取得儀表板' })
    getDashboard(@Param('id') id: string) {
        return this.service.getDashboard(id);
    }

    @Put('dashboards/:id')
    @ApiOperation({ summary: '更新儀表板' })
    updateDashboard(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateDashboard(id, dto);
    }

    @Delete('dashboards/:id')
    @ApiOperation({ summary: '刪除儀表板' })
    deleteDashboard(@Param('id') id: string) {
        return { deleted: this.service.deleteDashboard(id) };
    }

    @Post('dashboards/:id/widgets')
    @ApiOperation({ summary: '新增 Widget' })
    addWidget(@Param('id') id: string, @Body() dto: any) {
        return this.service.addWidget(id, dto);
    }

    @Delete('dashboards/:dashboardId/widgets/:widgetId')
    @ApiOperation({ summary: '移除 Widget' })
    removeWidget(@Param('dashboardId') dashboardId: string, @Param('widgetId') widgetId: string) {
        return { removed: this.service.removeWidget(dashboardId, widgetId) };
    }

    // ===== 資料分析 =====

    @Get('data/aggregate')
    @ApiOperation({ summary: '聚合資料查詢' })
    getAggregatedData(
        @Query('source') source: string,
        @Query('aggregation') aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min',
        @Query('groupBy') groupBy?: string
    ) {
        return this.service.getAggregatedData(source, aggregation, groupBy);
    }

    @Get('data/timeseries')
    @ApiOperation({ summary: '時序資料查詢' })
    getTimeSeriesData(
        @Query('source') source: string,
        @Query('interval') interval: '1m' | '5m' | '1h' | '1d',
        @Query('points') points?: number
    ) {
        return this.service.getTimeSeriesData(source, interval, points || 24);
    }
}
