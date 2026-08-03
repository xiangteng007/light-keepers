/**
 * R5/T5: B3c icon 集圖形文法 gate
 *
 * 守護 `src/design-system/icons/` 的教範一致性（規則見該目錄 README.md）：
 * 1. 42 個核心語意名必須全部在 iconRegistry 註冊（寧全勿缺）。
 * 2. 每個 icon 渲染出來必須是 viewBox 24×24、stroke 2、square cap、miter join、
 *    currentColor、fill=none 的 <svg>，且 size prop 同步控制寬高（預設 24）。
 * 3. 幾何靜態掃描：icon 原始檔禁 circle/ellipse/arc（A 指令）/貝茲（C/Q/S/T 指令）/
 *    圓角 rx，禁任何硬編色。
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconRegistry } from '../../design-system/icons';

const CORE_SEMANTIC_NAMES = [
    'command', 'map', 'tasks', 'report', 'triage', 'inventory', 'teams',
    'events', 'analytics', 'settings', 'notify', 'search', 'layers',
    'shelter', 'aed', 'warehouse', 'drone', 'radio', 'sos', 'sync',
    'offline', 'online', 'edit', 'close', 'check', 'plus', 'minus',
    'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down',
    'warning', 'info', 'clock', 'location', 'camera', 'mic', 'qr',
    'filter', 'export', 'user', 'logout',
];

const THIS_DIR = (() => {
    try {
        return dirname(fileURLToPath(import.meta.url));
    } catch {
        return join(process.cwd(), 'src', 'test', 'design');
    }
})();
const ICONS_DIR = join(THIS_DIR, '..', '..', 'design-system', 'icons');

describe('B3c icon 集 — 註冊完整性', () => {
    it('42 個核心語意名全部註冊', () => {
        const missing = CORE_SEMANTIC_NAMES.filter((name) => !iconRegistry[name]);
        expect(missing, `iconRegistry 缺少: ${missing.join(', ')}`).toEqual([]);
    });

    it('註冊表沒有 undefined 值', () => {
        for (const [name, Icon] of Object.entries(iconRegistry)) {
            expect(Icon, `iconRegistry['${name}'] 是 undefined`).toBeTruthy();
        }
    });
});

describe('B3c icon 集 — 圖形文法（渲染屬性）', () => {
    it.each(Object.entries(iconRegistry))('%s 符合基座規格', (_name, Icon) => {
        const { container, unmount } = render(<Icon />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg!.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg!.getAttribute('stroke')).toBe('currentColor');
        expect(svg!.getAttribute('fill')).toBe('none');
        expect(svg!.getAttribute('stroke-width')).toBe('2');
        expect(svg!.getAttribute('stroke-linecap')).toBe('square');
        expect(svg!.getAttribute('stroke-linejoin')).toBe('miter');
        expect(svg!.getAttribute('width')).toBe('24');
        expect(svg!.getAttribute('height')).toBe('24');
        expect(svg!.getAttribute('aria-hidden')).toBe('true');
        unmount();
    });

    it('size prop 同步控制寬高', () => {
        const Icon = iconRegistry['map'];
        const { container } = render(<Icon size={16} />);
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('width')).toBe('16');
        expect(svg.getAttribute('height')).toBe('16');
    });
});

describe('B3c icon 集 — 幾何靜態掃描（原始檔）', () => {
    const sources = readdirSync(ICONS_DIR)
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => ({ file: f, text: readFileSync(join(ICONS_DIR, f), 'utf-8') }));

    it('至少掃到 icon 原始檔', () => {
        expect(sources.length).toBeGreaterThan(0);
    });

    it.each(sources.map((s) => [s.file, s.text] as const))(
        '%s 禁曲線幾何與硬編色',
        (_file, text) => {
            // 禁圓形元素
            expect(text).not.toMatch(/<(circle|ellipse)\b/);
            // 禁 path 曲線指令：A/C/Q/S/T（掃 d="..." 內容；座標數字不含字母，安全）
            const dAttrs = [...text.matchAll(/\bd="([^"]*)"/g)].map((m) => m[1]);
            for (const d of dAttrs) {
                expect(d, `曲線指令出現在 d="${d}"`).not.toMatch(/[AaCcQqSsTt]/);
            }
            // 禁圓角
            expect(text).not.toMatch(/\brx=/);
            // 禁硬編色（stroke/fill 只准 currentColor / none；不出現 hex）
            expect(text).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        },
    );
});
