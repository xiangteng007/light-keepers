import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeProvider';

function renderPage(ui: React.ReactElement) {
    return render(
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>{ui}</AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

describe('PageWrapper modes', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        localStorage.clear();
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('legacy mode: renders children inside the scrollable page container', () => {
        renderPage(
            <PageWrapper pageId="governance-security">
                <div data-testid="legacy-child">Legacy page body</div>
            </PageWrapper>
        );

        expect(screen.getByTestId('legacy-child')).toBeInTheDocument();
        const container = document.querySelector('.page-content');
        expect(container).toBeInTheDocument();
        // Padding now comes from PageWrapper.css, not an inline style attribute
        expect(container?.getAttribute('style')).toBeNull();
    });

    it('widget mode: renders the widget grid for a pageId with a config', () => {
        renderPage(<PageWrapper pageId="triage" />);

        expect(document.querySelector('.widget-grid')).toBeInTheDocument();
        expect(document.querySelector('.page-content')).not.toBeInTheDocument();
    });

    it('placeholder mode: unknown pageId renders an explicit EmptyState instead of a blank shell', () => {
        renderPage(<PageWrapper pageId="not-a-configured-page" />);

        expect(screen.getByText('頁面建置中')).toBeInTheDocument();
        expect(document.querySelector('.empty-state')).toBeInTheDocument();
        expect(document.querySelector('.widget-grid')).not.toBeInTheDocument();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('not-a-configured-page')
        );
    });
});
