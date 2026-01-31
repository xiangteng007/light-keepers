import { Injectable, Logger } from '@nestjs/common';

export interface ReportTemplate {
    id: string;
    name: string;
    category: 'mission' | 'resource' | 'volunteer' | 'incident' | 'ics' | 'custom';
    content: string;
    variables: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 報表範本服務
 */
@Injectable()
export class TemplateService {
    private readonly logger = new Logger(TemplateService.name);
    private templates: Map<string, ReportTemplate> = new Map();

    constructor() {
        this.initDefaultTemplates();
    }

    /**
     * 建立範本
     */
    createTemplate(data: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): ReportTemplate {
        const template: ReportTemplate = {
            ...data,
            id: `template-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.templates.set(template.id, template);
        return template;
    }

    /**
     * 取得範本
     */
    getTemplate(id: string): ReportTemplate | undefined {
        return this.templates.get(id);
    }

    /**
     * 依類別取得範本
     */
    getTemplatesByCategory(category: string): ReportTemplate[] {
        return Array.from(this.templates.values())
            .filter(t => t.category === category);
    }

    /**
     * 列出所有範本
     */
    listTemplates(): ReportTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * 更新範本
     */
    updateTemplate(id: string, updates: Partial<ReportTemplate>): ReportTemplate | null {
        const template = this.templates.get(id);
        if (!template) return null;

        const updated = { ...template, ...updates, updatedAt: new Date() };
        this.templates.set(id, updated);
        return updated;
    }

    /**
     * 刪除範本
     */
    deleteTemplate(id: string): boolean {
        return this.templates.delete(id);
    }

    /**
     * 渲染範本
     */
    render(templateId: string, variables: Record<string, any>): string {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        let content = template.content;
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
        return content;
    }

    // === Private ===

    private initDefaultTemplates(): void {
        const defaults: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
            {
                name: '任務摘要報表',
                category: 'mission',
                content: `
# 任務報告: {{missionName}}

## 基本資訊
- **任務編號**: {{missionId}}
- **開始時間**: {{startTime}}
- **結束時間**: {{endTime}}
- **狀態**: {{status}}

## 參與人員
共 {{volunteerCount}} 名志工參與

## 執行摘要
{{summary}}
                `.trim(),
                variables: ['missionName', 'missionId', 'startTime', 'endTime', 'status', 'volunteerCount', 'summary'],
                createdBy: 'system',
            },
            {
                name: 'ICS-214 活動日誌',
                category: 'ics',
                content: `
# ICS-214 活動日誌

## 事件資訊
- **事件名稱**: {{incidentName}}
- **日期**: {{date}}
- **操作期間**: {{operationalPeriod}}

## 人員
- **姓名**: {{personnelName}}
- **職位**: {{position}}
- **單位**: {{unit}}

## 活動記錄
| 時間 | 活動內容 |
|------|----------|
{{activityLog}}
                `.trim(),
                variables: ['incidentName', 'date', 'operationalPeriod', 'personnelName', 'position', 'unit', 'activityLog'],
                createdBy: 'system',
            },
        ];

        for (const def of defaults) {
            this.createTemplate(def);
        }
    }
}
