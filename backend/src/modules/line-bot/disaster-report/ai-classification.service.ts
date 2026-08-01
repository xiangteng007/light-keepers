/**
 * AI 災情類型分類服務
 *
 * M.2: 文字分類改走 LlmProviderService（LLM_PROVIDER=gemini/local/hybrid），
 * 不再直接 new GoogleGenerativeAI。影像分析（Vision）仍直接使用 Gemini，
 * 因為本地候選模型 Qwen2.5-Instruct 是純文字模型，沒有對應能力。
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ReportType } from '../../reports/reports.entity';
import {
    REPORT_TYPE_VALUES,
    detectCivilDefenseType,
    detectMassCasualty,
} from '../../reports/disaster-types';
import { LlmProviderService } from '../../ai-queue/providers/llm-provider.service';

export interface ClassificationResult {
    type: ReportType;
    confidence: number;
    reasoning?: string;
    /**
     * 大量傷患（MCI）跨災型旗標（CD-1）。與 type 正交，可與任一災型同時成立。
     * 舊呼叫端不讀這個欄位也不受影響。
     */
    massCasualty?: boolean;
}

/**
 * 災情分類的 prompt，抽出成常數供 llm-benchmark 腳本重用。
 *
 * CD-1：類型清單擴充四個民防類別。兩條容易搞混的界線在 prompt 裡以正反例
 * 明寫（見 docs/architecture/CIVIL_DEFENSE_TAXONOMY.md §2.2）：
 *   1. 瓦斯氣爆等民生／工業爆炸維持 fire（既有語意，不得變更）
 *   2. 情資不足時保守判 explosion 而非 terror_attack
 */
export function buildClassificationPrompt(description: string): string {
    return `
你是一個災害類型分類專家。請根據以下災情描述，判斷最可能的災害類型。

災情描述：
${description}

可選的災害類型：
- earthquake: 地震相關災害
- flood: 水災、淹水、溢流
- fire: 火災、燃燒、濃煙，以及民生／工業起因的氣爆（瓦斯外洩氣爆、鍋爐爆炸、火災伴生的爆炸）
- typhoon: 颱風、強風
- landslide: 土石流、山崩、邊坡滑動
- traffic: 交通事故、車禍
- infrastructure: 基礎設施損壞（電線桿倒塌、路面坑洞、建築物損壞、停電、管線破損等）
- air_raid: 空襲、砲擊、防空警報、飛彈、轟炸、無人機攻擊，或可歸因於空中攻擊的爆炸與彈著
- explosion: 爆裂物、可疑包裹、不明來源的爆炸、未爆彈藥
- terror_attack: 有組織攻擊意圖的事件（槍擊、持刀砍人、車輛衝撞人群、挾持人質、多點同時攻擊）
- cbrn: 化學／生物／放射／核事件（不明刺鼻氣體致多人不適、不明白色粉末、輻射警報、化學槽車洩漏）
- other: 其他無法明確分類的災害

判斷界線（很重要，請嚴格遵守）：
1. 「瓦斯氣爆」「瓦斯外洩爆炸」「鍋爐爆炸」等民生或工業起因的爆炸 → 一律歸 fire，**不是** explosion。
   explosion 只用於爆裂物、炸彈、不明來源的爆炸、未爆彈藥。
   例：「瓦斯氣爆，隔壁整面牆炸開」→ fire；「路邊垃圾桶突然爆炸，地上都是碎片」→ explosion。
2. 只有「爆炸了」而沒有攻擊意圖線索時 → explosion；出現持械攻擊人、宣稱訴求、多點同時攻擊、
   鎖定人群等有組織攻擊跡象時 → terror_attack。情資不足就保守選 explosion。
3. 有聽到防空警報／空襲警報／飛彈警報，或提到砲擊、轟炸、敵機、無人機攻擊 → air_raid，
   即使描述中同時出現「爆炸」「起火」也一樣。
4. 出現不明氣味、不明粉末、輻射、多人同時出現嗆咳流淚嘔吐等症狀 → cbrn（防護優先於分類精確）。

另外請獨立判斷「是否為大量傷患事件」（massCasualty）：現場傷患數量超出一般救護能量
（例如提到「很多人受傷」「一堆人倒在地上」「救護車不夠」或明確人數 5 人以上）則為 true，
否則為 false。這個判斷與災害類型無關，任何類型都可能是大量傷患事件。

請以 JSON 格式回覆，包含以下欄位：
{
  "type": "災害類型代碼",
  "confidence": 0.0-1.0 的信心分數,
  "massCasualty": true 或 false,
  "reasoning": "簡短說明判斷理由"
}

只回覆 JSON，不要包含其他文字。
`.trim();
}

