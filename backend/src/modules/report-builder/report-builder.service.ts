import { Injectable, Logger } from '@nestjs/common';

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    type: 'table' | 'chart' | 'mixed';
    dataSource: string;
    columns: ReportColumn[];
    filters: ReportFilter[];
    charts?: ChartConfig[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReportColumn {
    field: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    format?: string;
    aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportFilter {
    field: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'dateRange' | 'number';
    options?: { value: string; label: string }[];
    required?: boolean;
}

export interface ChartConfig {
    type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
    title: string;
    xAxis: string;
    yAxis: string[];
    colors?: string[];
}

export interface ScheduledReport {
    id: string;
    templateId: string;
    name: string;
    schedule: 'daily' | 'weekly' | 'monthly';
    cronExpression: string;
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
    enabled: boolean;
    lastRunAt?: Date;
    nextRunAt: Date;
}

export interface ReportResult {
    success: boolean;
    error?: string;
    template?: string;
    generatedAt?: Date;
    filters?: Record<string, any>;
    data?: any[];
    charts?: any[];
}

@Injectable()
export class ReportBuilderService {
    private readonly logger = new Logger(ReportBuilderService.name);
    private templates: Map<string, ReportTemplate> = new Map();
    private scheduledReports: Map<string, ScheduledReport> = new Map();

    constructor() {
        this.initializeDefaultTemplates();
    }

    private initializeDefaultTemplates() {
        const templates: ReportTemplate[] = [
            {
                id: 'volunteer-summary',
                name: '志工服務摘要',
                description: '統計志工服務時數與出勤次數',
                type: 'mixed',
                dataSource: 'attendance',
                columns: [
                    { field: 'volunteerName', label: '志工姓名', type: 'string' },
                    { field: 'totalHours', label: '總時數', type: 'number', aggregate: 'sum' },
                    { field: 'shiftCount', label: '出勤次數', type: 'number', aggregate: 'count' },
                ],
                filters: [
                    { field: 'dateRange', label: '日期範圍', type: 'dateRange', required: true },
                ],
                charts: [
                    { type: 'bar', title: '志工服務時數', xAxis: 'volunteerName', yAxis: ['totalHours'] },
                ],
                createdBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'event-statistics',
                name: '事件統計報表',
                description: '災情事件類型與處理統計',
                type: 'mixed',
                dataSource: 'events',
                columns: [
                    { field: 'type', label: '事件類型', type: 'string' },
                    { field: 'count', label: '數量', type: 'number', aggregate: 'count' },
                    { field: 'avgResponseTime', label: '平均回應時間', type: 'number', aggregate: 'avg' },
                ],
                filters: [
                    { field: 'dateRange', label: '日期範圍', type: 'dateRange' },
                    {
                        field: 'severity', label: '嚴重程度', type: 'select', options: [
                            { value: 'low', label: '低' },
                            { value: 'medium', label: '中' },
                            { value: 'high', label: '高' },
                            { value: 'critical', label: '緊急' },
                        ]
                    },
                ],
                charts: [
                    { type: 'pie', title: '事件類型分布', xAxis: 'type', yAxis: ['count'] },
                ],
                createdBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        templates.forEach(t => this.templates.set(t.id, t));
    }

    // ===== 模板管理 =====

    getTemplates(): ReportTemplate[] {
        return Array.from(this.templates.values());
    }

    getTemplate(id: string): ReportTemplate | undefined {
        return this.templates.get(id);
    }

    createTemplate(data: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): ReportTemplate {
        const template: ReportTemplate = {
            ...data,
            id: `tpl-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.templates.set(template.id, template);
        return template;
    }

    updateTemplate(id: string, updates: Partial<ReportTemplate>): ReportTemplate | null {
        const template = this.templates.get(id);
        if (!template) return null;

        Object.assign(template, updates, { updatedAt: new Date() });
        return template;
    }

    deleteTemplate(id: string): boolean {
        return this.templates.delete(id);
    }

    // ===== 報表產生 =====

    async generateReport(templateId: string, filters: Record<string, any>): Promise<ReportResult> {
        const template = this.templates.get(templateId);
        if (!template) {
            return { success: false, error: 'Template not found' };
        }

        // 模擬資料查詢
        const data = await this.fetchData(template.dataSource, filters);
        const processedData = this.processData(data, template.columns);

        return {
            success: true,
            template: template.name,
            generatedAt: new Date(),
            filters,
            data: processedData,
            charts: template.charts?.map(c => ({
                ...c,
                data: this.generateChartData(processedData, c),
            })),
        };
    }

    private async fetchData(dataSource: string, filters: Record<string, any>): Promise<any[]> {
        // 模擬資料
        return [
            { volunteerName: '王大明', totalHours: 45, shiftCount: 12 },
            { volunteerName: '李小華', totalHours: 38, shiftCount: 10 },
            { volunteerName: '張三豐', totalHours: 52, shiftCount: 15 },
        ];
    }

    private processData(data: any[], columns: ReportColumn[]): any[] {
        return data;
    }

    private generateChartData(data: any[], config: ChartConfig): any {
        return {
            labels: data.map(d => d[config.xAxis]),
            datasets: config.yAxis.map((y, i) => ({
                label: y,
                data: data.map(d => d[y]),
                backgroundColor: config.colors?.[i] || `hsl(${i * 60}, 70%, 50%)`,
            })),
        };
    }

    // ===== 排程報表 =====

    getScheduledReports(): ScheduledReport[] {
        return Array.from(this.scheduledReports.values());
    }

    scheduleReport(data: {
        templateId: string;
        name: string;
        schedule: 'daily' | 'weekly' | 'monthly';
        recipients: string[];
        format: 'pdf' | 'excel' | 'csv';
    }): ScheduledReport {
        const cronExpressions = {
            daily: '0 8 * * *',
            weekly: '0 8 * * 1',
            monthly: '0 8 1 * *',
        };

        const scheduled: ScheduledReport = {
            id: `sched-${Date.now()}`,
            templateId: data.templateId,
            name: data.name,
            schedule: data.schedule,
            cronExpression: cronExpressions[data.schedule],
            recipients: data.recipients,
            format: data.format,
            enabled: true,
            nextRunAt: this.calculateNextRun(data.schedule),
        };

        this.scheduledReports.set(scheduled.id, scheduled);
        return scheduled;
    }

    toggleScheduledReport(id: string, enabled: boolean): boolean {
        const report = this.scheduledReports.get(id);
        if (!report) return false;
        report.enabled = enabled;
        return true;
    }

    deleteScheduledReport(id: string): boolean {
        return this.scheduledReports.delete(id);
    }

    private calculateNextRun(schedule: 'daily' | 'weekly' | 'monthly'): Date {
        const now = new Date();
        switch (schedule) {
            case 'daily':
                now.setDate(now.getDate() + 1);
                now.setHours(8, 0, 0, 0);
                break;
            case 'weekly':
                now.setDate(now.getDate() + 7);
                now.setHours(8, 0, 0, 0);
                break;
            case 'monthly':
                now.setMonth(now.getMonth() + 1, 1);
                now.setHours(8, 0, 0, 0);
                break;
        }
        return now;
    }
}

