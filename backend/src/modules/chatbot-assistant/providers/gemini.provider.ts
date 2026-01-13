/**
 * Gemini AI Provider
 * 
 * Integration with Google Gemini Pro API for AI-powered features
 * v1.0
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface GeminiResponse {
    text: string;
    finishReason: string;
    tokenCount?: number;
}

export interface GeminiConfig {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
}

const DEFAULT_CONFIG: GeminiConfig = {
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxOutputTokens: 2048,
    topK: 40,
    topP: 0.95,
};

@Injectable()
export class GeminiProvider implements OnModuleInit {
    private readonly logger = new Logger(GeminiProvider.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    private isAvailable = false;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    }

    onModuleInit() {
        if (!this.apiKey) {
            this.logger.warn('GEMINI_API_KEY not configured, AI features will use mock responses');
        } else {
            this.isAvailable = true;
            this.logger.log('Gemini AI Provider initialized');
        }
    }

    /**
     * Check if Gemini is available
     */
    isConfigured(): boolean {
        return this.isAvailable;
    }

    /**
     * Generate content from a prompt
     */
    async generateContent(
        prompt: string,
        config: Partial<GeminiConfig> = {},
    ): Promise<GeminiResponse> {
        if (!this.isAvailable) {
            return this.getMockResponse(prompt);
        }

        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        const model = finalConfig.model;

        try {
            const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: finalConfig.temperature,
                        maxOutputTokens: finalConfig.maxOutputTokens,
                        topK: finalConfig.topK,
                        topP: finalConfig.topP,
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];

            return {
                text: candidate?.content?.parts?.[0]?.text || '',
                finishReason: candidate?.finishReason || 'UNKNOWN',
                tokenCount: data.usageMetadata?.totalTokenCount,
            };
        } catch (error: any) {
            this.logger.error(`Gemini generate error: ${error.message}`);
            return this.getMockResponse(prompt);
        }
    }

    /**
     * Chat conversation with history
     */
    async chat(
        messages: ChatMessage[],
        config: Partial<GeminiConfig> = {},
    ): Promise<GeminiResponse> {
        if (!this.isAvailable) {
            const lastMessage = messages[messages.length - 1];
            return this.getMockResponse(lastMessage?.content || '');
        }

        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        const model = finalConfig.model;

        try {
            const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

            const contents = messages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }));

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: finalConfig.temperature,
                        maxOutputTokens: finalConfig.maxOutputTokens,
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];

            return {
                text: candidate?.content?.parts?.[0]?.text || '',
                finishReason: candidate?.finishReason || 'UNKNOWN',
                tokenCount: data.usageMetadata?.totalTokenCount,
            };
        } catch (error: any) {
            this.logger.error(`Gemini chat error: ${error.message}`);
            const lastMessage = messages[messages.length - 1];
            return this.getMockResponse(lastMessage?.content || '');
        }
    }

    /**
     * Analyze text for disaster-related content
     */
    async analyzeDisasterText(text: string): Promise<{
        isDisasterRelated: boolean;
        disasterType?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        location?: string;
        summary?: string;
        suggestedActions?: string[];
    }> {
        const prompt = `分析以下文字是否與災害相關，並提供結構化分析：

文字內容：
${text}

請以 JSON 格式回答，包含以下欄位：
- isDisasterRelated: boolean
- disasterType: 災害類型 (如有)
- severity: "low" | "medium" | "high" | "critical" (如有)
- location: 地點 (如有)
- summary: 簡短摘要
- suggestedActions: 建議行動 (陣列)

只回傳 JSON，不要其他文字。`;

        const response = await this.generateContent(prompt, { temperature: 0.3 });

        try {
            // Extract JSON from response
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            this.logger.warn('Failed to parse disaster analysis response');
        }

        return {
            isDisasterRelated: false,
            summary: response.text.substring(0, 200),
        };
    }

    /**
     * Generate task dispatch recommendations
     */
    async generateDispatchRecommendation(context: {
        taskDescription: string;
        availableVolunteers: { id: string; name: string; skills: string[]; location: string }[];
        taskLocation: string;
        urgency: string;
    }): Promise<{
        recommendedVolunteers: { id: string; reason: string }[];
        estimatedTime: string;
        notes: string;
    }> {
        const prompt = `作為災害應變派遣助手，請分析以下任務並推薦適合的志工：

任務描述：${context.taskDescription}
任務地點：${context.taskLocation}
緊急程度：${context.urgency}

可用志工：
${context.availableVolunteers.map(v => `- ${v.name} (技能: ${v.skills.join(', ')}, 位置: ${v.location})`).join('\n')}

請以 JSON 格式回答：
{
  "recommendedVolunteers": [{ "id": "志工ID", "reason": "推薦原因" }],
  "estimatedTime": "預估所需時間",
  "notes": "其他建議"
}

只回傳 JSON。`;

        const response = await this.generateContent(prompt, { temperature: 0.4 });

        try {
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            this.logger.warn('Failed to parse dispatch recommendation');
        }

        // Fallback
        return {
            recommendedVolunteers: context.availableVolunteers.slice(0, 2).map(v => ({
                id: v.id,
                reason: '技能匹配',
            })),
            estimatedTime: '2-3 小時',
            notes: '建議儘快派遣',
        };
    }

    /**
     * Generate resource demand forecast
     */
    async generateResourceForecast(context: {
        disasterType: string;
        affectedPopulation: number;
        duration: string;
        currentResources: { name: string; quantity: number }[];
    }): Promise<{
        predictions: { resource: string; neededQuantity: number; priority: string }[];
        reasoning: string;
    }> {
        const prompt = `作為災害物資預測助手，請根據以下資訊預測物資需求：

災害類型：${context.disasterType}
受影響人數：${context.affectedPopulation}
預估持續時間：${context.duration}

目前物資：
${context.currentResources.map(r => `- ${r.name}: ${r.quantity}`).join('\n')}

請以 JSON 格式預測物資需求：
{
  "predictions": [
    { "resource": "物資名稱", "neededQuantity": 數量, "priority": "high/medium/low" }
  ],
  "reasoning": "預測依據說明"
}

只回傳 JSON。`;

        const response = await this.generateContent(prompt, { temperature: 0.4 });

        try {
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            this.logger.warn('Failed to parse resource forecast');
        }

        // Fallback
        return {
            predictions: [
                { resource: '飲用水', neededQuantity: context.affectedPopulation * 3, priority: 'high' },
                { resource: '食物', neededQuantity: context.affectedPopulation * 2, priority: 'high' },
                { resource: '毛毯', neededQuantity: Math.ceil(context.affectedPopulation * 0.5), priority: 'medium' },
            ],
            reasoning: '根據受災人數及災害類型之標準配給量估算',
        };
    }

    /**
     * Summarize incident report
     */
    async summarizeIncident(report: string): Promise<string> {
        const prompt = `請將以下災害報告摘要成 3-5 句重點：

${report}

摘要：`;

        const response = await this.generateContent(prompt, {
            temperature: 0.3,
            maxOutputTokens: 512,
        });

        return response.text;
    }

    // ===== Mock Response =====

    private getMockResponse(prompt: string): GeminiResponse {
        const lowerPrompt = prompt.toLowerCase();

        if (lowerPrompt.includes('災害') || lowerPrompt.includes('disaster')) {
            return {
                text: '根據分析，這可能是一起需要關注的災情事件。建議立即進行初步評估，並考慮派遣現場勘查人員。請確保相關資源和人員待命。',
                finishReason: 'MOCK',
            };
        }

        if (lowerPrompt.includes('派遣') || lowerPrompt.includes('dispatch')) {
            return {
                text: JSON.stringify({
                    recommendedVolunteers: [
                        { id: 'vol-1', reason: '距離最近且技能匹配' },
                        { id: 'vol-2', reason: '有相關經驗' },
                    ],
                    estimatedTime: '1-2 小時',
                    notes: '建議攜帶基本急救設備',
                }),
                finishReason: 'MOCK',
            };
        }

        if (lowerPrompt.includes('物資') || lowerPrompt.includes('resource')) {
            return {
                text: JSON.stringify({
                    predictions: [
                        { resource: '飲用水', neededQuantity: 500, priority: 'high' },
                        { resource: '乾糧', neededQuantity: 300, priority: 'high' },
                        { resource: '帳篷', neededQuantity: 50, priority: 'medium' },
                    ],
                    reasoning: '根據受災規模及歷史資料估算',
                }),
                finishReason: 'MOCK',
            };
        }

        return {
            text: '我是 Light Keepers AI 助手。目前處於模擬模式。如需啟用完整 AI 功能，請設定 GEMINI_API_KEY 環境變數。',
            finishReason: 'MOCK',
        };
    }
}
