/**
 * ThemeSwitcher.tsx
 * 
 * 主題切換下拉選單組件
 */

import React from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { Dropdown } from 'react-bootstrap';
import { Palette } from 'lucide-react';

interface ThemeSwitcherProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeSwitcher({ showLabel = false, size = 'md' }: ThemeSwitcherProps) {
  const { theme, setTheme, themeInfo, availableThemes } = useTheme();

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="outline-secondary"
        className={sizeClasses[size]}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <Palette size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        {showLabel && (
          <span>
            {themeInfo.icon} {themeInfo.displayName}
          </span>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>選擇主題</Dropdown.Header>
        {availableThemes.map((t) => (
          <Dropdown.Item
            key={t.name}
            active={theme === t.name}
            onClick={() => setTheme(t.name)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <span style={{ fontWeight: 600 }}>
              {t.icon} {t.displayName}
            </span>
            <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              {t.description}
            </small>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default ThemeSwitcher;
