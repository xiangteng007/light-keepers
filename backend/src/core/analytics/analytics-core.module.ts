/**
 * Analytics Core Module - 數據分析中心
 * 
 * 整合模組: analytics, dashboard-analytics, dashboard-builder,
 *           heatmap-analytics, reports, reports-export, report-builder,
 *           report-scheduler, performance-report, excel-export,
 *           pdf-generator, timeline-visualization, d3-chart, power-bi
 * 
 * 職責:
 * - 報表產生與排程
 * - 儀表板視覺化
 * - 資料匯出 (Excel/PDF)
 * - 績效分析
 */

import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../../modules/analytics/analytics.module';
import { ReportsModule } from '../../modules/reports/reports.module';
import { ReportsExportModule } from '../../modules/reports-export/reports-export.module';

@Module({
    imports: [
        AnalyticsModule,
        ReportsModule,
        ReportsExportModule,
        // 未來整合: DashboardBuilderModule, etc.
    ],
    exports: [AnalyticsModule, ReportsModule, ReportsExportModule],
})
export class AnalyticsCoreModule { }
