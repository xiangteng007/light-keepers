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

    // =========================================
    // Vision API Methods (Gemini 2.0 Flash Vision)
    // =========================================

    /**
     * 圖片災情分析結果
     */
    public static readonly VisionAnalysisResult = class {
        type: ReportType;
        confidence: number;
        reasoning: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        floodLevel?: number; // 水位 (公分)
        damageAssessment?: {
            structuralDamage: boolean;
            infrastructureDamage: boolean;
            vehicleDamage: boolean;
            estimatedAffectedArea?: string;
        };
        suggestedActions?: string[];
        detectedObjects?: string[];
    };

    /**
     * 使用 Vision API 分析災情圖片
     */
    async analyzeDisasterImage(
        imageBase64: string,
        mimeType: string = 'image/jpeg',
        additionalContext?: string,
    ): Promise<{
        type: ReportType;
        confidence: number;
        reasoning: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        floodLevel?: number;
        damageAssessment?: {
            structuralDamage: boolean;
            infrastructureDamage: boolean;
            vehicleDamage: boolean;
            estimatedAffectedArea?: string;
        };
        suggestedActions?: string[];
        detectedObjects?: string[];
    }> {
        if (!this.genAI) {
            this.logger.warn('Gemini not configured, using fallback');
            return {
                type: 'other',
                confidence: 0.3,
                reasoning: 'AI not available',
                severity: 'medium',
            };
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const prompt = `
你是一個專業的災害評估專家。請仔細分析這張圖片，判斷災害類型、嚴重程度，並提供專業評估。

${additionalContext ? `額外資訊：${additionalContext}` : ''}

請以 JSON 格式回覆，包含以下欄位：
{
  "type": "災害類型 (earthquake/flood/fire/typhoon/landslide/traffic/infrastructure/other)",
  "confidence": 0.0-1.0 的信心分數,
  "reasoning": "分析理由說明",
  "severity": "嚴重程度 (low/medium/high/critical)",
  "floodLevel": 若為水災，估算水位高度(公分)，否則為 null,
  "damageAssessment": {
    "structuralDamage": 是否有建築結構損壞 (true/false),
    "infrastructureDamage": 是否有基礎設施損壞 (true/false),
    "vehicleDamage": 是否有車輛損壞 (true/false),
    "estimatedAffectedArea": "估算影響範圍描述"
  },
  "suggestedActions": ["建議處置行動1", "建議處置行動2"],
  "detectedObjects": ["辨識到的物件1", "辨識到的物件2"]
}

只回覆 JSON，不要包含其他文字。
`.trim();

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType,
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = result.response;
            const text = response.text().trim();

            // 解析 JSON 回應
            const parsed = this.parseVisionResponse(text);

            this.logger.log(`Vision analysis: ${parsed.type} (${parsed.confidence}), severity: ${parsed.severity}`);
            return parsed;
        } catch (error) {
            this.logger.error(`Vision analysis failed: ${error.message}`);
            return {
                type: 'other',
                confidence: 0.3,
                reasoning: `Analysis failed: ${error.message}`,
                severity: 'medium',
            };
        }
    }

    /**
     * 專門分析水位（Flood Level Detection）
     */
    async analyzeFloodLevel(
        imageBase64: string,
        mimeType: string = 'image/jpeg',
        referenceHeight?: number, // 參考物高度 (公分)
    ): Promise<{
        floodLevel: number;
        confidence: number;
        referenceUsed: string;
        riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
        description: string;
    }> {
        if (!this.genAI) {
            return {
                floodLevel: 0,
                confidence: 0.3,
                referenceUsed: 'none',
                riskLevel: 'warning',
                description: 'AI not available',
            };
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const prompt = `
你是一個水災評估專家。請分析這張圖片中的水位高度。

${referenceHeight ? `參考物高度：${referenceHeight} 公分` : '請使用常見物品（如汽車輪胎直徑約 60cm、成人膝蓋高度約 45cm、小腿高度約 35cm）作為參考。'}

請以 JSON 格式回覆：
{
  "floodLevel": 估算水位高度(公分),
  "confidence": 0.0-1.0 的信心分數,
  "referenceUsed": "用於估算的參考物",
  "riskLevel": "風險等級 (safe: <10cm / warning: 10-30cm / danger: 30-50cm / critical: >50cm)",
  "description": "水位狀況描述"
}

只回覆 JSON。
`.trim();

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType,
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const text = result.response.text().trim();
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanText);

            this.logger.log(`Flood level analysis: ${parsed.floodLevel}cm, risk: ${parsed.riskLevel}`);
            return {
                floodLevel: parsed.floodLevel || 0,
                confidence: parsed.confidence || 0.5,
                referenceUsed: parsed.referenceUsed || 'unknown',
                riskLevel: parsed.riskLevel || 'warning',
                description: parsed.description || '',
            };
        } catch (error) {
            this.logger.error(`Flood level analysis failed: ${error.message}`);
            return {
                floodLevel: 0,
                confidence: 0.3,
                referenceUsed: 'none',
                riskLevel: 'warning',
                description: `Analysis failed: ${error.message}`,
            };
        }
    }

    /**
     * 損壞程度評估（Damage Assessment）
     */
    async assessDamage(
        imageBase64: string,
        mimeType: string = 'image/jpeg',
        damageType?: 'building' | 'road' | 'vehicle' | 'general',
    ): Promise<{
        overallDamageLevel: 'none' | 'minor' | 'moderate' | 'severe' | 'total';
        damagePercentage: number;
        confidence: number;
        affectedComponents: string[];
        repairPriority: 'low' | 'medium' | 'high' | 'urgent';
        estimatedRepairTime: string;
        safetyStatus: 'safe' | 'caution' | 'dangerous' | 'evacuate';
        description: string;
    }> {
        if (!this.genAI) {
            return {
                overallDamageLevel: 'moderate',
                damagePercentage: 50,
                confidence: 0.3,
                affectedComponents: [],
                repairPriority: 'medium',
                estimatedRepairTime: 'unknown',
                safetyStatus: 'caution',
                description: 'AI not available',
            };
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const typeContext = damageType
                ? `這是一個${damageType === 'building' ? '建築物' : damageType === 'road' ? '道路' : damageType === 'vehicle' ? '車輛' : '一般'}損壞評估。`
                : '';

            const prompt = `
你是一個專業的損壞評估專家。請仔細分析這張圖片中的損壞情況。
${typeContext}

請以 JSON 格式回覆：
{
  "overallDamageLevel": "損壞程度 (none/minor/moderate/severe/total)",
  "damagePercentage": 0-100 的損壞百分比,
  "confidence": 0.0-1.0 的信心分數,
  "affectedComponents": ["受損部件1", "受損部件2"],
  "repairPriority": "修復優先級 (low/medium/high/urgent)",
  "estimatedRepairTime": "預估修復時間",
  "safetyStatus": "安全狀態 (safe/caution/dangerous/evacuate)",
  "description": "詳細損壞描述"
}

只回覆 JSON。
`.trim();

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType,
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const text = result.response.text().trim();
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanText);

            this.logger.log(`Damage assessment: ${parsed.overallDamageLevel} (${parsed.damagePercentage}%)`);
            return {
                overallDamageLevel: parsed.overallDamageLevel || 'moderate',
                damagePercentage: parsed.damagePercentage || 50,
                confidence: parsed.confidence || 0.5,
                affectedComponents: parsed.affectedComponents || [],
                repairPriority: parsed.repairPriority || 'medium',
                estimatedRepairTime: parsed.estimatedRepairTime || 'unknown',
                safetyStatus: parsed.safetyStatus || 'caution',
                description: parsed.description || '',
            };
        } catch (error) {
            this.logger.error(`Damage assessment failed: ${error.message}`);
            return {
                overallDamageLevel: 'moderate',
                damagePercentage: 50,
                confidence: 0.3,
                affectedComponents: [],
                repairPriority: 'medium',
                estimatedRepairTime: 'unknown',
                safetyStatus: 'caution',
                description: `Assessment failed: ${error.message}`,
            };
        }
    }

    /**
     * 解析 Vision API 回應
     */
    private parseVisionResponse(text: string): {
        type: ReportType;
        confidence: number;
        reasoning: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        floodLevel?: number;
        damageAssessment?: {
            structuralDamage: boolean;
            infrastructureDamage: boolean;
            vehicleDamage: boolean;
            estimatedAffectedArea?: string;
        };
        suggestedActions?: string[];
        detectedObjects?: string[];
    } {
        try {
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanText);

            // 驗證類型
            const validTypes: ReportType[] = [
                'earthquake', 'flood', 'fire', 'typhoon',
                'landslide', 'traffic', 'infrastructure', 'other',
            ];
            if (!validTypes.includes(parsed.type)) {
                parsed.type = 'other';
            }

            // 驗證嚴重程度
            const validSeverity = ['low', 'medium', 'high', 'critical'];
            if (!validSeverity.includes(parsed.severity)) {
                parsed.severity = 'medium';
            }

            return {
                type: parsed.type as ReportType,
                confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
                reasoning: parsed.reasoning || '',
                severity: parsed.severity,
                floodLevel: parsed.floodLevel,
                damageAssessment: parsed.damageAssessment,
                suggestedActions: parsed.suggestedActions,
                detectedObjects: parsed.detectedObjects,
            };
        } catch (error) {
            this.logger.error(`Failed to parse Vision response: ${error.message}`);
            return {
                type: 'other',
                confidence: 0.3,
                reasoning: 'Failed to parse AI response',
                severity: 'medium',
            };
        }
    }
}

