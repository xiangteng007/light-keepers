import { Injectable, Logger } from '@nestjs/common';
import { GeminiClientService } from '../core/gemini-client.service';

export interface TranscriptionResult {
    text: string;
    language: string;
    confidence: number;
    segments?: Array<{ start: number; end: number; text: string }>;
}

export interface VoiceCommandResult {
    intent: string;
    entities: Record<string, string>;
    confidence: number;
    rawText: string;
}

/**
 * Speech Capability - 語音處理能力
 * 
 * 提供：
 * - 語音轉文字
 * - 語音指令解析
 * - 多語言支援
 */
@Injectable()
export class SpeechCapability {
    private readonly logger = new Logger(SpeechCapability.name);

    constructor(private readonly geminiClient: GeminiClientService) {}

    /**
     * 解析語音指令意圖
     */
    async parseVoiceCommand(
        transcription: string,
        context?: { location?: string; missionId?: string }
    ): Promise<VoiceCommandResult> {
        const prompt = `
你是災難應變語音助理。解析以下語音指令：

語音內容: "${transcription}"
${context ? `上下文: ${JSON.stringify(context)}` : ''}

可能的意圖:
- report_incident: 回報災情
- request_backup: 請求支援
- update_status: 更新狀態
- query_resource: 查詢資源
- send_alert: 發送警報
- navigate_to: 導航請求
- check_in: 平安回報
- emergency_sos: 緊急求救

請以 JSON 格式回覆：
{
  "intent": "<意圖>",
  "entities": {
    "location": "<地點>",
    "severity": "<嚴重程度>",
    "resource": "<資源類型>",
    "quantity": "<數量>"
  },
  "confidence": <0.0-1.0>,
  "rawText": "<原始文字>"
}
`;

        try {
            const response = await this.geminiClient.generateContent(prompt, {
                temperature: 0.3,
            });

            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                intent: 'unknown',
                entities: {},
                confidence: 0.3,
                rawText: transcription,
            };
        } catch (error) {
            this.logger.error(`Voice command parsing failed: ${error}`);
            throw error;
        }
    }

    /**
     * 生成語音回覆文字
     */
    async generateVoiceResponse(
        intent: string,
        result: any,
        language: string = 'zh-TW'
    ): Promise<string> {
        const prompt = `
為災難應變語音助理生成自然的語音回覆。

意圖: ${intent}
執行結果: ${JSON.stringify(result)}
語言: ${language}

要求:
- 簡潔明確
- 適合語音播報
- 包含關鍵資訊
- 確認執行狀態

直接回覆語音文字，不需格式化。
`;

        try {
            const response = await this.geminiClient.generateContent(prompt, {
                temperature: 0.5,
                maxOutputTokens: 256,
            });

            return response.text.trim();
        } catch (error) {
            this.logger.error(`Voice response generation failed: ${error}`);
            return '抱歉，處理您的請求時發生錯誤。';
        }
    }

    /**
     * 翻譯語音內容
     */
    async translateSpeech(
        text: string,
        fromLanguage: string,
        toLanguage: string
    ): Promise<{ translated: string; confidence: number }> {
        const prompt = `
翻譯以下文字：

原文 (${fromLanguage}): ${text}
目標語言: ${toLanguage}

僅回覆翻譯結果，不需其他說明。
`;

        try {
            const response = await this.geminiClient.generateContent(prompt, {
                temperature: 0.3,
            });

            return {
                translated: response.text.trim(),
                confidence: 0.85,
            };
        } catch (error) {
            this.logger.error(`Translation failed: ${error}`);
            throw error;
        }
    }
}
