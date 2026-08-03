/**
 * R5/T6: design-system Tabs 最小測試
 * 規格：作用態＝底緣 3px 橄欖閂（class lk-tabs__tab--active）、
 * WAI-ARIA tablist／自動觸發鍵盤模式、disabled 不可觸發。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from '../../design-system/components/Tabs';

const ITEMS = [
    { key: 'all', label: '全部' },
    { key: 'red', label: '危急' },
    { key: 'done', label: '已結', disabled: true },
];

describe('design-system Tabs', () => {
    it('renders a tablist with one tab per item', () => {
        render(<Tabs items={ITEMS} aria-label="檢傷分級" />);
        expect(screen.getByRole('tablist', { name: '檢傷分級' })).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('defaults to the first enabled item; active tab carries aria-selected + latch class', () => {
        render(<Tabs items={ITEMS} />);
        const first = screen.getByRole('tab', { name: '全部' });
        expect(first).toHaveAttribute('aria-selected', 'true');
        expect(first).toHaveClass('lk-tabs__tab--active');
        expect(screen.getByRole('tab', { name: '危急' })).toHaveAttribute('aria-selected', 'false');
    });

    it('respects defaultActiveKey (uncontrolled) and switches on click, firing onChange', () => {
        const onChange = vi.fn();
        render(<Tabs items={ITEMS} defaultActiveKey="red" onChange={onChange} />);
        expect(screen.getByRole('tab', { name: '危急' })).toHaveClass('lk-tabs__tab--active');

        fireEvent.click(screen.getByRole('tab', { name: '全部' }));
        expect(onChange).toHaveBeenCalledWith('all');
        expect(screen.getByRole('tab', { name: '全部' })).toHaveClass('lk-tabs__tab--active');
    });

    it('controlled mode: activeKey wins and clicking only reports via onChange', () => {
        const onChange = vi.fn();
        render(<Tabs items={ITEMS} activeKey="all" onChange={onChange} />);

        fireEvent.click(screen.getByRole('tab', { name: '危急' }));
        expect(onChange).toHaveBeenCalledWith('red');
        // 未由外部改 activeKey，作用態不動
        expect(screen.getByRole('tab', { name: '全部' })).toHaveClass('lk-tabs__tab--active');
        expect(screen.getByRole('tab', { name: '危急' })).not.toHaveClass('lk-tabs__tab--active');
    });

    it('disabled tab is not activatable', () => {
        const onChange = vi.fn();
        render(<Tabs items={ITEMS} onChange={onChange} />);
        const disabledTab = screen.getByRole('tab', { name: '已結' });
        expect(disabledTab).toBeDisabled();
        fireEvent.click(disabledTab);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('ArrowRight moves activation to the next enabled tab (skipping disabled, wrapping)', () => {
        render(<Tabs items={ITEMS} />);
        const tablist = screen.getByRole('tablist');

        fireEvent.keyDown(tablist, { key: 'ArrowRight' });
        expect(screen.getByRole('tab', { name: '危急' })).toHaveClass('lk-tabs__tab--active');

        // 下一個是 disabled 的「已結」→ 跳過並繞回「全部」
        fireEvent.keyDown(tablist, { key: 'ArrowRight' });
        expect(screen.getByRole('tab', { name: '全部' })).toHaveClass('lk-tabs__tab--active');
    });

    it('only the active tab is in the tab order (roving tabindex)', () => {
        render(<Tabs items={ITEMS} />);
        expect(screen.getByRole('tab', { name: '全部' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('tab', { name: '危急' })).toHaveAttribute('tabindex', '-1');
    });
});
