/**
 * ThemeProvider.tsx
 * 
 * 主題切換 Context Provider
 * 工業鋼鐵雙主題版：K1 亮鋼 / K2 銅鋼
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 主題類型
export type ThemeName = 'light' | 'dark';

// 主題資訊
export interface ThemeInfo {
  name: ThemeName;
  displayName: string;
  displayNameEn: string;
  description: string;
  icon: string;
  isOledOptimized?: boolean;
}

// 可用主題列表
export const AVAILABLE_THEMES: ThemeInfo[] = [
  {
    name: 'light',
    displayName: '亮鋼版',
    displayNameEn: 'Bright Steel',
    description: '日間模式，適合辦公環境',
    icon: '🔩',
  },
  {
    name: 'dark',
    displayName: '銅鋼版',
    displayNameEn: 'Copper Steel',
    description: '暗色模式，OLED 省電優化',
    icon: '🟤',
    isOledOptimized: true,
  },
];

// Context 類型
interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  themeInfo: ThemeInfo;
  availableThemes: ThemeInfo[];
  isDark: boolean;
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
      if (stored === 'light' || stored === 'dark') {
        return stored as ThemeName;
      }
      
      // 檢查系統偏好
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return defaultTheme;
  });

  // 設定主題
  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
  };

  // 切換主題
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // 應用主題到 DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // 設定 data-theme attribute
    root.setAttribute('data-theme', theme);
    
    // 設定 class (相容舊版 html.dark 樣式)
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // 更新 meta theme-color (行動裝置狀態列顏色)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#1C1917' : '#F4F4F5'
      );
    }
  }, [theme]);

  // 監聽系統偏好變化
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // 只有當用戶沒有手動設定過時才自動切換
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, [storageKey]);

  // 取得當前主題資訊
  const themeInfo = AVAILABLE_THEMES.find(t => t.name === theme) || AVAILABLE_THEMES[0];

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    themeInfo,
    availableThemes: AVAILABLE_THEMES,
    isDark: theme === 'dark',
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
