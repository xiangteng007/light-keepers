/**
 * 主題切換按鈕
 * 支援 light/dark/system 三種模式
 */
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode } from '../hooks/useTheme';
import '../styles/theme.css';

// 簡單切換按鈕（淺/深色切換）
export function ThemeToggle() {
    const { isDark, toggleDarkMode } = useTheme();

    return (
        <button
            className="theme-toggle"
            onClick={toggleDarkMode}
            title={isDark ? '切換到淺色模式' : '切換到深色模式'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span className="theme-toggle__icon">
                {isDark ? '☀️' : '🌙'}
            </span>
        </button>
    );
}

// 完整選擇器（light/dark/system）
export function ThemeSelector() {
    const { mode, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 點擊外部關閉
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

    const options: { value: ThemeMode; icon: string; label: string }[] = [
        { value: 'light', icon: '☀️', label: '淺色模式' },
        { value: 'dark', icon: '🌙', label: '深色模式' },
        { value: 'system', icon: '💻', label: '跟隨系統' },
    ];

    const currentOption = options.find(o => o.value === mode) || options[2];

    return (
        <div className="theme-selector" ref={menuRef}>
            <button
                className="theme-toggle"
                onClick={() => setIsOpen(!isOpen)}
                title="選擇主題"
                aria-label="Select theme"
                aria-expanded={isOpen}
            >
                <span className="theme-toggle__icon">{currentOption.icon}</span>
            </button>

            {isOpen && (
                <div className="theme-selector__menu">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            className={`theme-selector__option ${mode === option.value ? 'theme-selector__option--active' : ''}`}
                            onClick={() => {
                                setTheme(option.value);
                                setIsOpen(false);
                            }}
                        >
                            <span className="theme-selector__option-icon">{option.icon}</span>
                            <span className="theme-selector__option-label">{option.label}</span>
                            {mode === option.value && (
                                <span className="theme-selector__option-check">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
