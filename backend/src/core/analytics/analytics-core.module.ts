/**
 * Analytics Core Module - 數據分析中心
 * 
 * 整合模組: analytics, reports
 * (已整合: dashboard, heatmap, chart 服務至 AnalyticsModule)
 * 
 * 職責:
 * - 報表產生與排程
 * - 儀表板視覺化
 * - 資料匯出
 * - 績效分析
 */

import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../../modules/analytics/analytics.module';
import { ReportsModule } from '../../modules/reports/reports.module';

@Module({
    imports: [
        AnalyticsModule,
        ReportsModule,
    ],
    exports: [AnalyticsModule, ReportsModule],
})
export class AnalyticsCoreModule { }

