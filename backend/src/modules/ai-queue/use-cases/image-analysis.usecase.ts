/**
 * Image Analysis AI Use Case
 * Analyzes disaster images using Gemini Vision API
 * Extracts damage assessment, hazard identification, and required actions
 */

import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from '../providers/gemini.provider';

export interface ImageAnalysisInput {
    imageUrl?: string;
    imageBase64?: string;
    mimeType?: string;
    context?: string;
}

export interface ImageAnalysisResult {
    success: boolean;
    analysis?: {
        damageLevel: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
        hazards: string[];
        affectedAreas: string[];
        requiredActions: string[];
        estimatedPeopleAffected?: number;
        infrastructure: {
            buildings: 'intact' | 'damaged' | 'collapsed' | 'unknown';
            roads: 'passable' | 'partially_blocked' | 'blocked' | 'unknown';
            utilities: 'operational' | 'disrupted' | 'unknown';
        };
        safetyLevel: 'safe' | 'caution' | 'danger' | 'extreme_danger';
        description: string;
        recommendations: string[];
    };
    error?: string;
}

const OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        damageLevel: {
            type: 'string',
            enum: ['none', 'minor', 'moderate', 'severe', 'critical'],
            description: '災害損壞程度評估',
        },
        hazards: {
            type: 'array',
            items: { type: 'string' },
            description: '識別到的危險因素清單',
        },
        affectedAreas: {
            type: 'array',
            items: { type: 'string' },
            description: '受影響區域類型',
        },
        requiredActions: {
            type: 'array',
            items: { type: 'string' },
            description: '建議採取的行動',
        },
        estimatedPeopleAffected: {
            type: 'integer',
            description: '估計受影響人數',
        },
        infrastructure: {
            type: 'object',
            properties: {
                buildings: { type: 'string', enum: ['intact', 'damaged', 'collapsed', 'unknown'] },
                roads: { type: 'string', enum: ['passable', 'partially_blocked', 'blocked', 'unknown'] },
                utilities: { type: 'string', enum: ['operational', 'disrupted', 'unknown'] },
            },
        },
        safetyLevel: {
            type: 'string',
            enum: ['safe', 'caution', 'danger', 'extreme_danger'],
            description: '現場安全等級',
        },
        description: {
            type: 'string',
            description: '災情描述 (2-3 句話)',
        },
        recommendations: {
            type: 'array',
            items: { type: 'string' },
            description: '給指揮官的建議行動',
        },
    },
    required: ['damageLevel', 'hazards', 'safetyLevel', 'description', 'recommendations'],
};

const SYSTEM_PROMPT = `你是一位專業的災害評估專家。分析提供的災害現場圖片，並提供結構化的評估報告。

分析時請注意：
1. 損壞程度 (none/minor/moderate/severe/critical)
2. 可見的危險因素（如火災、倒塌風險、化學物質等）
3. 受影響的區域類型（住宅、商業、道路等）
4. 基礎設施狀態
5. 現場安全等級
6. 建議的緊急行動

請以繁體中文回覆，但 enum 值請使用英文。`;

@Injectable()
export class ImageAnalysisUseCase {
    public static readonly ID = 'image.analysis.v1';
    private readonly logger = new Logger(ImageAnalysisUseCase.name);

    constructor(private readonly gemini: GeminiProvider) { }

    /**
     * Analyze disaster image
     */
    async execute(input: ImageAnalysisInput): Promise<ImageAnalysisResult> {
        try {
            if (!input.imageUrl && !input.imageBase64) {
                return { success: false, error: '缺少圖片資料' };
            }

            // Build prompt with context
            let userPrompt = '請分析這張災害現場圖片，提供詳細的損害評估報告。';
            if (input.context) {
                userPrompt += `\n\n背景資訊: ${input.context}`;
            }

            // Call Gemini Vision
            const response = await this.gemini.generateWithImage({
                systemPrompt: SYSTEM_PROMPT,
                userPrompt,
                imageUrl: input.imageUrl,
                imageBase64: input.imageBase64,
                mimeType: input.mimeType || 'image/jpeg',
                outputSchema: OUTPUT_SCHEMA,
            });

            if (!response.success) {
                return { success: false, error: response.error || 'AI 分析失敗' };
            }

            return {
                success: true,
                analysis: response.data,
            };
        } catch (error) {
            this.logger.error('Image analysis failed', error);
            return {
                success: false,
                error: (error as Error).message || '圖片分析錯誤',
            };
        }
    }

    /**
     * Get use case metadata
     */
    static getMetadata() {
        return {
            id: ImageAnalysisUseCase.ID,
            name: '災害圖片分析',
            description: '使用 AI 視覺分析災害現場圖片，自動評估損壞程度和危險因素',
            inputType: 'ImageAnalysisInput',
            outputType: 'ImageAnalysisResult',
            estimatedDuration: '10-15 秒',
            costLevel: 'medium',
        };
    }
}
