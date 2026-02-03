/**
 * i18n 國際化配置
 * 
 * 支援 13 種語言：
 * - 東北亞: zh-TW, zh-CN, ja, ko
 * - 東南亞: vi, th, id, ms, fil, km, my, lo
 * - 國際: en
 * 
 * @version 2.0.0 - 2026-02-03 13 語言全支援
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 載入所有語言資源
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import vi from './locales/vi.json';
import th from './locales/th.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import fil from './locales/fil.json';
import km from './locales/km.json';
import my from './locales/my.json';
import lo from './locales/lo.json';

const resources = {
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    'en': { translation: en },
    'ja': { translation: ja },
    'ko': { translation: ko },
    'vi': { translation: vi },
    'th': { translation: th },
    'id': { translation: id },
    'ms': { translation: ms },
    'fil': { translation: fil },
    'km': { translation: km },
    'my': { translation: my },
    'lo': { translation: lo },
};

i18n
    .use(LanguageDetector) // 自動偵測語言
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh-TW', // 預設語言
        supportedLngs: ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'fil', 'km', 'my', 'lo'],

        interpolation: {
            escapeValue: false, // React 已處理 XSS
        },

        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'lightkeepers-language',
        },

        react: {
            useSuspense: false, // 禁用 Suspense 以避免空白頁面問題
        },
    });

export default i18n;

// 導出語言選項 (按地區分組)
export const LANGUAGES = [
    // 東北亞
    { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼', region: 'asia-ne' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳', region: 'asia-ne' },
    { code: 'ja', name: '日本語', flag: '🇯🇵', region: 'asia-ne' },
    { code: 'ko', name: '한국어', flag: '🇰🇷', region: 'asia-ne' },
    // 東南亞
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', region: 'asia-se' },
    { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭', region: 'asia-se' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', region: 'asia-se' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾', region: 'asia-se' },
    { code: 'fil', name: 'Filipino', flag: '🇵🇭', region: 'asia-se' },
    { code: 'km', name: 'ភាសាខ្មែរ', flag: '🇰🇭', region: 'asia-se' },
    { code: 'my', name: 'မြန်မာဘာသာ', flag: '🇲🇲', region: 'asia-se' },
    { code: 'lo', name: 'ພາສາລາວ', flag: '🇱🇦', region: 'asia-se' },
    // 國際
    { code: 'en', name: 'English', flag: '🇺🇸', region: 'intl' },
];

// 取得當前語言
export function getCurrentLanguage(): string {
    return i18n.language || 'zh-TW';
}

// 切換語言
export function changeLanguage(lang: string): Promise<void> {
    return i18n.changeLanguage(lang).then(() => {
        localStorage.setItem('lightkeepers-language', lang);
        // 更新 HTML lang 屬性
        document.documentElement.lang = lang;
    });
}

// 取得語言資訊
export function getLanguageInfo(code: string) {
    return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
}
