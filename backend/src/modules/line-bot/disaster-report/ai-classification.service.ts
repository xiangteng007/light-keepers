/**
 * AI 災情類型分類服務
 * 使用 Gemini API 自動判斷災情類型
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ReportType } from '../../reports/reports.entity';

export interface ClassificationResult {
    type: ReportType;
    confidence: number;
    reasoning?: string;
}

@Injectable()
export class AiClassificationService {
    private readonly logger = new Logger(AiClassificationService.name);
    private genAI: GoogleGenerativeAI | null = null;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.logger.log('Gemini AI initialized');
        } else {
            this.logger.warn('GEMINI_API_KEY not configured, AI classification disabled');
        }
    }

    /**
     * 使用 AI 判斷災情類型
     */
    async classifyDisasterType(description: string): Promise<ClassificationResult> {
        if (!this.genAI) {
            // Fallback to keyword-based detection
            return this.fallbackClassification(description);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const prompt = `
你是一個災害類型分類專家。請根據以下災情描述，判斷最可能的災害類型。

災情描述：
${description}

可選的災害類型：
- earthquake: 地震相關災害
- flood: 水災、淹水、溢流
- fire: 火災、爆炸
- typhoon: 颱風、強風
- landslide: 土石流、山崩、邊坡滑動
- traffic: 交通事故、車禍
- infrastructure: 基礎設施損壞（電線桿倒塌、路面坑洞、建築物損壞等）
- other: 其他無法明確分類的災害

請以 JSON 格式回覆，包含以下欄位：
{
  "type": "災害類型代碼",
  "confidence": 0.0-1.0 的信心分數,
  "reasoning": "簡短說明判斷理由"
}

只回覆 JSON，不要包含其他文字。
`.trim();

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();

            // 解析 JSON 回應
            const parsed = this.parseAIResponse(text);

            this.logger.log(`AI classification: ${parsed.type} (${parsed.confidence})`);
            return parsed;
        } catch (error) {
            this.logger.error(`AI classification failed: ${error.message}`);
            return this.fallbackClassification(description);
        }
    }

    /**
     * 解析 AI 回應
     */
    private parseAIResponse(text: string): ClassificationResult {
        try {
            // 移除可能的 markdown 代碼塊標記
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanText);

            // 驗證回應格式
            if (!parsed.type || typeof parsed.confidence !== 'number') {
                throw new Error('Invalid AI response format');
            }

            // 驗證類型是否合法
            const validTypes: ReportType[] = [
                'earthquake',
                'flood',
                'fire',
                'typhoon',
                'landslide',
                'traffic',
                'infrastructure',
                'other',
            ];

            if (!validTypes.includes(parsed.type)) {
                this.logger.warn(`Invalid type from AI: ${parsed.type}, defaulting to 'other'`);
                parsed.type = 'other';
            }

            return {
                type: parsed.type as ReportType,
                confidence: Math.min(1, Math.max(0, parsed.confidence)),
                reasoning: parsed.reasoning,
            };
        } catch (error) {
            this.logger.error(`Failed to parse AI response: ${error.message}`);
            throw error;
        }
    }

    /**
     * 關鍵字式 Fallback 分類
     */
    private fallbackClassification(description: string): ClassificationResult {
        const lowerDesc = description.toLowerCase();

        const patterns: Array<{ keywords: string[]; type: ReportType }> = [
            { keywords: ['地震', '震動', '搖晃'], type: 'earthquake' },
            { keywords: ['淹水', '積水', '水災', '溢流', '洪水'], type: 'flood' },
            { keywords: ['火災', '起火', '火燒', '爆炸', '燃燒'], type: 'fire' },
            { keywords: ['颱風', '強風', '風災'], type: 'typhoon' },
            { keywords: ['土石流', '山崩', '坍方', '落石', '邊坡'], type: 'landslide' },
            { keywords: ['車禍', '交通事故', '撞車', '追撞'], type: 'traffic' },
            {
                keywords: ['電線桿', '路面', '坑洞', '建築', '倒塌', '損壞', '破損', '裂縫'],
                type: 'infrastructure',
            },
        ];

        for (const pattern of patterns) {
            if (pattern.keywords.some((kw) => lowerDesc.includes(kw))) {
                return {
                    type: pattern.type,
                    confidence: 0.7,
                    reasoning: 'Keyword-based detection',
                };
            }
        }

        return {
            type: 'other',
            confidence: 0.5,
            reasoning: 'No specific keywords matched',
        };
    }

    /**
     * 批量分類（用於已存在的回報）
     */
    async batchClassify(descriptions: string[]): Promise<ClassificationResult[]> {
        const results: ClassificationResult[] = [];

        for (const desc of descriptions) {
            const result = await this.classifyDisasterType(desc);
            results.push(result);

            // 避免 API 速率限制
            await this.sleep(100);
        }

        return results;
    }

    /**
     * 輔助函數：延遲執行
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
