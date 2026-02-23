import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TranslationService } from './translation.service';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('TranslationService', () => {
    let service: TranslationService;

    beforeEach(async () => {
        mockFetch.mockReset();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TranslationService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(null) } },
            ],
        }).compile();
        service = module.get<TranslationService>(TranslationService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('translate', () => {
        it('should return fallback when no API key', async () => {
            const result = await service.translate('Hello', 'en', 'zh-TW');
            expect(result.success).toBe(true);
            expect(result.text).toContain('[zh-TW]');
            expect(result.cached).toBe(false);
        });

        it('should return cached emergency phrase', async () => {
            const result = await service.translate('Help! I need assistance!', 'en', 'zh-TW');
            expect(result.cached).toBe(true);
            expect(result.text).toBe('救命！需要幫助！');
        });
    });

    describe('batchTranslate', () => {
        it('should translate multiple texts', async () => {
            const results = await service.batchTranslate(['Hello', 'World'], 'en', 'zh-TW');
            expect(results).toHaveLength(2);
            results.forEach(r => expect(r.success).toBe(true));
        });
    });

    describe('getEmergencyPhrase', () => {
        it('should return phrase for known key and language', () => {
            expect(service.getEmergencyPhrase('help', 'ja')).toBe('助けて！助けが必要です！');
            expect(service.getEmergencyPhrase('evacuate', 'en')).toBe('Please evacuate immediately');
        });

        it('should return null for unknown key', () => {
            expect(service.getEmergencyPhrase('nonexistent', 'en')).toBeNull();
        });
    });

    describe('detectLanguage', () => {
        it('should detect Japanese', async () => {
            const result = await service.detectLanguage('こんにちは');
            expect(result.language).toBe('ja');
        });

        it('should detect Korean', async () => {
            const result = await service.detectLanguage('안녕하세요');
            expect(result.language).toBe('ko');
        });

        it('should detect Thai', async () => {
            const result = await service.detectLanguage('สวัสดี');
            expect(result.language).toBe('th');
        });

        it('should detect Chinese', async () => {
            const result = await service.detectLanguage('你好世界');
            expect(result.language).toBe('zh-TW');
        });

        it('should default to English', async () => {
            const result = await service.detectLanguage('Hello world');
            expect(result.language).toBe('en');
        });
    });

    describe('getSupportedLanguages', () => {
        it('should return 10 supported languages', () => {
            const langs = service.getSupportedLanguages();
            expect(langs).toHaveLength(10);
            expect(langs.map(l => l.code)).toContain('zh-TW');
            expect(langs.map(l => l.code)).toContain('en');
        });
    });

    describe('translateSpeech', () => {
        it('should return error when transcription fails', async () => {
            const result = await service.translateSpeech(Buffer.from('audio'), 'en', 'zh-TW');
            expect(result.success).toBe(false);
            expect(result.error).toContain('transcribe');
        });
    });
});
