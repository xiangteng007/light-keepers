import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseUseCase } from './base.usecase';
import { AiJob } from '../entities';
import { GeminiProvider } from '../providers/gemini.provider';
import { FieldReport } from '../../field-reports/entities';

/**
 * Resource recommendation output structure
 */
export interface ResourceRecommendOutput {
    resources: ResourceItem[];
    totalEstimatedCost: number | null;
    urgencyLevel: 'immediate' | 'urgent' | 'normal' | 'low';
    rationale: string;
    isFallback: boolean;
}

export interface ResourceItem {
    category: 'personnel' | 'equipment' | 'supplies' | 'transport' | 'medical' | 'communication';
    name: string;
    quantity: number;
    unit: string;
    estimatedCost: number | null;
    priority: 'critical' | 'high' | 'medium' | 'low';
    notes?: string;
}

const OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        resources: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    category: { type: 'string', enum: ['personnel', 'equipment', 'supplies', 'transport', 'medical', 'communication'] },
                    name: { type: 'string' },
                    quantity: { type: 'number' },
                    unit: { type: 'string' },
                    estimatedCost: { type: 'number', nullable: true },
                    priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    notes: { type: 'string' },
                },
                required: ['category', 'name', 'quantity', 'unit', 'priority'],
            },
        },
        totalEstimatedCost: { type: 'number', nullable: true },
        urgencyLevel: { type: 'string', enum: ['immediate', 'urgent', 'normal', 'low'] },
        rationale: { type: 'string' },
    },
    required: ['resources', 'urgencyLevel', 'rationale'],
};

const PROMPT_TEMPLATE = `你是災害應變資源規劃專家。根據以下現場回報，分析並建議所需資源。

## 回報資訊
- 類型: {{type}}
- 嚴重程度: {{severity}}/5
- 回報人: {{reporterName}}
- 回報內容: {{message}}
- 位置: {{location}}
- 時間: {{occurredAt}}

## 任務
1. 分析災情需要的資源類型與數量
2. 評估緊急程度
3. 估算可能的成本 (如無法估算請用 null)

請根據 schema 輸出 JSON。`.trim();

/**
 * Resource Recommendation Use Case
 * Analyzes field reports and recommends required resources
 */
@Injectable()
export class ResourceRecommendUseCase extends BaseUseCase {
    readonly useCaseId = 'resource.recommend.v1';
    private readonly logger = new Logger(ResourceRecommendUseCase.name);

    constructor(
        private readonly gemini: GeminiProvider,
        @InjectRepository(FieldReport)
        private readonly reportRepo: Repository<FieldReport>,
    ) {
        super();
    }

    async execute(job: AiJob): Promise<ResourceRecommendOutput> {
        this.logger.log(`Executing resource recommendation for report ${job.entityId}`);

        const report = await this.reportRepo.findOne({
            where: { id: job.entityId },
        });

        if (!report) {
            throw new Error(`Report ${job.entityId} not found`);
        }

        const coords = this.extractCoordinates(report.geom);
        const locationStr = coords
            ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : '未知';

        const prompt = this.buildPrompt(PROMPT_TEMPLATE, {
            type: report.type,
            severity: report.severity,
            reporterName: report.reporterName,
            message: this.truncate(report.message || '', 500),
            location: locationStr,
            occurredAt: report.occurredAt?.toISOString() || '未知',
        });

        const result = await this.gemini.run({
            useCaseId: this.useCaseId,
            prompt,
            schema: OUTPUT_SCHEMA,
            maxOutputTokens: 1024,
        });

        const parsed = result.outputJson as any;

        return {
            resources: parsed.resources || [],
            totalEstimatedCost: parsed.totalEstimatedCost ?? null,
            urgencyLevel: parsed.urgencyLevel || 'normal',
            rationale: parsed.rationale || '',
            isFallback: false,
        };
    }

    async fallback(job: AiJob): Promise<ResourceRecommendOutput> {
        this.logger.warn(`Falling back for resource recommendation ${job.entityId}`);

        const report = await this.reportRepo.findOne({
            where: { id: job.entityId },
        });

        // Generate basic recommendations based on report type
        const baseResources: ResourceItem[] = [];

        if (report) {
            if (report.type === 'medical') {
                baseResources.push({
                    category: 'medical',
                    name: '急救人員',
                    quantity: 2,
                    unit: '人',
                    estimatedCost: null,
                    priority: 'critical',
                });
                baseResources.push({
                    category: 'medical',
                    name: '急救包',
                    quantity: 1,
                    unit: '組',
                    estimatedCost: null,
                    priority: 'high',
                });
            } else if (report.type === 'incident') {
                baseResources.push({
                    category: 'personnel',
                    name: '救災人員',
                    quantity: 4,
                    unit: '人',
                    estimatedCost: null,
                    priority: 'high',
                });
            }

            // Always recommend communication
            baseResources.push({
                category: 'communication',
                name: '無線電',
                quantity: 2,
                unit: '台',
                estimatedCost: null,
                priority: 'medium',
            });
        }

        const urgencyLevel = report && report.severity >= 4 ? 'urgent' :
            report && report.severity >= 3 ? 'normal' : 'low';

        return {
            resources: baseResources,
            totalEstimatedCost: null,
            urgencyLevel,
            rationale: 'AI 暫時無法提供詳細分析，此為基本預設建議',
            isFallback: true,
        };
    }

    /**
     * Extract lat/lng from PostGIS geometry (WKT or GeoJSON)
     */
    private extractCoordinates(geom: any): { lat: number; lng: number } | null {
        if (!geom) return null;

        // GeoJSON format
        if (geom.coordinates) {
            return { lng: geom.coordinates[0], lat: geom.coordinates[1] };
        }

        // WKT format: POINT(lng lat)
        if (typeof geom === 'string' && geom.startsWith('POINT')) {
            const match = geom.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i);
            if (match) {
                return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
            }
        }

        return null;
    }
}
