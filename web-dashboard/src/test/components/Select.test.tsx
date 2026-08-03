/**
 * R5/T6: design-system Select 最小測試
 * 規格：深面板包裝原生 <select>、focus＝橄欖環（lk-select--focused）、
 * 驗證錯誤走琥珀（紅色憲法：class lk-select--error，非 danger）。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../../design-system/components/Select';

const OPTIONS = [
    { value: 'north', label: '北區' },
    { value: 'south', label: '南區' },
    { value: 'closed', label: '封鎖區', disabled: true },
];

describe('design-system Select', () => {
    it('renders a labelled native select with all options', () => {
        render(<Select label="責任分區" options={OPTIONS} />);
        const select = screen.getByLabelText('責任分區');
        expect(select.tagName).toBe('SELECT');
        expect(screen.getAllByRole('option')).toHaveLength(3);
        expect(screen.getByRole('option', { name: '封鎖區' })).toBeDisabled();
    });

    it('fires onChange with the picked value', () => {
        const onChange = vi.fn();
        render(<Select label="責任分區" options={OPTIONS} onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('責任分區'), { target: { value: 'south' } });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect((screen.getByLabelText('責任分區') as HTMLSelectElement).value).toBe('south');
    });

    it('renders placeholder as a disabled empty option and starts on it', () => {
        render(<Select label="責任分區" options={OPTIONS} placeholder="請選擇分區" />);
        const placeholder = screen.getByRole('option', { name: '請選擇分區' }) as HTMLOptionElement;
        expect(placeholder.value).toBe('');
        expect(placeholder).toBeDisabled();
        expect((screen.getByLabelText('責任分區') as HTMLSelectElement).value).toBe('');
    });

    it('toggles the olive focus-ring state class on focus/blur', () => {
        const { container } = render(<Select label="責任分區" options={OPTIONS} />);
        const select = screen.getByLabelText('責任分區');

        fireEvent.focus(select);
        expect(container.querySelector('.lk-select')).toHaveClass('lk-select--focused');

        fireEvent.blur(select);
        expect(container.querySelector('.lk-select')).not.toHaveClass('lk-select--focused');
    });

    it('shows error text with the amber error state class (red constitution)', () => {
        const { container } = render(
            <Select label="責任分區" options={OPTIONS} helperText="輔助說明" error="必填欄位" />
        );
        expect(container.querySelector('.lk-select')).toHaveClass('lk-select--error');
        expect(screen.getByText('必填欄位')).toBeInTheDocument();
        // error 蓋掉 helperText（與 InputField 行為一致）
        expect(screen.queryByText('輔助說明')).not.toBeInTheDocument();
    });

    it('applies size and fullWidth modifier classes', () => {
        const { container } = render(
            <Select label="責任分區" options={OPTIONS} size="sm" fullWidth />
        );
        const root = container.querySelector('.lk-select');
        expect(root).toHaveClass('lk-select--sm');
        expect(root).toHaveClass('lk-select--full-width');
    });

    it('disabled select is not interactive', () => {
        render(<Select label="責任分區" options={OPTIONS} disabled />);
        expect(screen.getByLabelText('責任分區')).toBeDisabled();
    });
});
