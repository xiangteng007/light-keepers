import { Injectable, Logger } from '@nestjs/common';
import { ReportBuilderService, ReportDefinition, GeneratedReport, ReportFilter } from './services/report-builder.service';
import { ReportSchedulerService, ReportSchedule } from './services/report-scheduler.service';
import { ExportService, ExportOptions, ExportResult } from './services/export.service';
import { TemplateService, ReportTemplate } from './services/template.service';

/**
 * Reporting Engine (Unified Facade)
 * 
 * 統一的報表服務入口
 */
@Injectable()
export class ReportingEngineService {
    private readonly logger = new Logger(ReportingEngineService.name);

    constructor(
        private readonly builder: ReportBuilderService,
        private readonly scheduler: ReportSchedulerService,
        private readonly exporter: ExportService,
        private readonly templates: TemplateService,
    ) {}

    // === Report Definition ===

    createReportDefinition(data: Omit<ReportDefinition, 'id' | 'createdAt'>): ReportDefinition {
        return this.builder.createDefinition(data);
    }

    getReportDefinition(id: string): ReportDefinition | undefined {
        return this.builder.getDefinition(id);
    }

    listReportDefinitions(): ReportDefinition[] {
        return this.builder.listDefinitions();
    }

    // === Report Generation ===

    async generateReport(definitionId: string, filters?: ReportFilter[]): Promise<GeneratedReport> {
        return this.builder.generateReport(definitionId, filters);
    }

    getGeneratedReport(id: string): GeneratedReport | undefined {
        return this.builder.getGeneratedReport(id);
    }

    listGeneratedReports(): GeneratedReport[] {
        return this.builder.listGeneratedReports();
    }

    // === Export ===

    async exportReport(reportId: string, options: ExportOptions): Promise<ExportResult> {
        const report = this.builder.getGeneratedReport(reportId);
        if (!report) {
            throw new Error(`Report not found: ${reportId}`);
        }
        return this.exporter.exportReport(report.data, options);
    }

    async generateAndExport(
        definitionId: string,
        exportOptions: ExportOptions,
        filters?: ReportFilter[]
    ): Promise<ExportResult> {
        const report = await this.builder.generateReport(definitionId, filters);
        return this.exporter.exportReport(report.data, exportOptions);
    }

    // === Scheduling ===

    createSchedule(data: Omit<ReportSchedule, 'id' | 'nextRun'>): ReportSchedule {
        return this.scheduler.createSchedule(data);
    }

    getSchedule(id: string): ReportSchedule | undefined {
        return this.scheduler.getSchedule(id);
    }

    listSchedules(): ReportSchedule[] {
        return this.scheduler.listSchedules();
    }

    updateSchedule(id: string, updates: Partial<ReportSchedule>): ReportSchedule | null {
        return this.scheduler.updateSchedule(id, updates);
    }

    deleteSchedule(id: string): boolean {
        return this.scheduler.deleteSchedule(id);
    }

    async triggerSchedule(id: string): Promise<any> {
        return this.scheduler.triggerSchedule(id);
    }

    // === Templates ===

    createTemplate(data: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): ReportTemplate {
        return this.templates.createTemplate(data);
    }

    getTemplate(id: string): ReportTemplate | undefined {
        return this.templates.getTemplate(id);
    }

    listTemplates(): ReportTemplate[] {
        return this.templates.listTemplates();
    }

    renderTemplate(templateId: string, variables: Record<string, any>): string {
        return this.templates.render(templateId, variables);
    }
}
