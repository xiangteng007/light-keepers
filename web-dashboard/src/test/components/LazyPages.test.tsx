/**
 * FE-5: Unit tests for src/components/lazy/LazyPages.tsx
 *
 * We exercise the `lazyWithSuspense` helper directly with a controllable
 * dynamic import (rather than the ~60 concrete page imports it wraps), so
 * the test is decoupled from any individual page's own dependency tree and
 * focuses on the actual contract: show a skeleton fallback while the chunk
 * loads, then render the resolved component (with props forwarded) once it
 * settles.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { lazyWithSuspense } from '../../components/lazy/LazyPages';

function deferredImport<T>(value: T, delayMs = 0) {
    return () =>
        new Promise<{ default: T }>((resolve) => {
            setTimeout(() => resolve({ default: value }), delayMs);
        });
}

describe('lazyWithSuspense', () => {
    it('shows the skeleton fallback while the module is loading', async () => {
        const FakePage = () => <div data-testid="fake-page">Loaded</div>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const LazyFake = lazyWithSuspense(deferredImport(FakePage, 20) as any);

        render(<LazyFake />);

        // Fallback renders synchronously before the chunk resolves.
        expect(document.querySelector('.page-loading-fallback')).toBeInTheDocument();
        expect(screen.queryByTestId('fake-page')).not.toBeInTheDocument();

        await waitFor(() => expect(screen.getByTestId('fake-page')).toBeInTheDocument());
        expect(document.querySelector('.page-loading-fallback')).not.toBeInTheDocument();
    });

    it('renders the resolved component and forwards props once loaded', async () => {
        const FakePage = ({ label }: { label: string }) => <div data-testid="fake-page">{label}</div>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const LazyFake = lazyWithSuspense(deferredImport(FakePage) as any);

        render(<LazyFake label="hello from props" />);

        await waitFor(() => expect(screen.getByTestId('fake-page')).toBeInTheDocument());
        expect(screen.getByText('hello from props')).toBeInTheDocument();
    });
});
