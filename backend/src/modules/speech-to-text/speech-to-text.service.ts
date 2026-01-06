import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Speech-to-Text Service
 * Audio transcription for radio communications and phone calls
 * 
 * 📋 需要設定:
 * - GOOGLE_CLOUD_PROJECT: GCP Project ID
 */
@Injectable()
export class SpeechToTextService {
    private readonly logger = new Logger(SpeechToTextService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 語音轉文字
     */
    async transcribe(audioBase64: string, options?: TranscribeOptions): Promise<TranscriptionResult> {
        const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT');

        if (!projectId) {
            return this.getMockTranscription(options?.language);
        }

        try {
            // TODO: 使用 Google Cloud Speech-to-Text API
            // const speech = new SpeechClient();
            // const [response] = await speech.recognize({
            //     audio: { content: audioBase64 },
            //     config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: options?.language || 'zh-TW' },
            // });

            return this.getMockTranscription(options?.language);
        } catch (error) {
            this.logger.error('Transcription failed', error);
            return { text: '', confidence: 0, error: String(error) };
        }
    }

    /**
     * 即時串流轉錄
     */
    async streamTranscribe(audioStream: any): Promise<AsyncGenerator<TranscriptionChunk>> {
        async function* mockStream(): AsyncGenerator<TranscriptionChunk> {
            yield { text: '收到...', isFinal: false, timestamp: Date.now() };
            yield { text: '收到，現場狀況已確認', isFinal: true, timestamp: Date.now() + 1000 };
        }
        return mockStream();
    }

    /**
     * 辨識對講機通話
     */
    async transcribeRadio(audioBase64: string): Promise<RadioTranscription> {
        const result = await this.transcribe(audioBase64, { language: 'zh-TW' });

        return {
            ...result,
            callSign: this.extractCallSign(result.text),
            priority: this.detectPriority(result.text),
            keywords: this.extractKeywords(result.text),
        };
    }

    /**
     * 批次轉錄
     */
    async batchTranscribe(audioFiles: { id: string; base64: string }[]): Promise<Map<string, TranscriptionResult>> {
        const results = new Map<string, TranscriptionResult>();

        for (const file of audioFiles) {
            results.set(file.id, await this.transcribe(file.base64));
        }

        return results;
    }

    // Private helpers
    private extractCallSign(text: string): string | null {
        const match = text.match(/(\w+\d+)/);
        return match ? match[1] : null;
    }

    private detectPriority(text: string): 'low' | 'normal' | 'high' | 'emergency' {
        const emergencyKeywords = ['緊急', '救命', 'SOS', '重傷', '倒塌'];
        if (emergencyKeywords.some((k) => text.includes(k))) return 'emergency';
        return 'normal';
    }

    private extractKeywords(text: string): string[] {
        const keywords: string[] = [];
        const keywordMap = ['傷患', '倒塌', '火災', '水災', '受困', '疏散'];
        keywordMap.forEach((k) => { if (text.includes(k)) keywords.push(k); });
        return keywords;
    }

    private getMockTranscription(language?: string): TranscriptionResult {
        return {
            text: '這裡是前線小組，現場已完成初步搜救，發現兩名受困民眾，需要醫療支援',
            confidence: 0.92,
            language: language || 'zh-TW',
            duration: 5.3,
        };
    }
}

// Types
interface TranscribeOptions { language?: string; enablePunctuation?: boolean; }
interface TranscriptionResult { text: string; confidence: number; language?: string; duration?: number; error?: string; }
interface TranscriptionChunk { text: string; isFinal: boolean; timestamp: number; }
interface RadioTranscription extends TranscriptionResult { callSign: string | null; priority: string; keywords: string[]; }
