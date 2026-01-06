import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseUseCase } from './base.usecase';
import { AiJob } from '../entities';
import { GeminiProvider } from '../providers/gemini.provider';
import { FieldReport } from '../../field-reports/entities';

/**
 * Output schema for task draft from report
 */
export interface TaskDraftOutput {
    title: string;
    objective: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    location: { lat: number; lng: number; address?: string };
    checklist: string[];
    requiredItems: Array<{ itemId?: string; name: string; quantity: number }>;
    sopSlugs: string[];
    estimatedDurationMin: number;
}

const TASK_DRAFT_SCHEMA = {
    type: 'object',
    properties: {
        title: { type: 'string', maxLength: 100 },
        objective: { type: 'string', maxLength: 500 },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        location: {
            type: 'object',
            properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                address: { type: 'string' },
            },
        },
        checklist: { type: 'array', items: { type: 'string' } },
        requiredItems: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    quantity: { type: 'integer' },
                },
            },
        },
        sopSlugs: { type: 'array', items: { type: 'string' } },
        estimatedDurationMin: { type: 'integer' },
    },
    required: ['title', 'objective', 'priority', 'checklist'],
};

const TASK_DRAFT_PROMPT = `
You are creating a task assignment for disaster response volunteers based on a field report.

Report Details:
- Type: {{type}}
- Category: {{category}}
- Severity: {{severity}} (0=info, 1=minor, 2=moderate, 3=major, 4=critical)
- Message: {{message}}
- Location: {{location}}

Create a structured task in Traditional Chinese (繁體中文) that:
1. Has a clear, actionable title
2. Explains the objective
3. Sets appropriate priority based on severity
4. Includes a practical checklist (5-8 items)
5. Lists any required equipment/supplies
6. Suggests relevant SOPs (use slug format like 'sop-fire-response')
7. Estimates duration

Output valid JSON matching the schema.
`.trim();

@Injectable()
export class TaskDraftUseCase extends BaseUseCase {
    readonly useCaseId = 'task.draftFromReport.v1';

    private readonly typeToSop: Record<string, string[]> = {
        fire: ['sop-fire-response', 'sop-evacuation'],
        flood: ['sop-flood-rescue', 'sop-water-pump'],
        earthquake: ['sop-earthquake-search', 'sop-structural-assessment'],
        medical: ['sop-first-aid', 'sop-patient-transport'],
        traffic: ['sop-traffic-control', 'sop-accident-response'],
        infrastructure: ['sop-utility-repair', 'sop-road-clearing'],
    };

    constructor(
        private gemini: GeminiProvider,
        @InjectRepository(FieldReport)
        private reportRepo: Repository<FieldReport>,
    ) {
        super();
    }

    async execute(job: AiJob): Promise<TaskDraftOutput> {
        const report = await this.reportRepo.findOne({ where: { id: job.entityId } });
        if (!report) {
            throw new Error(`Report ${job.entityId} not found`);
        }

        const coords = this.extractCoordinates(report.geom);
        const locationStr = coords ? `(${coords.lat}, ${coords.lng})` : '未知位置';

        const prompt = this.buildPrompt(TASK_DRAFT_PROMPT, {
            type: report.type,
            category: report.category,
            severity: report.severity,
            message: this.truncate(report.message, 1000),
            location: locationStr,
        });

        const result = await this.gemini.run({
            useCaseId: this.useCaseId,
            prompt,
            schema: TASK_DRAFT_SCHEMA,
            maxOutputTokens: 1024,
        });

        return result.outputJson as TaskDraftOutput;
    }

    async fallback(job: AiJob): Promise<TaskDraftOutput> {
        const report = await this.reportRepo.findOne({ where: { id: job.entityId } });
        if (!report) {
            return this.getEmptyFallback();
        }

        const coords = this.extractCoordinates(report.geom);

        return {
            title: `處理 ${this.getTypeLabel(report.type)} 事件`,
            objective: `調查並處理已回報的 ${this.getTypeLabel(report.type)} 狀況`,
            priority: this.severityToPriority(report.severity),
            location: {
                lat: coords?.lat ?? 0,
                lng: coords?.lng ?? 0,
            },
            checklist: [
                '抵達現場並評估狀況',
                '確保人員安全',
                '記錄現場情況',
                '聯繫指揮中心回報狀態',
                '執行必要處置',
                '完成任務報告',
            ],
            requiredItems: [],
            sopSlugs: this.typeToSop[report.type] || [],
            estimatedDurationMin: 60,
        };
    }

    private getEmptyFallback(): TaskDraftOutput {
        return {
            title: '待處理任務',
            objective: '請查看原始報告了解詳情',
            priority: 'normal',
            location: { lat: 0, lng: 0 },
            checklist: ['評估狀況', '回報指揮中心'],
            requiredItems: [],
            sopSlugs: [],
            estimatedDurationMin: 60,
        };
    }

    private getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            fire: '火災',
            flood: '水災',
            earthquake: '地震',
            medical: '醫療',
            traffic: '交通',
            infrastructure: '基礎設施',
            incident: '事件',
            resource: '資源',
            sos: '緊急求救',
            other: '其他',
        };
        return labels[type] || type;
    }

    private severityToPriority(severity: number): 'low' | 'normal' | 'high' | 'urgent' {
        if (severity >= 4) return 'urgent';
        if (severity >= 3) return 'high';
        if (severity >= 2) return 'normal';
        return 'low';
    }

    /**
     * Extract lat/lng from PostGIS geometry
     */
    private extractCoordinates(geom: any): { lat: number; lng: number } | null {
        if (!geom) return null;

        if (geom.coordinates) {
            return { lng: geom.coordinates[0], lat: geom.coordinates[1] };
        }

        if (typeof geom === 'string' && geom.startsWith('POINT')) {
            const match = geom.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i);
            if (match) {
                return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
            }
        }

        return null;
    }
}
