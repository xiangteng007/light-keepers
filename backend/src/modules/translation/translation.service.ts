import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Real-time Translation Service
 * Multi-language translation for disaster response communication
 */
@Injectable()
export class TranslationService {
    private readonly logger = new Logger(TranslationService.name);

    // Supported languages
    private readonly SUPPORTED_LANGUAGES = [
        { code: 'zh-TW', name: '繁體中文' },
        { code: 'zh-CN', name: '简体中文' },
        { code: 'en', name: 'English' },
        { code: 'ja', name: '日本語' },
        { code: 'ko', name: '한국어' },
        { code: 'vi', name: 'Tiếng Việt' },
        { code: 'th', name: 'ภาษาไทย' },
        { code: 'id', name: 'Bahasa Indonesia' },
        { code: 'ms', name: 'Bahasa Melayu' },
        { code: 'fil', name: 'Filipino' },
    ];

    // Common emergency phrases cache
    private phraseCache: Map<string, Map<string, string>> = new Map();

    constructor(private configService: ConfigService) {
        this.initializeEmergencyPhrases();
    }

    /**
     * Translate text between languages
     */
    async translate(text: string, from: string, to: string): Promise<TranslationResult> {
        // Check cache first
        const cached = this.getCachedTranslation(text, to);
        if (cached) {
            return { success: true, text: cached, cached: true };
        }

        try {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');

            if (!apiKey) {
                return this.getFallbackTranslation(text, from, to);
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Translate the following text from ${from} to ${to}. Only return the translation, no explanation:\n\n${text}`,
                            }],
                        }],
                    }),
                },
            );

            const data = await response.json();
            const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (translation) {
                this.cacheTranslation(text, to, translation);
                return { success: true, text: translation, cached: false };
            }

            return this.getFallbackTranslation(text, from, to);
        } catch (error) {
            this.logger.error('Translation failed', error);
            return this.getFallbackTranslation(text, from, to);
        }
    }

    /**
     * Translate speech audio
     */
    async translateSpeech(
        audio: Buffer,
        fromLanguage: string,
        toLanguage: string,
    ): Promise<SpeechTranslationResult> {
        // Step 1: Transcribe audio
        const transcript = await this.transcribeAudio(audio, fromLanguage);

        if (!transcript) {
            return { success: false, error: 'Could not transcribe audio' };
        }

        // Step 2: Translate text
        const translation = await this.translate(transcript, fromLanguage, toLanguage);

        if (!translation.success) {
            return { success: false, error: 'Translation failed', originalText: transcript };
        }

        // Step 3: Generate audio response (optional)
        const translatedAudio = await this.synthesizeSpeech(translation.text, toLanguage);

        return {
            success: true,
            originalText: transcript,
            translatedText: translation.text,
            translatedAudio,
        };
    }

    /**
     * Batch translate multiple texts
     */
    async batchTranslate(
        texts: string[],
        from: string,
        to: string,
    ): Promise<TranslationResult[]> {
        return Promise.all(texts.map((text) => this.translate(text, from, to)));
    }

    /**
     * Get emergency phrase in target language
     */
    getEmergencyPhrase(phraseKey: string, language: string): string | null {
        const phrases = this.phraseCache.get(phraseKey);
        return phrases?.get(language) || null;
    }

    /**
     * Detect language of text
     */
    async detectLanguage(text: string): Promise<LanguageDetection> {
        // Simple heuristic detection
        const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
        const hasJapaneseChars = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
        const hasKoreanChars = /[\uac00-\ud7af]/.test(text);
        const hasThaiChars = /[\u0e00-\u0e7f]/.test(text);
        const hasVietnameseChars = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);

        if (hasJapaneseChars) return { language: 'ja', confidence: 0.9 };
        if (hasKoreanChars) return { language: 'ko', confidence: 0.9 };
        if (hasThaiChars) return { language: 'th', confidence: 0.9 };
        if (hasVietnameseChars) return { language: 'vi', confidence: 0.8 };
        if (hasChineseChars) return { language: 'zh-TW', confidence: 0.7 };

        return { language: 'en', confidence: 0.5 };
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages(): typeof this.SUPPORTED_LANGUAGES {
        return this.SUPPORTED_LANGUAGES;
    }

    // Private methods
    private initializeEmergencyPhrases(): void {
        const phrases: Record<string, Record<string, string>> = {
            help: {
                'zh-TW': '救命！需要幫助！',
                en: 'Help! I need assistance!',
                ja: '助けて！助けが必要です！',
                vi: 'Cứu tôi! Tôi cần giúp đỡ!',
                th: 'ช่วยด้วย! ฉันต้องการความช่วยเหลือ!',
            },
            injured: {
                'zh-TW': '我受傷了',
                en: 'I am injured',
                ja: '怪我をしました',
                vi: 'Tôi bị thương',
                th: 'ฉันได้รับบาดเจ็บ',
            },
            location: {
                'zh-TW': '我在這裡',
                en: 'I am here',
                ja: 'ここにいます',
                vi: 'Tôi ở đây',
                th: 'ฉันอยู่ที่นี่',
            },
            evacuate: {
                'zh-TW': '請立即疏散',
                en: 'Please evacuate immediately',
                ja: '直ちに避難してください',
                vi: 'Vui lòng sơ tán ngay',
                th: 'กรุณาอพยพทันที',
            },
            safe: {
                'zh-TW': '我很安全',
                en: 'I am safe',
                ja: '私は安全です',
                vi: 'Tôi an toàn',
                th: 'ฉันปลอดภัย',
            },
        };

        for (const [key, translations] of Object.entries(phrases)) {
            this.phraseCache.set(key, new Map(Object.entries(translations)));
        }
    }

    private getCachedTranslation(text: string, to: string): string | null {
        for (const [, translations] of this.phraseCache) {
            for (const [lang, translation] of translations) {
                if (translation === text && lang !== to) {
                    return translations.get(to) || null;
                }
            }
        }
        return null;
    }

    private cacheTranslation(text: string, to: string, translation: string): void {
        // Simple LRU cache implementation would go here
    }

    private getFallbackTranslation(text: string, from: string, to: string): TranslationResult {
        return {
            success: true,
            text: `[${to}] ${text}`,
            cached: false,
            fallback: true,
        };
    }

    private async transcribeAudio(audio: Buffer, language: string): Promise<string | null> {
        // Would integrate with speech-to-text service
        return null;
    }

    private async synthesizeSpeech(text: string, language: string): Promise<Buffer | null> {
        // Would integrate with text-to-speech service
        return null;
    }
}

// Type definitions
interface TranslationResult {
    success: boolean;
    text: string;
    cached: boolean;
    fallback?: boolean;
    error?: string;
}

interface SpeechTranslationResult {
    success: boolean;
    originalText?: string;
    translatedText?: string;
    translatedAudio?: Buffer | null;
    error?: string;
}

interface LanguageDetection {
    language: string;
    confidence: number;
}
