/**
 * LanguageSwitcher.tsx
 * 
 * P3-02: Multi-language Support
 * Language toggle dropdown for switching between zh-TW and en
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { LANGUAGES, changeLanguage } from '../../i18n';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const handleSelect = (code: string) => {
        changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="lang-switcher">
            <button
                className="lang-switcher-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen ? "true" : "false"}
                aria-label="切換語言"
            >
                <Globe size={16} />
                <span className="lang-flag">{currentLang.flag}</span>
                <span className="lang-name">{currentLang.name}</span>
                <ChevronDown size={14} className={`lang-chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <div className="lang-switcher-dropdown">
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            className={`lang-option ${lang.code === i18n.language ? 'active' : ''}`}
                            onClick={() => handleSelect(lang.code)}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <span className="lang-name">{lang.name}</span>
                            {lang.code === i18n.language && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
