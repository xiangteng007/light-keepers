// Lightkeepers VI Design System
// 曦望燈塔救援協會視覺識別設計系統

// CSS Variables (import in your main CSS)
import './variables.css';

// UI Components
export * from './components';

// Tokens (for programmatic access)
export { default as tokens } from './lightkeepers_vi.tokens.json';

// Theme utilities
export type Theme = 'A' | 'B';

export const setTheme = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
};

export const getTheme = (): Theme => {
    return (document.documentElement.getAttribute('data-theme') as Theme) || 'A';
};

export const toggleTheme = () => {
    const current = getTheme();
    setTheme(current === 'A' ? 'B' : 'A');
};
