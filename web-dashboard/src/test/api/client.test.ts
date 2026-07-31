/**
 * FE-5: Unit tests for src/api/client.ts
 *
 * Covers:
 * - Token storage helpers (localStorage vs sessionStorage, remember-me)
 * - Request interceptor: attaches Authorization header when a token exists
 * - refreshAccessToken: devMode bypass, success, failure, and mutex
 *   (concurrent callers share a single in-flight refresh request)
 * - Response interceptor: 401 -> refresh -> retry, 401 with failed refresh
 *   -> clears token + redirects (except on public/callback paths), 403 -> warn+reject
 *
 * NOTE: src/test/setup.ts installs a *global* axios mock whose `create()`
 * returns a plain (non-callable) object. The response interceptor in
 * client.ts calls `api(originalRequest)` to retry a request, which requires
 * the mocked instance to be callable. This file installs its own local
 * `vi.mock('axios', ...)` (hoisted above imports, so it wins for this file)
 * with a callable mock instance, so the interceptor logic can be exercised
 * faithfully without hitting the network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type AnyFn = (...args: unknown[]) => unknown;

// Callable mock axios instance returned by axios.create()
const mockApiInstance = vi.fn((config: unknown) =>
    Promise.resolve({ data: {}, config })
) as unknown as AnyFn & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    interceptors: {
        request: { use: ReturnType<typeof vi.fn>; eject: ReturnType<typeof vi.fn> };
        response: { use: ReturnType<typeof vi.fn>; eject: ReturnType<typeof vi.fn> };
    };
};
mockApiInstance.get = vi.fn(() => Promise.resolve({ data: {} }));
mockApiInstance.post = vi.fn(() => Promise.resolve({ data: {} }));
mockApiInstance.put = vi.fn(() => Promise.resolve({ data: {} }));
mockApiInstance.delete = vi.fn(() => Promise.resolve({ data: {} }));
mockApiInstance.interceptors = {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
};

const mockAxiosPost = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock('axios', () => ({
    default: {
        create: vi.fn(() => mockApiInstance),
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: (...args: unknown[]) => mockAxiosPost(...args),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() },
        },
    },
    AxiosError: class AxiosError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'AxiosError';
        }
    },
}));

// Simple in-memory localStorage/sessionStorage mock (overrides the global
// stub from src/test/setup.ts, which always returns null).
function createStorageMock() {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn(() => null),
    };
}

describe('api/client.ts', () => {
    let localStorageMock: ReturnType<typeof createStorageMock>;
    let sessionStorageMock: ReturnType<typeof createStorageMock>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        localStorageMock = createStorageMock();
        sessionStorageMock = createStorageMock();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
        Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, configurable: true });

        Object.defineProperty(window, 'location', {
            value: {
                pathname: '/dashboard',
                search: '',
                hash: '',
                href: '',
                origin: 'http://localhost:3000',
            },
            writable: true,
            configurable: true,
        });

        client = await import('../../api/client');
    });

    describe('token storage helpers', () => {
        it('storeToken(remember=true) writes to localStorage and clears sessionStorage', () => {
            client.storeToken('abc123', true);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'abc123');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('rememberMe', 'true');
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
        });

        it('storeToken(remember=false) writes to sessionStorage and clears localStorage', () => {
            client.storeToken('xyz789', false);
            expect(sessionStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'xyz789');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('rememberMe');
        });

        it('getStoredToken prefers localStorage over sessionStorage', () => {
            localStorageMock.setItem('accessToken', 'from-local');
            sessionStorageMock.setItem('accessToken', 'from-session');
            expect(client.getStoredToken()).toBe('from-local');
        });

        it('getStoredToken falls back to sessionStorage when localStorage is empty', () => {
            sessionStorageMock.setItem('accessToken', 'from-session');
            expect(client.getStoredToken()).toBe('from-session');
        });

        it('getStoredToken returns null when no token is stored', () => {
            expect(client.getStoredToken()).toBeNull();
        });

        it('clearToken removes token + rememberMe from both storages', () => {
            client.storeToken('abc123', true);
            client.clearToken();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('rememberMe');
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
        });
    });

    describe('request interceptor', () => {
        it('attaches Authorization header when a token is stored', () => {
            client.storeToken('my-token', true);

            const requestInterceptor = mockApiInstance.interceptors.request.use.mock.calls[0][0];
            const config = requestInterceptor({ headers: {} });

            expect(config.headers.Authorization).toBe('Bearer my-token');
        });

        it('does not attach Authorization header when no token is stored', () => {
            const requestInterceptor = mockApiInstance.interceptors.request.use.mock.calls[0][0];
            const config = requestInterceptor({ headers: {} });

            expect(config.headers.Authorization).toBeUndefined();
        });
    });

    describe('refreshAccessToken', () => {
        it('returns null immediately in devMode without calling the network', async () => {
            localStorageMock.setItem('devModeUser', 'true');
            const token = await client.refreshAccessToken();
            expect(token).toBeNull();
            expect(mockAxiosPost).not.toHaveBeenCalled();
        });

        it('stores and returns the new access token on success', async () => {
            mockAxiosPost.mockResolvedValueOnce({ data: { accessToken: 'new-token' } });
            localStorageMock.setItem('rememberMe', 'true');

            const token = await client.refreshAccessToken();

            expect(token).toBe('new-token');
            expect(mockAxiosPost).toHaveBeenCalledWith(
                expect.stringContaining('/auth/refresh'),
                {},
                { withCredentials: true }
            );
            expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'new-token');
        });

        it('returns null when the refresh call fails', async () => {
            mockAxiosPost.mockRejectedValueOnce(new Error('network error'));
            const token = await client.refreshAccessToken();
            expect(token).toBeNull();
        });

        it('returns null when the response has no accessToken', async () => {
            mockAxiosPost.mockResolvedValueOnce({ data: {} });
            const token = await client.refreshAccessToken();
            expect(token).toBeNull();
        });

        it('mutex: concurrent callers share a single in-flight refresh request', async () => {
            let resolvePost: (value: unknown) => void;
            mockAxiosPost.mockImplementationOnce(
                () => new Promise((resolve) => { resolvePost = resolve; })
            );

            const p1 = client.refreshAccessToken();
            const p2 = client.refreshAccessToken();

            expect(mockAxiosPost).toHaveBeenCalledTimes(1);

            resolvePost!({ data: { accessToken: 'shared-token' } });
            const [t1, t2] = await Promise.all([p1, p2]);

            expect(t1).toBe('shared-token');
            expect(t2).toBe('shared-token');
        });

        it('releases the mutex after completion, allowing a later refresh to hit the network again', async () => {
            mockAxiosPost.mockResolvedValueOnce({ data: { accessToken: 'first' } });
            await client.refreshAccessToken();

            mockAxiosPost.mockResolvedValueOnce({ data: { accessToken: 'second' } });
            const token = await client.refreshAccessToken();

            expect(mockAxiosPost).toHaveBeenCalledTimes(2);
            expect(token).toBe('second');
        });
    });

    describe('response interceptor (401 auto-refresh)', () => {
        it('passes successful responses through unchanged', () => {
            const successHandler = mockApiInstance.interceptors.response.use.mock.calls[0][0];
            const response = { data: 'ok' };
            expect(successHandler(response)).toBe(response);
        });

        it('on 401, refreshes the token and retries the original request with the new token', async () => {
            mockAxiosPost.mockResolvedValueOnce({ data: { accessToken: 'refreshed-token' } });

            const errorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
            const originalRequest: { headers: Record<string, string>; _retry?: boolean } = { headers: {} };
            const error = { response: { status: 401 }, config: originalRequest };

            await errorHandler(error);

            expect(originalRequest._retry).toBe(true);
            expect(originalRequest.headers.Authorization).toBe('Bearer refreshed-token');
            expect(mockApiInstance).toHaveBeenCalledWith(originalRequest);
        });

        it('on 401 with failed refresh on a protected path, clears the token and redirects to /login', async () => {
            mockAxiosPost.mockRejectedValueOnce(new Error('refresh failed'));
            window.location.pathname = '/volunteers';

            const errorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
            const originalRequest = { headers: {} };
            const error = { response: { status: 401 }, config: originalRequest };

            await expect(errorHandler(error)).rejects.toBe(error);

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
            expect(window.location.href).toContain('/login');
        });

        it('on 401 with failed refresh on a public path, does not clear the token or redirect', async () => {
            mockAxiosPost.mockRejectedValueOnce(new Error('refresh failed'));
            window.location.pathname = '/dashboard';

            const errorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
            const originalRequest = { headers: {} };
            const error = { response: { status: 401 }, config: originalRequest };

            const removeItemCallsBefore = localStorageMock.removeItem.mock.calls.length;
            await expect(errorHandler(error)).rejects.toBe(error);

            expect(localStorageMock.removeItem.mock.calls.length).toBe(removeItemCallsBefore);
            expect(window.location.href).toBe('');
        });

        it('does not attempt refresh twice for the same request (_retry guard)', async () => {
            const errorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
            const originalRequest = { headers: {}, _retry: true };
            const error = { response: { status: 401 }, config: originalRequest };

            await expect(errorHandler(error)).rejects.toBe(error);
            expect(mockAxiosPost).not.toHaveBeenCalled();
        });

        it('skips refresh on the /auth/callback route', async () => {
            window.location.pathname = '/auth/callback';
            const errorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
            const originalRequest = { headers: {} };
            const error = { response: { status: 401 }, config: originalRequest };

            await expect(errorHandler(error)).rejects.toBe(error);
            expect(mockAxiosPost).not.toHaveBeenCalled();
        });

        it('on 403, rejects without attempting a refresh', async () => {
            const errorHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
            const error = { response: { status: 403, data: { message: 'forbidden' } }, config: { headers: {} } };

            await expect(errorHandler(error)).rejects.toBe(error);
            expect(mockAxiosPost).not.toHaveBeenCalled();
        });
    });
});
