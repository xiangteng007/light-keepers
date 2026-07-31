/**
 * FE-5: Unit tests for src/components/ProtectedRoute.tsx
 *
 * Focused, direct unit tests of the `requiredLevel` gating logic (six-tier
 * RBAC, levels 0-5). Complements the broader integration-style coverage in
 * src/test/navigation/NavigationRegression.test.tsx by asserting the
 * concrete rendered output for each branch:
 * - authReady=false -> busy placeholder (no redirect decision yet)
 * - devMode -> bypasses all checks
 * - requiredLevel=0 -> public, always renders children
 * - unauthenticated + requiredLevel>=1 -> redirect to /login
 * - authenticated but under-leveled -> renders inline "access denied" (403), no redirect
 * - authenticated and sufficiently leveled -> renders children
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';

type MockUser = { roleLevel: number; roleDisplayName: string } | null;

let mockAuthState: {
    isAuthenticated: boolean;
    user: MockUser;
    authReady: boolean;
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockAuthState,
}));

// src/test/setup.ts installs a global localStorage stub whose getItem()
// always returns null, so it can't reflect setItem() calls made here. Swap
// in a real stateful in-memory implementation for the DevMode check.
function createStatefulStorage() {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        key: () => null,
        get length() { return Object.keys(store).length; },
    };
}
Object.defineProperty(window, 'localStorage', { value: createStatefulStorage(), configurable: true });

function renderProtected(requiredLevel: number, initialPath = '/protected') {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                <Route
                    path="/protected"
                    element={
                        <ProtectedRoute requiredLevel={requiredLevel}>
                            <div data-testid="protected-content">Secret</div>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </MemoryRouter>
    );
}

describe('ProtectedRoute', () => {
    beforeEach(() => {
        localStorage.clear();
        mockAuthState = { isAuthenticated: false, user: null, authReady: true };
    });

    it('shows a busy placeholder (no redirect) while auth is not ready yet', () => {
        mockAuthState = { isAuthenticated: false, user: null, authReady: false };
        renderProtected(1);

        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.getByLabelText('正在驗證身份...')).toBeInTheDocument();
    });

    it('bypasses all checks in DevMode, even while auth is not ready', () => {
        localStorage.setItem('devModeUser', 'true');
        mockAuthState = { isAuthenticated: false, user: null, authReady: false };
        renderProtected(5);

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('requiredLevel=0 (public) renders children for anonymous visitors', () => {
        mockAuthState = { isAuthenticated: false, user: null, authReady: true };
        renderProtected(0);

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects unauthenticated users to /login for requiredLevel>=1', () => {
        mockAuthState = { isAuthenticated: false, user: null, authReady: true };
        renderProtected(1);

        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('shows inline "access denied" (403) — not a redirect — when the user level is too low', () => {
        mockAuthState = {
            isAuthenticated: true,
            user: { roleLevel: 1, roleDisplayName: '志工' },
            authReady: true,
        };
        renderProtected(3);

        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.getByText('權限不足')).toBeInTheDocument();
        expect(screen.getByText('志工', { exact: false })).toBeInTheDocument();
    });

    it('renders children when the user level exactly meets requiredLevel', () => {
        mockAuthState = {
            isAuthenticated: true,
            user: { roleLevel: 3, roleDisplayName: '常務理事' },
            authReady: true,
        };
        renderProtected(3);

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('renders children when the user level exceeds requiredLevel', () => {
        mockAuthState = {
            isAuthenticated: true,
            user: { roleLevel: 5, roleDisplayName: '系統擁有者' },
            authReady: true,
        };
        renderProtected(1);

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
});
