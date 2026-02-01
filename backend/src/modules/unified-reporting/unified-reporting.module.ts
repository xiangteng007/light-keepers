/**
 * Unified Reporting Module
 * 
 * Consolidates all reporting capabilities:
 * - Reporting Engine (報表模板生成/排程/匯出)
 * - Reports (災情回報管理/審核/熱點分析)
 * 
 * This facade module re-exports from specialized reporting modules
 * for a unified API while maintaining backward compatibility.
 */

import { Module, forwardRef } from '@nestjs/common';
import { ReportingEngineModule } from '../reporting-engine/reporting-engine.module';
import { ReportsModule } from '../reports/reports.module';
import { UnifiedReportingService } from './unified-reporting.service';

@Module({
    imports: [
        forwardRef(() => ReportingEngineModule),
        forwardRef(() => ReportsModule),
    ],
    providers: [UnifiedReportingService],
    exports: [
        UnifiedReportingService,
        ReportingEngineModule,
        ReportsModule,
    ],
})
export class UnifiedReportingModule {}
