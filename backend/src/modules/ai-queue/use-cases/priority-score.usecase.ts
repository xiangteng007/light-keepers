import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseUseCase } from './base.usecase';
import { AiJob } from '../entities';
import { GeminiProvider } from '../providers/gemini.provider';
import { FieldReport } from '../../field-reports/entities';

/**
 * Priority score output structure
 */
export interface PriorityScoreOutput {
    score: number; // 1-100
    rank: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
    factors: PriorityFactor[];
    reasoning: string;
    suggestedActions: string[];
    isFallback: boolean;
}

export interface PriorityFactor {
    name: string;
    weight: number; // 1-5
    description: string;
}

const OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        score: { type: 'number', minimum: 1, maximum: 100 },
        rank: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'minimal'] },
        factors: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    weight: { type: 'number', minimum: 1, maximum: 5 },
                    description: { type: 'string' },
                },
                required: ['name', 'weight', 'description'],
            },
        },
        reasoning: { type: 'string' },
        suggestedActions: { type: 'array', items: { type: 'string' } },
    },
    required: ['score', 'rank', 'factors', 'reasoning', 'suggestedActions'],
};

const PROMPT_TEMPLATE = `你是災害應變優先級評估專家。根據以下現場回報，評估處理優先級。

## 回報資訊
- 類型: {{type}}
- 目前嚴重程度: {{severity}}/5
- 回報人: {{reporterName}}
- 回報內容: {{message}}
- 位置: {{location}}
- 發生時間: {{occurredAt}}
- 目前狀態: {{status}}

## 評估維度
1. 生命安全威脅程度
2. 擴散惡化可能性
3. 影響範圍與人數
4. 時間緊迫性
5. 資源可用性考量

請根據 schema 輸出 JSON。`.trim();

/**
 * Priority Score Use Case
 * Calculates priority score for field reports
 */
@Injectable()
export class PriorityScoreUseCase extends BaseUseCase {
    readonly useCaseId = 'priority.score.v1';
    private readonly logger = new Logger(PriorityScoreUseCase.name);

    constructor(
        private readonly gemini: GeminiProvider,
        @InjectRepository(FieldReport)
        private readonly reportRepo: Repository<FieldReport>,
    ) {
        super();
    }

    async execute(job: AiJob): Promise<PriorityScoreOutput> {
        this.logger.log(`Executing priority scoring for report ${job.entityId}`);

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
            status: report.status,
        });

        const result = await this.gemini.run({
            useCaseId: this.useCaseId,
            prompt,
            schema: OUTPUT_SCHEMA,
            maxOutputTokens: 1024,
        });

        const parsed = result.outputJson as any;

        return {
            score: Math.min(100, Math.max(1, parsed.score || 50)),
            rank: parsed.rank || 'medium',
            factors: parsed.factors || [],
            reasoning: parsed.reasoning || '',
            suggestedActions: parsed.suggestedActions || [],
            isFallback: false,
        };
    }

    async fallback(job: AiJob): Promise<PriorityScoreOutput> {
        this.logger.warn(`Falling back for priority scoring ${job.entityId}`);

        const report = await this.reportRepo.findOne({
            where: { id: job.entityId },
        });

        // Calculate basic score from severity
        const baseScore = report ? report.severity * 20 : 50;
        let rank: PriorityScoreOutput['rank'] = 'medium';

        if (baseScore >= 80) rank = 'critical';
        else if (baseScore >= 60) rank = 'high';
        else if (baseScore >= 40) rank = 'medium';
        else if (baseScore >= 20) rank = 'low';
        else rank = 'minimal';

        const factors: PriorityFactor[] = [
            {
                name: '回報嚴重程度',
                weight: report?.severity || 3,
                description: `根據回報的嚴重程度 (${report?.severity || 3}/5) 評估`,
            },
        ];

        // Add type-based factor
        if (report?.type === 'medical' || report?.type === 'sos') {
            factors.push({
                name: '生命安全相關',
                weight: 5,
                description: '此回報類型涉及生命安全，需優先處理',
            });
        }

        const suggestedActions: string[] = [];
        if (rank === 'critical' || rank === 'high') {
            suggestedActions.push('立即指派人員前往現場');
            suggestedActions.push('通知相關單位備援');
        } else {
            suggestedActions.push('安排適當時間處理');
        }

        return {
            score: baseScore,
            rank,
            factors,
            reasoning: 'AI 暫時無法提供詳細分析，此為基於嚴重程度的基本評估',
            suggestedActions,
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
