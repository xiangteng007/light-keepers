import type { Config } from 'tailwindcss';

/**
 * Light Keepers Tactical C2 / ICS Design System
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Style: Tactical, Matte, Low-Saturation, High-Contrast
 * Theme: "Tactical Dark" (Command Center, not SaaS Dashboard)
 */

const config: Config = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            // ════════════════════════════════════════════════════════════
            // COLORS - Tactical Dark Theme
            // ════════════════════════════════════════════════════════════
            colors: {
                tactical: {
                    // ── Background Hierarchy ──
                    app: '#13171F',           // V2 Polish: Deep Charcoal (Base)
                    panel: 'rgba(19, 23, 31, 0.90)', // V2 Polish: Matte Glass
                    surface: '#1D2635',       // Elevated surface
                    hover: '#2A3548',         // Hover state

                    // ── Borders & Dividers ──
                    border: '#2F3641',        // V2 Polish: Thin, subtle border
                    'border-light': 'rgba(255, 255, 255, 0.1)',
                    'border-focus': '#4A5568',

                    // ── Text Hierarchy ──
                    text: {
                        primary: '#E2E8F0',     // Slate-200 (Primary)
                        secondary: '#94A3B8',   // Slate-400 (Labels)
                        tertiary: '#64748B',    // Slate-500 (Dim)
                        inverse: '#13171F',
                    },

                    // ── Accent Colors ──
                    gold: {
                        DEFAULT: '#C39B6F',     // Gold Accent
                        light: '#E2C29A',
                        dark: '#A67C52',
                        muted: 'rgba(195, 155, 111, 0.15)',
                    },

                    // ── Status Colors ──
                    status: {
                        critical: '#EF4444',
                        warning: '#F59E0B',
                        success: '#10B981',
                        info: '#06B6D4',
                        neutral: '#475569',
                    },

                    // ── Semantic ──
                    void: '#0B1120', // Deepest void for maps
                },
            },

            // ════════════════════════════════════════════════════════════
            // TYPOGRAPHY - Tactical / Military Style
            // ════════════════════════════════════════════════════════════
            fontFamily: {
                sans: [
                    'Inter',
                    'Noto Sans TC',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'sans-serif',
                ],
                mono: [
                    'JetBrains Mono',
                    'Fira Code',
                    'SF Mono',
                    'Consolas',
                    'monospace',
                ],
                tactical: [
                    'Inter',
                    'Noto Sans TC',
                    'sans-serif',
                ],
            },

            fontSize: {
                // Tactical compact sizing
                'tactical-xs': ['0.625rem', { lineHeight: '1rem' }],      // 10px - Badges
                'tactical-sm': ['0.6875rem', { lineHeight: '1rem' }],     // 11px - Labels
                'tactical-base': ['0.75rem', { lineHeight: '1.125rem' }], // 12px - Body
                'tactical-lg': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px - Headings
                'tactical-xl': ['1rem', { lineHeight: '1.5rem' }],        // 16px - Titles
                'tactical-2xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px - Page titles
            },

            letterSpacing: {
                'tactical': '0.05em',       // Wider tracking for labels
                'tactical-wide': '0.1em',   // UPPERCASE labels
            },

            // ════════════════════════════════════════════════════════════
            // EFFECTS - Matte Glassmorphism
            // ════════════════════════════════════════════════════════════
            boxShadow: {
                'tactical-sm': '0 1px 2px rgba(0, 0, 0, 0.4)',
                'tactical': '0 2px 8px rgba(0, 0, 0, 0.5)',
                'tactical-lg': '0 4px 16px rgba(0, 0, 0, 0.6)',
                'tactical-xl': '0 8px 32px rgba(0, 0, 0, 0.7)',

                // Inset shadows for depth
                'tactical-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',

                // Glow effects (use sparingly)
                'glow-gold': '0 0 20px rgba(195, 155, 111, 0.3)',
                'glow-critical': '0 0 20px rgba(137, 51, 54, 0.4)',
            },

            backdropBlur: {
                'tactical': '12px',
                'tactical-heavy': '24px',
            },

            // ════════════════════════════════════════════════════════════
            // SPACING & SIZING
            // ════════════════════════════════════════════════════════════
            spacing: {
                'tactical-xs': '0.25rem',   // 4px
                'tactical-sm': '0.5rem',    // 8px
                'tactical-md': '0.75rem',   // 12px
                'tactical-lg': '1rem',      // 16px
                'tactical-xl': '1.5rem',    // 24px
            },

            borderRadius: {
                'tactical-sm': '0.25rem',   // 4px - Buttons, badges
                'tactical': '0.375rem',     // 6px - Cards, inputs
                'tactical-lg': '0.5rem',    // 8px - Modals, panels
            },

            // ════════════════════════════════════════════════════════════
            // ANIMATIONS
            // ════════════════════════════════════════════════════════════
            animation: {
                'pulse-tactical': 'pulse-tactical 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'blink-critical': 'blink-critical 1s step-end infinite',
            },

            keyframes: {
                'pulse-tactical': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                'blink-critical': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
