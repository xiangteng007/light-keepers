import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Services
import { ReportBuilderService } from './services/report-builder.service';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { ExportService } from './services/export.service';
import { TemplateService } from './services/template.service';

// Unified Service
import { ReportingEngineService } from './reporting-engine.service';

// Controller
import { ReportingController } from './reporting.controller';

/**
 * Reporting Engine Module (Unified)
 * 
 * 整合所有報表相關功能：
 * - 報表建構器
 * - 排程報表
 * - 匯出服務 (PDF, Excel, CSV)
 * - 範本管理
 * 
 * 取代舊模組：
 * - reports
 * - report-builder
 * - report-scheduler
 * - reports-export
 * - excel-export
 * - pdf-generator
 */
@Global()
@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [ReportingController],
    providers: [
        ReportBuilderService,
        ReportSchedulerService,
        ExportService,
        TemplateService,
        ReportingEngineService,
    ],
    exports: [
        ReportingEngineService,
        ExportService,
    ],
})
export class ReportingEngineModule {}
