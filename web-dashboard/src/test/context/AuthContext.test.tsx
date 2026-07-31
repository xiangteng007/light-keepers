/**
 * FE-5: Unit tests for src/context/AuthContext.tsx
 *
 * Covers the core auth flow:
 * - Anonymous boot (no token, silent refresh fails) -> user null, authReady true
 * - DevMode boot -> fixed Level 5 dev user, no network calls
 * - login(token) -> stores token, fetches profile, sets user + isAuthenticated
 * - logout() -> calls logout API, clears token, resets user to null even if API fails
 *
 * api/services and api/client are mocked so no real network/localStorage
 * logic from those modules is exercised here (that's covered separately in
 * src/test/api/client.test.ts) — this file focuses on AuthProvider's own
 * state machine.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

const mockGetProfile = vi.fn();
const mockApiLogout = vi.fn();
vi.mock('../../api/services', () => ({
    getProfile: () => mockGetProfile(),
    logout: () => mockApiLogout(),
}));

// Stateful stand-in for the real token store (api/client.ts), so that
// storeToken() -> getStoredToken() round-trips the way AuthProvider expects
// during its login flow. Spies wrap the state so call assertions still work.
let storedTokenState: string | null = null;
const mockGetStoredToken = vi.fn<() => string | null>(() => storedTokenState);
const mockStoreToken = vi.fn((token: string) => { storedTokenState = token; });
const mockClearToken = vi.fn(() => { storedTokenState = null; });
const mockRefreshAccessToken = vi.fn<() => Promise<string | null>>();
vi.mock('../../api/client', () => ({
    getStoredToken: () => mockGetStoredToken(),
    storeToken: (...args: [string, boolean?]) => mockStoreToken(...args),
    clearToken: () => mockClearToken(),
    refreshAccessToken: () => mockRefreshAccessToken(),
}));

// src/test/setup.ts installs a global localStorage stub whose getItem()
// always returns null, so it can't reflect setItem() calls (needed for the
// devModeUser DevMode check). Swap in a real stateful in-memory version.
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

function TestConsumer() {
    const { user, isAuthenticated, isAnonymous, isLoading, authReady, login, logout } = useAuth();
    return (
        <div>
            <div data-testid="loading">{String(isLoading)}</div>
            <div data-testid="ready">{String(authReady)}</div>
            <div data-testid="authenticated">{String(isAuthenticated)}</div>
            <div data-testid="anonymous">{String(isAnonymous)}</div>
            <div data-testid="user-email">{user?.email ?? 'none'}</div>
            <div data-testid="user-level">{user?.roleLevel ?? 'none'}</div>
            <button onClick={() => login('new-token', true)}>login</button>
            <button onClick={() => logout()}>logout</button>
        </div>
    );
}

function renderAuth() {
    return render(
        <AuthProvider>
            <TestConsumer />
        </AuthProvider>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        storedTokenState = null;
        // Restore the stateful default implementation in case a previous
        // test overrode it with a one-off mockReturnValue/mockResolvedValue.
        mockGetStoredToken.mockImplementation(() => storedTokenState);
        mockStoreToken.mockImplementation((token: string) => { storedTokenState = token; });
        mockClearToken.mockImplementation(() => { storedTokenState = null; });
        mockRefreshAccessToken.mockResolvedValue(null);
        mockGetProfile.mockResolvedValue({ data: null });
        mockApiLogout.mockResolvedValue({ data: {} });
    });

    it('boots to an unauthenticated, ready state when there is no token and silent refresh fails', async () => {
        renderAuth();

        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        expect(screen.getByTestId('authenticated').textContent).toBe('false');
        expect(screen.getByTestId('anonymous').textContent).toBe('true');
        expect(screen.getByTestId('user-email').textContent).toBe('none');
        expect(mockGetProfile).not.toHaveBeenCalled();
    });

    it('DevMode: boots to a fixed Level 5 user without calling the network', async () => {
        localStorage.setItem('devModeUser', 'true');
        renderAuth();

        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        expect(screen.getByTestId('authenticated').textContent).toBe('true');
        expect(screen.getByTestId('user-level').textContent).toBe('5');
        expect(mockGetProfile).not.toHaveBeenCalled();
        expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    });

    it('boots directly from an existing stored token (skips silent refresh)', async () => {
        mockGetStoredToken.mockReturnValue('existing-token');
        mockGetProfile.mockResolvedValue({
            data: { id: 'u1', email: 'volunteer@example.com', roleLevel: 1, roleDisplayName: '志工' },
        });

        renderAuth();

        await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));

        expect(mockRefreshAccessToken).not.toHaveBeenCalled();
        expect(screen.getByTestId('user-email').textContent).toBe('volunteer@example.com');
    });

    it('login(token) stores the token and populates user state from the profile', async () => {
        renderAuth();
        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        mockGetProfile.mockResolvedValue({
            data: { id: 'u2', email: 'officer@example.com', roleLevel: 2, roleDisplayName: '幹部' },
        });

        await act(async () => {
            screen.getByText('login').click();
        });

        expect(mockStoreToken).toHaveBeenCalledWith('new-token', true);
        await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));
        expect(screen.getByTestId('user-email').textContent).toBe('officer@example.com');
        expect(screen.getByTestId('user-level').textContent).toBe('2');
    });

    it('logout() clears the token and resets user state to null', async () => {
        mockGetStoredToken.mockReturnValue('existing-token');
        mockGetProfile.mockResolvedValue({
            data: { id: 'u3', email: 'chief@example.com', roleLevel: 3, roleDisplayName: '常務理事' },
        });
        renderAuth();
        await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));

        await act(async () => {
            screen.getByText('logout').click();
        });

        expect(mockApiLogout).toHaveBeenCalled();
        expect(mockClearToken).toHaveBeenCalled();
        await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
        expect(screen.getByTestId('user-email').textContent).toBe('none');
    });

    it('logout() still clears local state even if the logout API call fails', async () => {
        mockGetStoredToken.mockReturnValue('existing-token');
        mockGetProfile.mockResolvedValue({
            data: { id: 'u4', email: 'owner@example.com', roleLevel: 5, roleDisplayName: '系統擁有者' },
        });
        mockApiLogout.mockRejectedValue(new Error('network down'));
        renderAuth();
        await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));

        await act(async () => {
            screen.getByText('logout').click();
        });

        expect(mockClearToken).toHaveBeenCalled();
        await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    });

    it('useAuth throws when used outside an AuthProvider', () => {
        const OutsideConsumer = () => {
            useAuth();
            return null;
        };
        // Suppress the expected React error boundary console noise for this assertion.
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<OutsideConsumer />)).toThrow('useAuth must be used within an AuthProvider');
        spy.mockRestore();
    });
});
