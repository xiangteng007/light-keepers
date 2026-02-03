/**
 * Theme Management Hook
 * Light theme is the default professional design
 * Users can switch to dark mode if preferred
 */
import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'lightkeepers-theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }
    // Default to light theme for the professional Light Keepers design
    return 'light';
}

function applyTheme(theme: 'light' | 'dark') {
    const root = document.documentElement;

    if (theme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
    } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
    }
}

export function useTheme() {
    const [mode, setMode] = useState<ThemeMode>(getStoredTheme);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    // 計算實際主題
    const computeTheme = useCallback(() => {
        if (mode === 'system') {
            return getSystemTheme();
        }
        return mode;
    }, [mode]);

    // 初始化和監聽系統主題變化
    useEffect(() => {
        const theme = computeTheme();
        setResolvedTheme(theme);
        applyTheme(theme);

        // 監聽系統主題變化
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (mode === 'system') {
                const newTheme = getSystemTheme();
                setResolvedTheme(newTheme);
                applyTheme(newTheme);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [mode, computeTheme]);

    // 切換主題
    const setTheme = useCallback((newMode: ThemeMode) => {
        setMode(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
    }, []);

    // 循環切換：light → dark → system
    const toggleTheme = useCallback(() => {
        const nextMode: Record<ThemeMode, ThemeMode> = {
            light: 'dark',
            dark: 'system',
            system: 'light',
        };
        setTheme(nextMode[mode]);
    }, [mode, setTheme]);

    // 簡單的淺/深切換
    const toggleDarkMode = useCallback(() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }, [resolvedTheme, setTheme]);

    return {
        mode,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        setTheme,
        toggleTheme,
        toggleDarkMode,
    };
}
