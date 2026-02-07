/**
 * AuthContext — Authentication State Management
 * 
 * Responsibilities:
 * - User state management (login/logout/refresh)
 * - Auth Ready gating (prevents premature redirects)
 * - Auto-refresh timer for long sessions
 * 
 * Token operations delegated to api/client.ts (Single Source of Truth)
 * 
 * @version 2.0.0 — Expert-level optimization
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { getProfile, logout as apiLogout } from '../api/services';
import { getStoredToken, storeToken, clearToken, refreshAccessToken } from '../api/client';
import { authLogger } from '../utils/logger';

// 使用者資訊介面
export interface User {
    id: string;
    email: string;
    displayName?: string;
    roles?: string[];
    roleLevel: number;
    roleDisplayName: string;
    avatarUrl?: string;
    lineLinked?: boolean;
    googleLinked?: boolean;
    isAnonymous?: boolean;
    volunteerProfileCompleted?: boolean;
}

// Auth Context 介面
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isAnonymous: boolean;
    isLoading: boolean;
    authReady: boolean;
    login: (token: string, remember?: boolean) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// DevMode 檢查
const isDevMode = (): boolean =>
    typeof window !== 'undefined' && localStorage.getItem('devModeUser') === 'true';

// DevMode 模擬用戶
const DEV_USER: User = {
    id: 'dev-user-001',
    email: 'xiangteng007@gmail.com',
    displayName: '開發測試用戶',
    roles: ['系統擁有者'],
    roleLevel: 5,
    roleDisplayName: '系統擁有者',
    isAnonymous: false,
    volunteerProfileCompleted: true,
};

// AuthProvider 元件
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(!isDevMode());
    const loadingRef = useRef(false); // Prevent concurrent loadUser calls

    // 載入使用者資訊（simplified — 401 refresh delegated to API client interceptor）
    const loadUser = useCallback(async () => {
        // Prevent concurrent calls
        if (loadingRef.current) return;
        loadingRef.current = true;

        try {
            // DevMode bypass
            if (isDevMode()) {
                authLogger.debug('DEV MODE: Using mock Level 5 user');
                setUser(DEV_USER);
                setIsLoading(false);
                return;
            }

            let token = getStoredToken();

            // No token? Try silent refresh via httpOnly cookie
            if (!token) {
                authLogger.debug('No token found, attempting silent refresh...');
                token = await refreshAccessToken();
                if (!token) {
                    setUser(null);
                    setIsLoading(false);
                    return;
                }
            }

            // Fetch profile — 401 handling delegated to API client interceptor
            // The interceptor will auto-refresh and retry once if needed
            const response = await getProfile();
            setUser(response.data);

        } catch (error) {
            authLogger.error('Failed to load user profile:', error);

            // Check if auth error (401 that failed even after interceptor retry)
            const isAuthError = error instanceof Error &&
                'response' in error &&
                (error as { response?: { status?: number } }).response?.status === 401;

            if (isAuthError) {
                clearToken();
            }
            setUser(null);
        } finally {
            setIsLoading(false);
            loadingRef.current = false;
        }
    }, []);

    // 初始載入
    useEffect(() => {
        loadUser();
    }, [loadUser]);

    // 登入（stable reference via useCallback）
    const login = useCallback(async (token: string, remember: boolean = true): Promise<void> => {
        storeToken(token, remember);
        await loadUser();
    }, [loadUser]);

    // 登出（stable reference via useCallback）
    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch (error) {
            authLogger.error('Logout API failed:', error);
        } finally {
            clearToken();
            setUser(null);
        }
    }, []);

    // 刷新使用者資訊（stable reference via useCallback）
    const refreshUser = useCallback(async () => {
        loadingRef.current = false; // Allow re-fetch
        await loadUser();
    }, [loadUser]);

    // 判斷認證狀態
    const isAuthenticated = !!user && !user.isAnonymous;
    const isAnonymous = !user || !!user.isAnonymous;

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isAnonymous,
        isLoading,
        authReady: !isLoading,
        login,
        logout,
        refreshUser,
    };

    // 自動刷新定時器 - 每 13 分鐘（token 15 分鐘過期）
    useEffect(() => {
        if (!user || user.isAnonymous) return;

        authLogger.debug('Setting up auto-refresh timer (every 13 minutes)');
        const interval = setInterval(async () => {
            authLogger.debug('Auto-refreshing token...');
            const newToken = await refreshAccessToken();
            if (!newToken) {
                authLogger.warn('Auto-refresh failed, user may need to re-login');
            }
        }, 13 * 60 * 1000);

        return () => {
            authLogger.debug('Clearing auto-refresh timer');
            clearInterval(interval);
        };
    }, [user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// 使用 hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
