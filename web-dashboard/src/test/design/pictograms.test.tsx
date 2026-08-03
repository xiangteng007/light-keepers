/**
 * R5/T5 主題化圖文系統煙霧測試
 * ---------------------------------------------------------------------------
 * 驗三件事：
 *   1. disasterPictogramRegistry 覆蓋災型 SSOT 全部 12 key（Record 已在編譯期
 *      窮舉，這裡再驗執行期實際可渲染）。
 *   2. B3c 圖形文法：象形 32×32／stroke 2.5；描邊章 24×24／stroke 2；
 *      square cap＋miter join；不落任何硬編色（色由 currentColor）。
 *   3. START 分級章形狀雙編碼：■／◧／□／方框帶 ×。
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
    disasterPictogramRegistry,
    triageStampRegistry,
    SolidSquareStamp,
    OutlineSquareStamp,
    CheckStamp,
    TriangleStamp,
    DotStamp,
    TriageDelayedStamp,
    TriageExpectantStamp,
} from '../../design-system/icons/pictograms';
import {
    LEGACY_DISASTER_TYPES,
    CIVIL_DEFENSE_DISASTER_TYPES,
} from '../../constants/disasterTypes';

const ALL_TYPES = [...LEGACY_DISASTER_TYPES, ...CIVIL_DEFENSE_DISASTER_TYPES];

describe('disasterPictogramRegistry', () => {
    it('covers every disaster type key in the SSOT', () => {
        expect(Object.keys(disasterPictogramRegistry).sort()).toEqual([...ALL_TYPES].sort());
    });

    it.each(ALL_TYPES)('%s renders a 32x32 stroke-2.5 B3c pictogram', (type) => {
        const Pictogram = disasterPictogramRegistry[type];
        const { container } = render(<Pictogram />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg!.getAttribute('viewBox')).toBe('0 0 32 32');
        expect(svg!.getAttribute('stroke')).toBe('currentColor');
        expect(svg!.getAttribute('stroke-width')).toBe('2.5');
        expect(svg!.getAttribute('stroke-linecap')).toBe('square');
        expect(svg!.getAttribute('stroke-linejoin')).toBe('miter');
        expect(svg!.getAttribute('fill')).toBe('none');
        // 色由 currentColor：整個標記不得出現硬編色碼
        expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });

    it('respects the size prop', () => {
        const Pictogram = disasterPictogramRegistry.earthquake;
        const { container } = render(<Pictogram size={48} />);
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('width')).toBe('48');
        expect(svg.getAttribute('height')).toBe('48');
    });
});

describe('START triage stamps', () => {
    it('registry covers RED/YELLOW/GREEN/BLACK', () => {
        expect(Object.keys(triageStampRegistry).sort()).toEqual(['BLACK', 'GREEN', 'RED', 'YELLOW']);
    });

    it('IMMEDIATE (RED) is a solid square (fill=currentColor)', () => {
        const Stamp = triageStampRegistry.RED;
        const { container } = render(<Stamp />);
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('fill')).toBe('currentColor');
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('DELAYED (YELLOW) is a half-filled square', () => {
        const { container } = render(<TriageDelayedStamp />);
        const fills = container.querySelectorAll('path[fill="currentColor"]');
        expect(fills.length).toBe(1);
        expect(container.querySelector('svg')!.getAttribute('stroke')).toBe('currentColor');
    });

    it('MINOR (GREEN) is an outline square (stroke only)', () => {
        const Stamp = triageStampRegistry.GREEN;
        const { container } = render(<Stamp />);
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('fill')).toBe('none');
        expect(svg.getAttribute('stroke')).toBe('currentColor');
    });

    it('EXPECTANT (BLACK) is a square with an X (3 paths)', () => {
        const { container } = render(<TriageExpectantStamp />);
        expect(container.querySelectorAll('path').length).toBe(3);
    });
});

describe('generic status stamps', () => {
    it.each([
        ['SolidSquareStamp', SolidSquareStamp, 'currentColor'],
        ['OutlineSquareStamp', OutlineSquareStamp, 'none'],
        ['CheckStamp', CheckStamp, 'none'],
        ['TriangleStamp', TriangleStamp, 'currentColor'],
        ['DotStamp', DotStamp, 'currentColor'],
    ] as const)('%s renders 24x24 with expected fill mode', (_name, Stamp, fill) => {
        const { container } = render(<Stamp />);
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg.getAttribute('fill')).toBe(fill);
        expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
});
