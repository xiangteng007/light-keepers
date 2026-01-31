/**
 * Analytics Module (Unified)
 * 
 * 整合所有分析相關功能：
 * - 趨勢預測
 * - 儀表板建構
 * - 熱力圖分析
 * - 圖表視覺化
 * 
 * 取代舊模組：dashboard, dashboard-analytics, dashboard-builder, heatmap-analytics, d3-chart
 */

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../reports/reports.entity';
import { TrendPredictionController } from './trend-prediction.controller';
import { TrendPredictionService } from './trend-prediction.service';
import { AnalyticsEventListener } from './analytics-event.listener';
import { DashboardService } from './services/dashboard.service';
import { HeatmapService } from './services/heatmap.service';
import { ChartService } from './services/chart.service';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Report])],
    controllers: [TrendPredictionController],
    providers: [
        TrendPredictionService,
        AnalyticsEventListener,
        DashboardService,
        HeatmapService,
        ChartService,
    ],
    exports: [TrendPredictionService, DashboardService, HeatmapService, ChartService],
})
export class AnalyticsModule { }

