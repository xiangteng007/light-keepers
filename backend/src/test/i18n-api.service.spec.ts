import { Test, TestingModule } from '@nestjs/testing';
import { I18nApiService } from '../modules/i18n-api/i18n-api.service';
import { ConfigService } from '@nestjs/config';

describe('I18nApiService', () => {
    let service: I18nApiService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                I18nApiService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get<I18nApiService>(I18nApiService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('t', () => {
        it('should translate zh-TW', () => {
            const result = service.t('common.success', 'zh-TW');
            expect(result).toBe('操作成功');
        });

        it('should translate en-US', () => {
            const result = service.t('common.success', 'en-US');
            expect(result).toBe('Operation successful');
        });

        it('should translate ja-JP', () => {
            const result = service.t('common.success', 'ja-JP');
            expect(result).toBe('操作成功');
        });

        it('should return key if not found', () => {
            const result = service.t('nonexistent.key');
            expect(result).toBe('nonexistent.key');
        });

        it('should fall back to zh-TW for unknown locale', () => {
            const result = service.t('common.success', 'fr-FR');
            expect(result).toBe('操作成功');
        });
    });

    describe('getSupportedLocales', () => {
        it('should return supported locales', () => {
            const locales = service.getSupportedLocales();
            expect(locales).toContain('zh-TW');
            expect(locales).toContain('en-US');
            expect(locales).toContain('ja-JP');
        });
    });

    describe('resolveLocale', () => {
        it('should resolve from Accept-Language header', () => {
            expect(service.resolveLocale('en-US,en;q=0.9')).toBe('en-US');
            expect(service.resolveLocale('ja;q=0.8')).toBe('ja-JP');
        });

        it('should default to zh-TW', () => {
            expect(service.resolveLocale()).toBe('zh-TW');
            expect(service.resolveLocale('fr-FR')).toBe('zh-TW');
        });
    });
});
