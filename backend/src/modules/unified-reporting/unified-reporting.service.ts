/**
 * Unified Reporting Service
 * 
 * Facade service for all reporting operations:
 * - Template-based report generation and scheduling (ReportingEngine)
 * - Incident/disaster reporting and analysis (Reports)
 * 
 * Use Cases:
 * - ReportingEngine: 產生定期報表、Excel/PDF 匯出、排程遞送
 * - Reports: 災情回報管理、審核流程、熱點分析、趨勢統計
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ReportingEngineService } from '../reporting-engine/reporting-engine.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class UnifiedReportingService {
    private readonly logger = new Logger(UnifiedReportingService.name);

    constructor(
        @Inject(forwardRef(() => ReportingEngineService))
        private readonly engineService: ReportingEngineService,
        @Inject(forwardRef(() => ReportsService))
        private readonly reportsService: ReportsService,
    ) {}

    // ==================== Status ====================

    /**
     * Get overall reporting system status
     */
    getStatus(): {
        engineReady: boolean;
        reportsReady: boolean;
    } {
        return {
            engineReady: true,
            reportsReady: true,
        };
    }

    // ==================== Reporting Engine (Template Reports) ====================

    /**
     * Create a report definition/template
     */
    createReportDefinition(data: any): any {
        return this.engineService.createReportDefinition(data);
    }

    /**
     * Get a report definition by ID
     */
    getReportDefinition(id: string): any {
        return this.engineService.getReportDefinition(id);
    }

    /**
     * List all report definitions
     */
    listReportDefinitions(): any[] {
        return this.engineService.listReportDefinitions();
    }

    /**
     * Generate a report from definition
     */
    async generateReport(definitionId: string, filters?: any[]): Promise<any> {
        return this.engineService.generateReport(definitionId, filters);
    }

    /**
     * Export a generated report
     */
    async exportReport(reportId: string, options: { format: 'pdf' | 'excel' | 'csv'; filename?: string }): Promise<any> {
        return this.engineService.exportReport(reportId, options);
    }

    /**
     * Generate and export in one step
     */
    async generateAndExport(
        definitionId: string,
        exportOptions: { format: 'pdf' | 'excel' | 'csv'; filename?: string },
        filters?: any[],
    ): Promise<any> {
        return this.engineService.generateAndExport(definitionId, exportOptions, filters);
    }

    /**
     * Create report schedule
     */
    createSchedule(data: any): any {
        return this.engineService.createSchedule(data);
    }

    /**
     * List all schedules
     */
    listSchedules(): any[] {
        return this.engineService.listSchedules();
    }

    // ==================== Reports (Incident/Disaster Reports) ====================

    /**
     * Create a new incident report
     */
    async createIncidentReport(dto: {
        type: string;
        severity?: string;
        title: string;
        description: string;
        latitude: number;
        longitude: number;
        address?: string;
        photos?: string[];
        contactName?: string;
        contactPhone?: string;
        source?: string;
    }): Promise<any> {
        return this.reportsService.create(dto as any);
    }

    /**
     * Get all incident reports with optional filters
     */
    async findAllReports(filter?: {
        status?: string;
        type?: string;
        severity?: string;
        limit?: number;
        offset?: number;
    }): Promise<any[]> {
        return this.reportsService.findAll(filter as any);
    }

    /**
     * Get a single report by ID
     */
    async findReport(id: string): Promise<any> {
        return this.reportsService.findOne(id);
    }

    /**
     * Get reports for map display
     */
    async findForMap(): Promise<any[]> {
        return this.reportsService.findForMap();
    }

    /**
     * Review/approve a report
     */
    async reviewReport(id: string, dto: {
        status: 'confirmed' | 'rejected';
        reviewedBy: string;
        reviewNote?: string;
    }): Promise<any> {
        return this.reportsService.review(id, dto);
    }

    /**
     * Get report statistics
     */
    async getReportStats(): Promise<{
        total: number;
        pending: number;
        confirmed: number;
        rejected: number;
        byType: Record<string, number>;
    }> {
        return this.reportsService.getStats();
    }

    /**
     * Get disaster hotspots
     */
    async getHotspots(options?: {
        gridSizeKm?: number;
        minCount?: number;
        days?: number;
    }): Promise<any> {
        return this.reportsService.getHotspots(options as any);
    }

    /**
     * Get trend data
     */
    async getTrendData(days?: number): Promise<{
        labels: string[];
        datasets: { label: string; data: number[] }[];
    }> {
        return this.reportsService.getTrendData(days);
    }

    /**
     * Get regional statistics
     */
    async getRegionStats(days?: number): Promise<{
        regions: string[];
        values: number[];
    }> {
        return this.reportsService.getRegionStats(days);
    }

    // ==================== Combined Operations ====================

    /**
     * Generate comprehensive disaster summary report
     */
    async generateDisasterSummary(options?: {
        days?: number;
        includeHotspots?: boolean;
        includeTrends?: boolean;
    }): Promise<{
        stats: any;
        hotspots?: any;
        trends?: any;
        generatedAt: Date;
    }> {
        this.logger.log('Generating comprehensive disaster summary');

        const [stats, hotspots, trends] = await Promise.all([
            this.reportsService.getStats(),
            options?.includeHotspots !== false ? this.reportsService.getHotspots({ days: options?.days }) : null,
            options?.includeTrends !== false ? this.reportsService.getTrendData(options?.days) : null,
        ]);

        return {
            stats,
            hotspots: hotspots || undefined,
            trends: trends || undefined,
            generatedAt: new Date(),
        };
    }
}