@Injectable()
export class AiClassificationService {
    private readonly logger = new Logger(AiClassificationService.name);
    /** Vision-only client. Text classification goes through `llm`. */
    private genAI: GoogleGenerativeAI | null = null;

    constructor(
        private readonly configService: ConfigService,
        @Optional() private readonly llm?: LlmProviderService,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.logger.log('Gemini Vision client initialized');
        } else {
            this.logger.warn('GEMINI_API_KEY not configured, image analysis disabled');
        }

        if (!this.llm?.isAvailable()) {
            this.logger.warn('No LLM provider available, classification will use keywords only');
        }
    }

    /**
     * 使用 AI 判斷災情類型
     *
     * 走 LlmProviderService，因此 LLM_PROVIDER=hybrid 時工作站離線會自動降級到
     * Gemini；兩者都失敗才落到關鍵字比對。
     */
    async classifyDisasterType(description: string): Promise<ClassificationResult> {
        if (!this.llm?.isAvailable()) {
            // Fallback to keyword-based detection
            return this.fallbackClassification(description);
        }

        try {
            const response = await this.llm.generateText({
                useCaseId: 'linebot.disaster.classify.v1',
                prompt: buildClassificationPrompt(description),
                maxOutputTokens: 512,
                temperature: 0.2,
            });

            const parsed = this.parseAIResponse(response.text.trim());

            this.logger.log(
                `AI classification: ${parsed.type} (${parsed.confidence}) via ${response.modelName}`,
            );
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

            // 驗證類型是否合法（清單來自 disaster-types SSOT）
            if (!(REPORT_TYPE_VALUES as readonly string[]).includes(parsed.type)) {
                this.logger.warn(`Invalid type from AI: ${parsed.type}, defaulting to 'other'`);
                parsed.type = 'other';
            }

            return {
                type: parsed.type as ReportType,
                confidence: Math.min(1, Math.max(0, parsed.confidence)),
                reasoning: parsed.reasoning,
                // 舊模型／舊 prompt 不會回這個欄位，缺欄位一律視為 false
                massCasualty: parsed.massCasualty === true,
            };
        } catch (error) {
            this.logger.error(`Failed to parse AI response: ${error.message}`);
            throw error;
        }
    }

    /**
     * 關鍵字式 Fallback 分類（兩階段）。
     *
     * 階段 1（CD-1 新增）：民防**強訊號**關鍵字。這組詞彙與階段 2 的既有關鍵字
     * 完全無交集（刻意不含「爆炸」「倒塌」等既有詞），因此任何只含既有關鍵字
     * 的文本，比對結果與擴充前完全相同。
     * 階段 2：既有 7 組 patterns，順序、關鍵字、信心值一律未動。
     */
    private fallbackClassification(description: string): ClassificationResult {
        const lowerDesc = description.toLowerCase();
        const massCasualty = detectMassCasualty(description);

        // 階段 1：民防強訊號
        const civilDefenseType = detectCivilDefenseType(description);
        if (civilDefenseType) {
            return {
                type: civilDefenseType,
                confidence: 0.7,
                reasoning: 'Keyword-based detection',
                massCasualty,
            };
        }

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
                    massCasualty,
                };
            }
        }

        return {
            type: 'other',
            confidence: 0.5,
            reasoning: 'No specific keywords matched',
            massCasualty,
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
  "type": "災害類型 (earthquake/flood/fire/typhoon/landslide/traffic/infrastructure/air_raid/explosion/terror_attack/cbrn/other)",
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

            // 驗證類型（清單來自 disaster-types SSOT）
            if (!(REPORT_TYPE_VALUES as readonly string[]).includes(parsed.type)) {
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

