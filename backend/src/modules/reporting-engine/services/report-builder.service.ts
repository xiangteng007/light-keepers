import { Injectable, Logger } from '@nestjs/common';

export interface ReportDefinition {
    id: string;
    name: string;
    type: 'mission' | 'resource' | 'volunteer' | 'incident' | 'financial' | 'custom';
    sections: ReportSection[];
    filters: ReportFilter[];
    createdBy: string;
    createdAt: Date;
}

export interface ReportSection {
    id: string;
    title: string;
    type: 'table' | 'chart' | 'summary' | 'text' | 'map';
    dataSource: string;
    columns?: string[];
    chartType?: 'bar' | 'line' | 'pie' | 'area';
    options?: Record<string, any>;
}

export interface ReportFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'like';
    value: any;
}

export interface GeneratedReport {
    id: string;
    definitionId: string;
    name: string;
    generatedAt: Date;
    data: any;
    metadata: {
        rowCount: number;
        executionTime: number;
        filters: ReportFilter[];
    };
}

/**
 * 報表建構器服務
 * 
 * 提供：
 * - 動態報表定義
 * - 資料來源整合
 * - 報表執行
 */
@Injectable()
export class ReportBuilderService {
    private readonly logger = new Logger(ReportBuilderService.name);
    private definitions: Map<string, ReportDefinition> = new Map();
    private generatedReports: Map<string, GeneratedReport> = new Map();

    constructor() {
        this.initDefaultDefinitions();
    }

    /**
     * 建立報表定義
     */
    createDefinition(data: Omit<ReportDefinition, 'id' | 'createdAt'>): ReportDefinition {
        const definition: ReportDefinition = {
            ...data,
            id: `def-${Date.now()}`,
            createdAt: new Date(),
        };
        this.definitions.set(definition.id, definition);
        return definition;
    }

    /**
     * 取得報表定義
     */
    getDefinition(id: string): ReportDefinition | undefined {
        return this.definitions.get(id);
    }

    /**
     * 列出所有定義
     */
    listDefinitions(): ReportDefinition[] {
        return Array.from(this.definitions.values());
    }

    /**
     * 執行報表
     */
    async generateReport(
        definitionId: string,
        filters: ReportFilter[] = []
    ): Promise<GeneratedReport> {
        const startTime = Date.now();
        const definition = this.definitions.get(definitionId);
        
        if (!definition) {
            throw new Error(`Report definition not found: ${definitionId}`);
        }

        // 模擬資料生成
        const data = await this.fetchReportData(definition, filters);
        
        const report: GeneratedReport = {
            id: `report-${Date.now()}`,
            definitionId,
            name: definition.name,
            generatedAt: new Date(),
            data,
            metadata: {
                rowCount: Array.isArray(data) ? data.length : 1,
                executionTime: Date.now() - startTime,
                filters,
            },
        };

        this.generatedReports.set(report.id, report);
        return report;
    }

    /**
     * 取得已生成報表
     */
    getGeneratedReport(id: string): GeneratedReport | undefined {
        return this.generatedReports.get(id);
    }

    /**
     * 列出已生成報表
     */
    listGeneratedReports(): GeneratedReport[] {
        return Array.from(this.generatedReports.values());
    }

    // === Private ===

    private async fetchReportData(
        definition: ReportDefinition,
        filters: ReportFilter[]
    ): Promise<any> {
        // 根據報表類型生成模擬資料
        switch (definition.type) {
            case 'mission':
                return this.generateMissionData();
            case 'resource':
                return this.generateResourceData();
            case 'volunteer':
                return this.generateVolunteerData();
            case 'incident':
                return this.generateIncidentData();
            default:
                return [];
        }
    }

    private generateMissionData(): any[] {
        return Array.from({ length: 10 }, (_, i) => ({
            id: `mission-${i + 1}`,
            name: `任務 ${i + 1}`,
            status: ['進行中', '已完成', '待命'][i % 3],
            volunteers: Math.floor(Math.random() * 20) + 5,
            startDate: new Date(Date.now() - Math.random() * 7 * 86400000),
        }));
    }

    private generateResourceData(): any[] {
        return Array.from({ length: 15 }, (_, i) => ({
            id: `resource-${i + 1}`,
            name: ['急救箱', '擔架', '發電機', '帳篷', '飲用水'][i % 5],
            quantity: Math.floor(Math.random() * 100),
            location: ['台北倉庫', '台中倉庫', '高雄倉庫'][i % 3],
        }));
    }

    private generateVolunteerData(): any[] {
        return Array.from({ length: 20 }, (_, i) => ({
            id: `vol-${i + 1}`,
            name: `志工 ${i + 1}`,
            skills: ['急救', '搜救', '通訊', '駕駛'].slice(0, (i % 4) + 1),
            missionsCompleted: Math.floor(Math.random() * 50),
            status: ['可用', '任務中', '休息'][i % 3],
        }));
    }

    private generateIncidentData(): any[] {
        return Array.from({ length: 8 }, (_, i) => ({
            id: `incident-${i + 1}`,
            type: ['水災', '火災', '地震', '土石流'][i % 4],
            severity: ['低', '中', '高', '緊急'][i % 4],
            location: `區域 ${i + 1}`,
            reportedAt: new Date(Date.now() - Math.random() * 3 * 86400000),
        }));
    }

    private initDefaultDefinitions(): void {
        const defaults: Omit<ReportDefinition, 'id' | 'createdAt'>[] = [
            {
                name: '任務摘要報表',
                type: 'mission',
                sections: [{ id: 's1', title: '任務列表', type: 'table', dataSource: 'missions' }],
                filters: [],
                createdBy: 'system',
            },
            {
                name: '資源庫存報表',
                type: 'resource',
                sections: [{ id: 's1', title: '庫存狀態', type: 'table', dataSource: 'resources' }],
                filters: [],
                createdBy: 'system',
            },
            {
                name: '志工統計報表',
                type: 'volunteer',
                sections: [{ id: 's1', title: '志工統計', type: 'chart', dataSource: 'volunteers', chartType: 'bar' }],
                filters: [],
                createdBy: 'system',
            },
        ];

        for (const def of defaults) {
            this.createDefinition(def);
        }
    }
}
