/**
 * FE-5: Unit tests for src/components/shared/EmptyState.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../../components/shared/EmptyState';

describe('EmptyState', () => {
    it('renders the title', () => {
        render(<EmptyState title="沒有資料" />);
        expect(screen.getByText('沒有資料')).toBeInTheDocument();
    });

    it('renders the description only when provided', () => {
        const { rerender } = render(<EmptyState title="沒有資料" />);
        expect(screen.queryByText('目前沒有可顯示的項目')).not.toBeInTheDocument();

        rerender(<EmptyState title="沒有資料" description="目前沒有可顯示的項目" />);
        expect(screen.getByText('目前沒有可顯示的項目')).toBeInTheDocument();
    });

    it('applies the variant class name (defaults to "default")', () => {
        const { container, rerender } = render(<EmptyState title="t" />);
        expect(container.querySelector('.empty-state--default')).toBeInTheDocument();

        rerender(<EmptyState title="t" variant="error" />);
        expect(container.querySelector('.empty-state--error')).toBeInTheDocument();
    });

    it('renders an action button and fires onClick when provided', () => {
        const onClick = vi.fn();
        render(<EmptyState title="t" action={{ label: '重試', onClick }} />);

        const button = screen.getByRole('button', { name: '重試' });
        fireEvent.click(button);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not render an action button when none is provided', () => {
        render(<EmptyState title="t" />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('appends a custom className alongside the variant class', () => {
        const { container } = render(<EmptyState title="t" className="my-extra-class" />);
        const root = container.querySelector('.empty-state');
        expect(root).toHaveClass('empty-state--default');
        expect(root).toHaveClass('my-extra-class');
    });
});
