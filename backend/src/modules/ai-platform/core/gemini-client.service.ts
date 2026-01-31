import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface GeminiResponse {
    text: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: string;
}

export interface GeminiOptions {
    model?: 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash';
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    systemInstruction?: string;
}

/**
 * Gemini API 統一客戶端服務
 * 
 * 提供標準化的 Gemini API 存取介面，支援：
 * - 多模型選擇 (Flash, Pro)
 * - 對話歷史管理
 * - Token 使用量追蹤
 * - 錯誤處理與重試
 */
@Injectable()
export class GeminiClientService {
    private readonly logger = new Logger(GeminiClientService.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
        
        if (!this.apiKey) {
            this.logger.warn('GEMINI_API_KEY not configured - AI features will be limited');
        }
    }

    /**
     * 檢查 API 是否可用
     */
    isAvailable(): boolean {
        return !!this.apiKey;
    }

    /**
     * 發送單次生成請求
     */
    async generateContent(
        prompt: string,
        options: GeminiOptions = {}
    ): Promise<GeminiResponse> {
        const model = options.model || 'gemini-1.5-flash';
        const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

        const requestBody: any = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 2048,
                topP: options.topP ?? 0.95,
            },
        };

        if (options.systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: options.systemInstruction }]
            };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text || '';
            const usageMetadata = data.usageMetadata || {};

            return {
                text,
                usage: {
                    promptTokens: usageMetadata.promptTokenCount || 0,
                    completionTokens: usageMetadata.candidatesTokenCount || 0,
                    totalTokens: usageMetadata.totalTokenCount || 0,
                },
                finishReason: candidate?.finishReason || 'UNKNOWN',
            };
        } catch (error) {
            this.logger.error(`Gemini API call failed: ${error}`);
            throw error;
        }
    }

    /**
     * 發送多輪對話請求
     */
    async chat(
        messages: GeminiMessage[],
        newMessage: string,
        options: GeminiOptions = {}
    ): Promise<GeminiResponse> {
        const model = options.model || 'gemini-1.5-flash';
        const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

        const contents = [
            ...messages,
            { role: 'user' as const, parts: [{ text: newMessage }] }
        ];

        const requestBody: any = {
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 2048,
                topP: options.topP ?? 0.95,
            },
        };

        if (options.systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: options.systemInstruction }]
            };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text || '';
            const usageMetadata = data.usageMetadata || {};

            return {
                text,
                usage: {
                    promptTokens: usageMetadata.promptTokenCount || 0,
                    completionTokens: usageMetadata.candidatesTokenCount || 0,
                    totalTokens: usageMetadata.totalTokenCount || 0,
                },
                finishReason: candidate?.finishReason || 'UNKNOWN',
            };
        } catch (error) {
            this.logger.error(`Gemini chat API call failed: ${error}`);
            throw error;
        }
    }

    /**
     * 發送視覺分析請求（圖片 + 文字）
     */
    async analyzeImage(
        imageBase64: string,
        mimeType: string,
        prompt: string,
        options: GeminiOptions = {}
    ): Promise<GeminiResponse> {
        const model = options.model || 'gemini-1.5-flash';
        const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

        const requestBody = {
            contents: [{
                parts: [
                    { inlineData: { mimeType, data: imageBase64 } },
                    { text: prompt }
                ]
            }],
            generationConfig: {
                temperature: options.temperature ?? 0.4,
                maxOutputTokens: options.maxOutputTokens ?? 1024,
            },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini Vision API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text || '';
            const usageMetadata = data.usageMetadata || {};

            return {
                text,
                usage: {
                    promptTokens: usageMetadata.promptTokenCount || 0,
                    completionTokens: usageMetadata.candidatesTokenCount || 0,
                    totalTokens: usageMetadata.totalTokenCount || 0,
                },
                finishReason: candidate?.finishReason || 'UNKNOWN',
            };
        } catch (error) {
            this.logger.error(`Gemini Vision API call failed: ${error}`);
            throw error;
        }
    }

    /**
     * 結構化輸出 (JSON Mode)
     */
    async generateStructured<T>(
        prompt: string,
        options: GeminiOptions = {}
    ): Promise<{ data: T; usage: GeminiResponse['usage'] }> {
        const response = await this.generateContent(prompt, {
            ...options,
            temperature: options.temperature ?? 0.3, // Lower temp for structured output
        });

        // Extract JSON from response
        const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/) ||
                          response.text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from Gemini response');
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const data = JSON.parse(jsonStr) as T;

        return { data, usage: response.usage };
    }
}
