/**
 * i18n 國際化配置
 * 支援 9 種語言
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ms from './locales/ms.json';
import fil from './locales/fil.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import id from './locales/id.json';

const resources = {
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    en: { translation: en },
    ja: { translation: ja },
    ms: { translation: ms },
    fil: { translation: fil },
    th: { translation: th },
    vi: { translation: vi },
    id: { translation: id },
};

i18n
    .use(LanguageDetector) // 自動偵測語言
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh-TW', // 預設語言
        supportedLngs: ['zh-TW', 'zh-CN', 'en', 'ja', 'ms', 'fil', 'th', 'vi', 'id'],

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

// 導出語言選項
export const LANGUAGES = [
    { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
    { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

// 取得當前語言
export function getCurrentLanguage(): string {
    return i18n.language || 'zh-TW';
}

// 切換語言
export function changeLanguage(lang: string): Promise<void> {
    return i18n.changeLanguage(lang).then(() => {
        localStorage.setItem('lightkeepers-language', lang);
    });
}
