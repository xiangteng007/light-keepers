/**
 * 語言切換元件
 */
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../i18n';
import './LanguageSelector.css';

// 簡單切換按鈕
export function LanguageToggle() {
    const { i18n } = useTranslation();
    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const toggleLanguage = () => {
        const currentIndex = LANGUAGES.findIndex(l => l.code === i18n.language);
        const nextIndex = (currentIndex + 1) % LANGUAGES.length;
        changeLanguage(LANGUAGES[nextIndex].code);
    };

    return (
        <button
            className="language-toggle"
            onClick={toggleLanguage}
            title={`當前語言: ${currentLang.name}`}
        >
            <span className="language-toggle__flag">{currentLang.flag}</span>
        </button>
    );
}

// 下拉選擇器
export function LanguageSelector() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (code: string) => {
        changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="language-selector" ref={menuRef}>
            <button
                className="language-selector__trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="language-selector__flag">{currentLang.flag}</span>
                <span className="language-selector__name">{currentLang.name}</span>
                <span className="language-selector__arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="language-selector__menu">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            className={`language-selector__option ${lang.code === i18n.language ? 'language-selector__option--active' : ''}`}
                            onClick={() => handleSelect(lang.code)}
                        >
                            <span className="language-selector__option-flag">{lang.flag}</span>
                            <span className="language-selector__option-name">{lang.name}</span>
                            {lang.code === i18n.language && (
                                <span className="language-selector__check">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
