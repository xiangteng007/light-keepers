import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * i18n API Service
 * Internationalization for multi-language API responses
 */
@Injectable()
export class I18nApiService {
    private readonly logger = new Logger(I18nApiService.name);
    private translations: Map<string, Record<string, string>> = new Map();
    private defaultLocale = 'zh-TW';
    private supportedLocales = ['zh-TW', 'en-US', 'ja-JP'];

    constructor(private configService: ConfigService) {
        this.loadTranslations();
    }

    private loadTranslations() {
        // 繁體中文
        this.translations.set('zh-TW', {
            // 通用
            'common.success': '操作成功',
            'common.error': '操作失敗',
            'common.notFound': '找不到資料',
            'common.unauthorized': '未授權存取',
            'common.forbidden': '權限不足',
            'common.badRequest': '請求格式錯誤',
            // 災害類型
            'disaster.earthquake': '地震',
            'disaster.typhoon': '颱風',
            'disaster.flood': '水災',
            'disaster.fire': '火災',
            'disaster.landslide': '土石流',
            // 志工狀態
            'volunteer.available': '待命中',
            'volunteer.dispatched': '已派遣',
            'volunteer.onScene': '現場執勤',
            'volunteer.resting': '休息中',
            // 事件狀態
            'incident.new': '新通報',
            'incident.confirmed': '已確認',
            'incident.responding': '處理中',
            'incident.resolved': '已解決',
            // 警報等級
            'alert.low': '低度警戒',
            'alert.medium': '中度警戒',
            'alert.high': '高度警戒',
            'alert.critical': '嚴重警報',
        });

        // English
        this.translations.set('en-US', {
            'common.success': 'Operation successful',
            'common.error': 'Operation failed',
            'common.notFound': 'Resource not found',
            'common.unauthorized': 'Unauthorized access',
            'common.forbidden': 'Permission denied',
            'common.badRequest': 'Bad request format',
            'disaster.earthquake': 'Earthquake',
            'disaster.typhoon': 'Typhoon',
            'disaster.flood': 'Flood',
            'disaster.fire': 'Fire',
            'disaster.landslide': 'Landslide',
            'volunteer.available': 'Available',
            'volunteer.dispatched': 'Dispatched',
            'volunteer.onScene': 'On Scene',
            'volunteer.resting': 'Resting',
            'incident.new': 'New Report',
            'incident.confirmed': 'Confirmed',
            'incident.responding': 'Responding',
            'incident.resolved': 'Resolved',
            'alert.low': 'Low Alert',
            'alert.medium': 'Medium Alert',
            'alert.high': 'High Alert',
            'alert.critical': 'Critical Alert',
        });

        // 日本語
        this.translations.set('ja-JP', {
            'common.success': '操作成功',
            'common.error': '操作失敗',
            'common.notFound': 'データが見つかりません',
            'common.unauthorized': '認証エラー',
            'common.forbidden': '権限がありません',
            'common.badRequest': 'リクエスト形式エラー',
            'disaster.earthquake': '地震',
            'disaster.typhoon': '台風',
            'disaster.flood': '洪水',
            'disaster.fire': '火災',
            'disaster.landslide': '土砂災害',
            'volunteer.available': '待機中',
            'volunteer.dispatched': '派遣済み',
            'volunteer.onScene': '現場対応中',
            'volunteer.resting': '休憩中',
            'incident.new': '新規通報',
            'incident.confirmed': '確認済み',
            'incident.responding': '対応中',
            'incident.resolved': '解決済み',
            'alert.low': '低警戒',
            'alert.medium': '中警戒',
            'alert.high': '高警戒',
            'alert.critical': '緊急警報',
        });
    }

    /**
     * 翻譯
     */
    t(key: string, locale?: string, params?: Record<string, any>): string {
        const lang = locale || this.defaultLocale;
        const dict = this.translations.get(lang) || this.translations.get(this.defaultLocale)!;
        let text = dict[key] || key;

        // 替換參數
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }

        return text;
    }

    /**
     * 取得語系
     */
    getSupportedLocales(): string[] {
        return [...this.supportedLocales];
    }

    /**
     * 解析語系 (from request)
     */
    resolveLocale(acceptLanguage?: string): string {
        if (!acceptLanguage) return this.defaultLocale;

        for (const lang of this.supportedLocales) {
            if (acceptLanguage.includes(lang.substring(0, 2))) {
                return lang;
            }
        }
        return this.defaultLocale;
    }

    /**
     * 取得所有翻譯
     */
    getAllTranslations(locale: string): Record<string, string> {
        return this.translations.get(locale) || {};
    }

    /**
     * 新增/更新翻譯
     */
    addTranslation(locale: string, key: string, value: string): void {
        if (!this.translations.has(locale)) {
            this.translations.set(locale, {});
        }
        this.translations.get(locale)![key] = value;
    }
}
