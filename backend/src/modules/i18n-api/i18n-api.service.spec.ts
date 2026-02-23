import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nApiService } from './i18n-api.service';

describe('I18nApiService', () => {
    let service: I18nApiService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                I18nApiService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();
        service = module.get(I18nApiService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('t returns zh-TW default translation', () => {
        expect(service.t('common.success')).toBe('操作成功');
    });

    it('t returns en-US translation', () => {
        expect(service.t('common.success', 'en-US')).toBe('Operation successful');
    });

    it('t returns key if not found', () => {
        expect(service.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('getSupportedLocales returns 3 locales', () => {
        expect(service.getSupportedLocales()).toEqual(['zh-TW', 'en-US', 'ja-JP']);
    });

    it('resolveLocale resolves from Accept-Language', () => {
        expect(service.resolveLocale('en-US,en;q=0.9')).toBe('en-US');
        expect(service.resolveLocale('ja')).toBe('ja-JP');
        expect(service.resolveLocale(undefined)).toBe('zh-TW');
    });

    it('getAllTranslations returns a record', () => {
        const t = service.getAllTranslations('zh-TW');
        expect(t['common.success']).toBe('操作成功');
    });

    it('addTranslation adds new key', () => {
        service.addTranslation('zh-TW', 'test.key', 'test value');
        expect(service.t('test.key')).toBe('test value');
    });
});
