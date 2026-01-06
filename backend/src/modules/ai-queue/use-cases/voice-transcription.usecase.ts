/**
 * Voice Transcription AI Use Case
 * Transcribes voice recordings to text for field reports
 * Uses Gemini's audio understanding capability
 */

import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from '../providers/gemini.provider';

export interface VoiceTranscriptionInput {
    audioBase64: string;
    mimeType: string; // audio/wav, audio/mp3, audio/webm, etc.
    language?: string;
    context?: string; // e.g., "災害現場回報"
}

export interface VoiceTranscriptionResult {
    success: boolean;
    transcription?: {
        text: string;
        language: string;
        confidence: number;
        structuredReport?: {
            type: string;
            severity: number;
            location?: string;
            casualties?: string;
            needs?: string[];
            description: string;
        };
    };
    error?: string;
}

const TRANSCRIPTION_SCHEMA = {
    type: 'object',
    properties: {
        text: { type: 'string', description: '完整語音轉文字內容' },
        language: { type: 'string', description: '偵測到的語言' },
        confidence: { type: 'number', description: '轉錄信心分數 0-1' },
        structuredReport: {
            type: 'object',
            properties: {
                type: { type: 'string', description: '回報類型' },
                severity: { type: 'integer', description: '嚴重程度 1-5' },
                location: { type: 'string' },
                casualties: { type: 'string' },
                needs: { type: 'array', items: { type: 'string' } },
                description: { type: 'string' },
            },
        },
    },
    required: ['text', 'language', 'confidence'],
};

const SYSTEM_PROMPT = `你是一位專業的語音轉錄專家，專門處理災害現場語音回報。

任務：
1. 將語音內容精準轉錄為文字
2. 識別語言
3. 如果內容是災害回報，嘗試提取結構化資訊

回報類型包括：災情、傷亡、資源需求、道路狀況、建物損壞等

請以繁體中文輸出結構化資訊，即使原始語音是其他語言。`;

@Injectable()
export class VoiceTranscriptionUseCase {
    public static readonly ID = 'voice.transcription.v1';
    private readonly logger = new Logger(VoiceTranscriptionUseCase.name);

    constructor(private readonly gemini: GeminiProvider) { }

    /**
     * Transcribe voice recording
     */
    async execute(input: VoiceTranscriptionInput): Promise<VoiceTranscriptionResult> {
        try {
            if (!input.audioBase64) {
                return { success: false, error: '缺少音訊資料' };
            }

            const userPrompt = input.context
                ? `請轉錄這段語音 (背景: ${input.context})，並提取結構化資訊。`
                : '請轉錄這段語音，如果是災害回報請提取結構化資訊。';

            // Use Gemini with audio
            const response = await this.gemini.generateWithAudio({
                systemPrompt: SYSTEM_PROMPT,
                userPrompt,
                audioBase64: input.audioBase64,
                mimeType: input.mimeType,
                outputSchema: TRANSCRIPTION_SCHEMA,
            });

            if (!response.success) {
                return { success: false, error: response.error || '語音轉錄失敗' };
            }

            return {
                success: true,
                transcription: response.data,
            };
        } catch (error) {
            this.logger.error('Voice transcription failed', error);
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    static getMetadata() {
        return {
            id: VoiceTranscriptionUseCase.ID,
            name: '語音轉文字',
            description: '將現場語音回報轉錄為文字，並自動提取結構化災情資訊',
            inputType: 'VoiceTranscriptionInput',
            outputType: 'VoiceTranscriptionResult',
            estimatedDuration: '10-20 秒',
            costLevel: 'medium',
        };
    }
}
