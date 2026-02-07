/**
 * API Client — Unified Token Management
 * 
 * Single Source of Truth for:
 * - Token storage (localStorage/sessionStorage)
 * - Token refresh (httpOnly cookie → new access token)
 * - 401 handling with mutex queue (one refresh, others wait)
 * 
 * @version 2.0.0 — Expert-level optimization
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 20000, // 20s for Cloud Run cold starts
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // Send httpOnly cookies
});

// ===== Token Storage (exports for AuthContext) =====

const TOKEN_KEY = 'accessToken';
const REMEMBER_KEY = 'rememberMe';

export const getStoredToken = (): string | null =>
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const storeToken = (token: string, remember: boolean = true): void => {
    if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(REMEMBER_KEY, 'true');
        sessionStorage.removeItem(TOKEN_KEY);
    } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REMEMBER_KEY);
    }
};

export const clearToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
};

// ===== Unified Token Refresh (Mutex Pattern) =====

let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh access token using httpOnly refresh_token cookie.
 * 
 * Mutex: If a refresh is already in progress, subsequent callers
 * receive the same Promise — preventing duplicate refresh requests.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
    // DevMode bypass
    if (typeof window !== 'undefined' && localStorage.getItem('devModeUser') === 'true') {
        return null;
    }

    // Mutex: reuse in-flight refresh
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/v1/auth/refresh`,
                {},
                { withCredentials: true }
            );

            if (response.data?.accessToken) {
                const remember = localStorage.getItem(REMEMBER_KEY) === 'true';
                storeToken(response.data.accessToken, remember);
                return response.data.accessToken;
            }
            return null;
        } catch {
            return null;
        } finally {
            // Release mutex after completion
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

// ===== Request Interceptor — Attach Token =====

api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ===== Response Interceptor — 401 Auto-Refresh =====

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const originalRequest = error.config;

        // Skip refresh on /auth/callback route (AuthCallbackPage handles it)
        const isCallbackRoute = window.location.pathname.startsWith('/auth/callback');

        if (status === 401 && !originalRequest._retry && !isCallbackRoute) {
            originalRequest._retry = true;

            // Attempt refresh (mutex ensures single request)
            const newToken = await refreshAccessToken();

            if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            }

            // Refresh failed — handle based on current route
            const publicPaths = ['/dashboard', '/map', '/ncdr-alerts', '/forecast', '/manuals', '/login', '/register'];
            const currentPath = window.location.pathname;
            const isPublicPath = publicPaths.some(p => currentPath.startsWith(p));

            if (!isPublicPath) {
                clearToken();
                window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
            }
        }

        if (status === 403) {
            console.warn('權限不足:', error.response?.data?.message || '無法存取此資源');
        }

        return Promise.reject(error);
    }
);

export default api;
