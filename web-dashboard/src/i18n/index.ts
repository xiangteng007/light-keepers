/**
 * i18n 國際化配置
 * 支援繁體中文 (zh-TW) 和英文 (en)
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';

const resources = {
    'zh-TW': { translation: zhTW },
    en: { translation: en },
};

i18n
    .use(LanguageDetector) // 自動偵測語言
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh-TW', // 預設語言
        supportedLngs: ['zh-TW', 'en'],

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
    { code: 'en', name: 'English', flag: '🇺🇸' },
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
