/**
 * ThemeSwitcher.tsx
 * 
 * 工業鋼鐵主題切換組件
 * K1 亮鋼版 ↔ K2 銅鋼版
 */

import React from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { ThemeIcon } from '../../design-system/icons';
import styles from './ThemeSwitcher.module.css';

interface ThemeSwitcherProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeSwitcher({ showLabel = false, size = 'md' }: ThemeSwitcherProps) {
  const { theme, toggleTheme, themeInfo, isDark } = useTheme();

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.switcher} ${styles[size]}`}
      title={`切換到${isDark ? '亮鋼版' : '銅鋼版'}`}
      aria-label={`當前主題: ${themeInfo.displayName}，點擊切換`}
    >
      <span className={styles.iconWrapper}>
        {/* B3c 教範圖例：theme 半面剖線方框，同一 icon 表達雙態（亮/暗由 aria/title 說明） */}
        <ThemeIcon size={iconSize} className={styles.icon} />
      </span>
      
      {showLabel && (
        <span className={styles.label}>
          {themeInfo.displayName}
        </span>
      )}
    </button>
  );
}

export default ThemeSwitcher;
