/**
 * i18n Configuration
 * 
 * Internationalization setup with i18next
 * v1.0
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locale files
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';

// Language configuration
export const LANGUAGES = [
    { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
];

const resources = {
    'zh-TW': { translation: zhTW },
    'en': { translation: en },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh-TW',
        defaultNS: 'translation',

        // Language detection options
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'lightkeepers-language',
        },

        interpolation: {
            escapeValue: false, // React already escapes
        },

        // Debug mode in development
        debug: import.meta.env.DEV,
    });

// Helper function to change language
export const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lightkeepers-language', code);
};

export default i18n;
