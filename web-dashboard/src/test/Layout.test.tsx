import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppShellLayout from '../components/layout/AppShellLayout';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeProvider';
import { PermissionLevel } from '../components/layout/widget.types';

function renderShell(ui: React.ReactElement) {
    return render(
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>{ui}</AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

describe('AppShellLayout Component', () => {
    beforeEach(() => {
        // setup.ts 將 localStorage 全域 mock 成永遠回 null；每個測試前重置
        vi.mocked(window.localStorage.getItem).mockReset().mockReturnValue(null);
    });

    it('renders the header with LIGHTKEEPERS branding', () => {
        renderShell(
            <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                <div>Test Content</div>
            </AppShellLayout>
        );

        expect(screen.getByText('LIGHTKEEPERS')).toBeInTheDocument();
    });

    it('renders the sidebar navigation', () => {
        renderShell(
            <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                <div>Test Content</div>
            </AppShellLayout>
        );

        const sidebar = document.querySelector('.sidebar');
        expect(sidebar).toBeInTheDocument();
    });

    it('renders child content correctly', () => {
        renderShell(
            <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                <div data-testid="test-content">Hello World</div>
            </AppShellLayout>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    // ── R1 / FE-7：雙模式 ──
    it('defaults to normal mode (data-app-mode="normal")', () => {
        renderShell(
            <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                <div>Content</div>
            </AppShellLayout>
        );

        const root = document.querySelector('.appShellLayout');
        expect(root).toHaveAttribute('data-app-mode', 'normal');
    });

    it('enters emergency mode via manual override and shows the mode badge', () => {
        vi.mocked(window.localStorage.getItem).mockImplementation(
            (key: string) => (key === 'lk-app-mode-override' ? 'emergency' : null)
        );

        renderShell(
            <AppShellLayout userLevel={PermissionLevel.SystemOwner} pageId="test">
                <div>Content</div>
            </AppShellLayout>
        );

        const root = document.querySelector('.appShellLayout');
        expect(root).toHaveAttribute('data-app-mode', 'emergency');
        // header 顯示災時模式徽章
        expect(screen.getByText(/災時模式/)).toBeInTheDocument();
        // 側欄收斂為應變核心扁平清單
        expect(document.querySelector('.sidebar__nav--emergency')).toBeInTheDocument();
    });

    // ── R1 / FE-7：角色分層殼 ──
    it('volunteer (L1) gets the flat task-oriented shell (no group tree, simple density)', () => {
        renderShell(
            <AppShellLayout userLevel={PermissionLevel.Volunteer} pageId="test">
                <div>Content</div>
            </AppShellLayout>
        );

        const root = document.querySelector('.appShellLayout');
        expect(root).toHaveAttribute('data-density', 'simple');
        // 志工殼是扁平清單：沒有群組樹 header
        expect(document.querySelector('.sidebar .sidebar__group-header')).not.toBeInTheDocument();
        // 但有導覽項目
        expect(document.querySelectorAll('.sidebar .sidebar__item').length).toBeGreaterThan(0);
    });

    it('supervisor (L2+) gets the grouped management shell (dense density)', () => {
        renderShell(
            <AppShellLayout userLevel={PermissionLevel.Supervisor} pageId="test">
                <div>Content</div>
            </AppShellLayout>
        );

        const root = document.querySelector('.appShellLayout');
        expect(root).toHaveAttribute('data-density', 'dense');
        expect(document.querySelectorAll('.sidebar .sidebar__group-header').length).toBeGreaterThan(0);
    });

    it('shows the manual emergency-mode toggle only for L2+', () => {
        const { unmount } = renderShell(
            <AppShellLayout userLevel={PermissionLevel.Volunteer} pageId="test">
                <div>Content</div>
            </AppShellLayout>
        );
        expect(document.querySelector('.header__mode-toggle')).not.toBeInTheDocument();
        unmount();

        renderShell(
            <AppShellLayout userLevel={PermissionLevel.Supervisor} pageId="test">
                <div>Content</div>
            </AppShellLayout>
        );
        expect(document.querySelector('.header__mode-toggle')).toBeInTheDocument();
    });
});
