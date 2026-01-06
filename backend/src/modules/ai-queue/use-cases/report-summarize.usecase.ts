import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseUseCase } from './base.usecase';
import { AiJob } from '../entities';
import { GeminiProvider } from '../providers/gemini.provider';
import { FieldReport } from '../../field-reports/entities';

/**
 * Output schema for report summarization
 */
export interface ReportSummaryOutput {
    summary: string;
    suggestedCategory: string;
    suggestedSeverity: 0 | 1 | 2 | 3 | 4;
    identifiedNeeds: string[];
    questionsToAsk: string[];
    confidence: number;
}

const SUMMARY_SCHEMA = {
    type: 'object',
    properties: {
        summary: { type: 'string', maxLength: 200 },
        suggestedCategory: {
            type: 'string',
            enum: ['fire', 'flood', 'earthquake', 'medical', 'traffic', 'infrastructure', 'other'],
        },
        suggestedSeverity: { type: 'integer', minimum: 0, maximum: 4 },
        identifiedNeeds: { type: 'array', items: { type: 'string' } },
        questionsToAsk: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'integer', minimum: 0, maximum: 100 },
    },
    required: ['summary', 'suggestedCategory', 'suggestedSeverity', 'confidence'],
};

const SUMMARY_PROMPT = `
You are analyzing an emergency field report from a disaster response team in Taiwan.
Extract key information and provide a structured summary.

Report Details:
- Type: {{type}}
- Category: {{category}}
- Severity: {{severity}} (0=info, 1=minor, 2=moderate, 3=major, 4=critical)
- Message: {{message}}
- Location: {{location}}
- Reported at: {{occurredAt}}

Your task:
1. Write a brief 1-2 sentence summary in Traditional Chinese (繁體中文)
2. Suggest the most appropriate category
3. Suggest severity level based on the content
4. Identify any specific needs mentioned (resources, personnel, equipment)
5. List 1-2 clarifying questions that would help responders
6. Rate your confidence (0-100) in the analysis

Output valid JSON matching the schema.
`.trim();

@Injectable()
export class ReportSummarizeUseCase extends BaseUseCase {
    readonly useCaseId = 'report.summarize.v1';

    constructor(
        private gemini: GeminiProvider,
        @InjectRepository(FieldReport)
        private reportRepo: Repository<FieldReport>,
    ) {
        super();
    }

    async execute(job: AiJob): Promise<ReportSummaryOutput> {
        const report = await this.reportRepo.findOne({ where: { id: job.entityId } });
        if (!report) {
            throw new Error(`Report ${job.entityId} not found`);
        }

        // Extract coordinates from PostGIS geometry
        const coords = this.extractCoordinates(report.geom);

        const prompt = this.buildPrompt(SUMMARY_PROMPT, {
            type: report.type,
            category: report.category,
            severity: report.severity,
            message: this.truncate(report.message, 1000),
            location: coords ? `${coords.lat}, ${coords.lng}` : 'Unknown',
            occurredAt: report.occurredAt?.toISOString() || report.createdAt.toISOString(),
        });

        const result = await this.gemini.run({
            useCaseId: this.useCaseId,
            prompt,
            schema: SUMMARY_SCHEMA,
            maxOutputTokens: 512,
        });

        return result.outputJson as ReportSummaryOutput;
    }

    async fallback(job: AiJob): Promise<ReportSummaryOutput> {
        const report = await this.reportRepo.findOne({ where: { id: job.entityId } });
        if (!report) {
            return this.getEmptyFallback();
        }

        return {
            summary: this.truncate(report.message || '無描述', 200),
            suggestedCategory: this.guessCategory(report.message || ''),
            suggestedSeverity: (report.severity ?? 1) as 0 | 1 | 2 | 3 | 4,
            identifiedNeeds: [],
            questionsToAsk: [],
            confidence: 30,
        };
    }

    private getEmptyFallback(): ReportSummaryOutput {
        return {
            summary: '報告摘要無法生成',
            suggestedCategory: 'other',
            suggestedSeverity: 1,
            identifiedNeeds: [],
            questionsToAsk: [],
            confidence: 0,
        };
    }

    private guessCategory(message: string): string {
        const lower = message.toLowerCase();
        if (lower.includes('火') || lower.includes('fire') || lower.includes('煙')) return 'fire';
        if (lower.includes('水') || lower.includes('flood') || lower.includes('淹')) return 'flood';
        if (lower.includes('震') || lower.includes('earthquake')) return 'earthquake';
        if (lower.includes('傷') || lower.includes('病') || lower.includes('medical')) return 'medical';
        if (lower.includes('車') || lower.includes('accident') || lower.includes('traffic')) return 'traffic';
        if (lower.includes('路') || lower.includes('橋') || lower.includes('電')) return 'infrastructure';
        return 'other';
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
