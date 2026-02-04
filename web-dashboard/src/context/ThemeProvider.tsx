/**
 * ThemeProvider.tsx
 * 
 * 主題切換 Context Provider
 * 支援四個主題：light, dark, high-contrast, nature
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 主題類型
export type ThemeName = 'light' | 'dark' | 'high-contrast' | 'nature';

// 主題資訊
export interface ThemeInfo {
  name: ThemeName;
  displayName: string;
  description: string;
  icon: string;
}

// 可用主題列表
export const AVAILABLE_THEMES: ThemeInfo[] = [
  {
    name: 'light',
    displayName: '北歐極簡',
    description: '明亮專業，適合日常辦公',
    icon: '☀️',
  },
  {
    name: 'dark',
    displayName: '戰術暗色',
    description: '深色護眼，適合現場作業',
    icon: '🌙',
  },
  {
    name: 'high-contrast',
    displayName: '高對比',
    description: '最大可讀性，無障礙友善',
    icon: '🔳',
  },
  {
    name: 'nature',
    displayName: '大地色系',
    description: '柔和療癒，適合社區服務',
    icon: '🌿',
  },
];

// Context 類型
interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  themeInfo: ThemeInfo;
  availableThemes: ThemeInfo[];
}

// 創建 Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider Props
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
  storageKey?: string;
}

/**
 * ThemeProvider Component
 */
export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'light-keepers-theme',
}: ThemeProviderProps) {
  // 初始化主題 (從 localStorage 或預設值)
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && AVAILABLE_THEMES.some(t => t.name === stored)) {
        return stored as ThemeName;
      }
      
      // 檢查系統偏好
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      if (window.matchMedia('(prefers-contrast: more)').matches) {
        return 'high-contrast';
      }
    }
    return defaultTheme;
  });

  // 設定主題
  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
  };

  // 循環切換主題
  const toggleTheme = () => {
    const currentIndex = AVAILABLE_THEMES.findIndex(t => t.name === theme);
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
    setTheme(AVAILABLE_THEMES[nextIndex].name);
  };

  // 應用主題到 DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // 移除所有主題 class
    AVAILABLE_THEMES.forEach(t => {
      root.classList.remove(`theme-${t.name}`);
    });
    
    // 設定 data-theme attribute
    root.setAttribute('data-theme', theme);
    
    // 新增主題 class
    root.classList.add(`theme-${theme}`);
    
    // 更新 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors: Record<ThemeName, string> = {
        light: '#FFFFFF',
        dark: '#0F172A',
        'high-contrast': '#FFFFFF',
        nature: '#FFFBEB',
      };
      metaThemeColor.setAttribute('content', colors[theme]);
    }
  }, [theme]);

  // 監聽系統偏好變化
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleChange = () => {
      // 只有當用戶沒有手動設定過時才自動切換
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        if (contrastQuery.matches) {
          setThemeState('high-contrast');
        } else if (darkModeQuery.matches) {
          setThemeState('dark');
        } else {
          setThemeState('light');
        }
      }
    };

    darkModeQuery.addEventListener('change', handleChange);
    contrastQuery.addEventListener('change', handleChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleChange);
      contrastQuery.removeEventListener('change', handleChange);
    };
  }, [storageKey]);

  // 取得當前主題資訊
  const themeInfo = AVAILABLE_THEMES.find(t => t.name === theme) || AVAILABLE_THEMES[0];

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    themeInfo,
    availableThemes: AVAILABLE_THEMES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme Hook
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
