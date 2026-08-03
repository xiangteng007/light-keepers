/**
 * R5/T5: 地圖符號 B3c 圖形文法守護
 *
 * 守住 src/design-system/icons/map-symbols/ 的鐵律：
 * - viewBox 28×28、stroke 2、linecap square、linejoin miter
 * - 預設 stroke="currentColor" fill="none"（色由使用端決定）
 * - 每枚 3–7 筆畫內完成（含外框）
 * - toDataUri(color) 產出 encodeURIComponent 的 data:image/svg+xml，
 *   色值來自呼叫端、不殘留 currentColor
 * 新增符號登記進 MAP_SYMBOL_IDS / mapSymbolRegistry 後自動被本測試涵蓋。
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
    MAP_SYMBOL_IDS,
    MAP_SYMBOL_VIEWBOX,
    mapSymbolRegistry,
} from '../../design-system/icons/map-symbols';

const DATA_URI_PREFIX = 'data:image/svg+xml;charset=utf-8,';

describe('map-symbols (R5/T5): B3c 圖形文法守護', () => {
    it('registry 收錄全部 10 枚符號，id 與 MAP_SYMBOL_IDS 一致', () => {
        expect(MAP_SYMBOL_IDS).toHaveLength(10);
        expect(Object.keys(mapSymbolRegistry).sort()).toEqual([...MAP_SYMBOL_IDS].sort());
        for (const id of MAP_SYMBOL_IDS) {
            expect(mapSymbolRegistry[id].id).toBe(id);
            expect(mapSymbolRegistry[id].label.length).toBeGreaterThan(0);
        }
    });

    it.each([...MAP_SYMBOL_IDS])(
        '%s：React 元件 28×28 / stroke 2 / square / miter / currentColor',
        (id) => {
            const { Component } = mapSymbolRegistry[id];
            const { container } = render(<Component />);
            const svg = container.querySelector('svg');
            expect(svg).not.toBeNull();
            expect(svg!.getAttribute('viewBox')).toBe(
                `0 0 ${MAP_SYMBOL_VIEWBOX} ${MAP_SYMBOL_VIEWBOX}`
            );
            expect(svg!.getAttribute('stroke-width')).toBe('2');
            expect(svg!.getAttribute('stroke-linecap')).toBe('square');
            expect(svg!.getAttribute('stroke-linejoin')).toBe('miter');
            expect(svg!.getAttribute('stroke')).toBe('currentColor');
            expect(svg!.getAttribute('fill')).toBe('none');

            // 3–7 筆畫內完成（含外框；最少 2 = 外框＋圖徽）
            const marks = svg!.querySelectorAll('path, circle, rect, line, polyline, polygon');
            expect(marks.length).toBeGreaterThanOrEqual(2);
            expect(marks.length).toBeLessThanOrEqual(7);
        }
    );

    it.each([...MAP_SYMBOL_IDS])(
        '%s：toDataUri 產出 encodeURIComponent 的 svg data uri，色由使用端決定',
        (id) => {
            const uri = mapSymbolRegistry[id].toDataUri('rgb(195, 155, 111)');
            expect(uri.startsWith(DATA_URI_PREFIX)).toBe(true);

            const svgText = decodeURIComponent(uri.slice(DATA_URI_PREFIX.length));
            expect(svgText).toContain(`viewBox="0 0 ${MAP_SYMBOL_VIEWBOX} ${MAP_SYMBOL_VIEWBOX}"`);
            expect(svgText).toContain('stroke="rgb(195, 155, 111)"');
            expect(svgText).toContain('stroke-linecap="square"');
            expect(svgText).toContain('stroke-linejoin="miter"');
            expect(svgText).not.toContain('currentColor');
        }
    );

    it('size prop 控制輸出尺寸，預設 28', () => {
        const { Component } = mapSymbolRegistry.sos;
        const scaled = render(<Component size={56} />);
        const scaledSvg = scaled.container.querySelector('svg')!;
        expect(scaledSvg.getAttribute('width')).toBe('56');
        expect(scaledSvg.getAttribute('height')).toBe('56');

        const plain = render(<Component />);
        const plainSvg = plain.container.querySelector('svg')!;
        expect(plainSvg.getAttribute('width')).toBe('28');
        expect(plainSvg.getAttribute('height')).toBe('28');
    });

    it('實心變體才用 fill：solid 筆畫 fill=色、stroke=none（以 sos 閃電驗證）', () => {
        const { container } = render(<mapSymbolRegistry.sos.Component />);
        const solidMarks = container.querySelectorAll('svg [fill="currentColor"]');
        expect(solidMarks.length).toBeGreaterThanOrEqual(1);
        solidMarks.forEach((el) => {
            expect(el.getAttribute('stroke')).toBe('none');
        });
    });
});
