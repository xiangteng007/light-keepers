/**
 * analytics-hub.service.ts
 * 
 * v4.0: 分析報表中心 - 整合報表服務
 * 
 * 整合模組:
 * - report-builder
 * - report-scheduler
 * - reports
 * - reports-export
 * - dashboard-analytics
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ANALYTICS_EVENTS } from '../../common/events';

export type ReportFormat = 'pdf' | 'csv' | 'xlsx' | 'json' | 'html';
export type ReportType = 'incident' | 'volunteer' | 'resource' | 'aar' | 'custom';

export interface ReportRequest {
    type: ReportType;
    format: ReportFormat;
    dateRange?: { from: Date; to: Date };
    filters?: Record<string, unknown>;
    userId?: string;
    schedule?: string;  // cron expression
}

export interface ReportResult {
    id: string;
    type: ReportType;
    format: ReportFormat;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    url?: string;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
    size?: number;
}

export interface DashboardStats {
    activeIncidents: number;
    totalVolunteers: number;
    resourceUtilization: number;
    alertsToday: number;
    reportsGenerated: number;
}

@Injectable()
export class AnalyticsHubService {
    private readonly logger = new Logger(AnalyticsHubService.name);
    private reportQueue: Map<string, ReportResult> = new Map();
    private scheduledReports: Map<string, ReportRequest> = new Map();

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) { }

    // ===== 報表生成 =====

    async generateReport(request: ReportRequest): Promise<ReportResult> {
        const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const result: ReportResult = {
            id: reportId,
            type: request.type,
            format: request.format,
            status: 'pending',
            createdAt: new Date(),
        };

        this.reportQueue.set(reportId, result);

        // 模擬異步處理
        this.processReport(reportId, request);

        return result;
    }

    private async processReport(reportId: string, request: ReportRequest) {
        const result = this.reportQueue.get(reportId);
        if (!result) return;

        result.status = 'processing';

        try {
            // 根據報表類型生成
            await this.delay(1000);  // 模擬處理時間

            const data = await this.fetchReportData(request);
            const output = await this.formatReport(data, request.format);

            result.status = 'completed';
            result.completedAt = new Date();
            result.url = `/api/reports/download/${reportId}`;
            result.size = output.length;

            // 發送完成事件
            this.eventEmitter.emit(ANALYTICS_EVENTS.REPORT_JOB_COMPLETED, {
                reportId,
                type: request.type,
                format: request.format,
                userId: request.userId,
            });

            this.logger.log(`Report ${reportId} completed`);
        } catch (error) {
            result.status = 'failed';
            result.error = String(error);
            this.logger.error(`Report ${reportId} failed`, error);
        }
    }

    private async fetchReportData(request: ReportRequest): Promise<unknown[]> {
        // 根據類型獲取資料
        switch (request.type) {
            case 'incident':
                return this.getMockIncidentData();
            case 'volunteer':
                return this.getMockVolunteerData();
            case 'resource':
                return this.getMockResourceData();
            case 'aar':
                return this.getMockAarData();
            default:
                return [];
        }
    }

    private async formatReport(data: unknown[], format: ReportFormat): Promise<string> {
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.toCsv(data as Record<string, unknown>[]);
            default:
                return JSON.stringify(data);
        }
    }

    private toCsv(data: Record<string, unknown>[]): string {
        if (!data.length) return '';
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(h => String(row[h] ?? '')).join(','));
        return [headers.join(','), ...rows].join('\n');
    }

    // ===== 排程報表 =====

    scheduleReport(id: string, request: ReportRequest): void {
        this.scheduledReports.set(id, request);
        this.logger.log(`Scheduled report ${id}: ${request.schedule}`);
    }

    @Cron(CronExpression.EVERY_DAY_AT_6AM)
    async runDailyReports() {
        for (const [id, request] of this.scheduledReports) {
            if (request.schedule === 'daily') {
                await this.generateReport(request);
            }
        }
    }

    // ===== 儀表板統計 =====

    async getDashboardStats(): Promise<DashboardStats> {
        return {
            activeIncidents: Math.floor(Math.random() * 10) + 1,
            totalVolunteers: Math.floor(Math.random() * 50) + 20,
            resourceUtilization: Math.floor(Math.random() * 40) + 60,
            alertsToday: Math.floor(Math.random() * 5),
            reportsGenerated: this.reportQueue.size,
        };
    }

    // ===== 查詢 =====

    getReportStatus(id: string): ReportResult | null {
        return this.reportQueue.get(id) || null;
    }

    getRecentReports(limit: number = 10): ReportResult[] {
        return Array.from(this.reportQueue.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }

    // ===== Mock Data =====

    private getMockIncidentData() {
        return [
            { id: 'INC-001', title: '水災搶救', status: 'active', severity: 'high' },
            { id: 'INC-002', title: '道路救援', status: 'closed', severity: 'medium' },
        ];
    }

    private getMockVolunteerData() {
        return [
            { id: 'VOL-001', name: '張三', skills: '急救', hours: 120 },
            { id: 'VOL-002', name: '李四', skills: '搜救', hours: 85 },
        ];
    }

    private getMockResourceData() {
        return [
            { id: 'RES-001', name: '救護車', quantity: 5, available: 3 },
            { id: 'RES-002', name: '發電機', quantity: 10, available: 8 },
        ];
    }

    private getMockAarData() {
        return [
            { id: 'AAR-001', incident: 'INC-001', lessons: 3, recommendations: 5 },
        ];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
