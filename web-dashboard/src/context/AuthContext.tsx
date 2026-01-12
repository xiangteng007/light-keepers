import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getProfile, logout as apiLogout } from '../api/services';
import axios from 'axios';

// Token 存儲 key
const TOKEN_KEY = 'accessToken';
const REMEMBER_KEY = 'rememberMe';

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
    volunteerProfileCompleted?: boolean;  // 是否已完成志工資料
}

// Auth Context 介面
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isAnonymous: boolean;
    isLoading: boolean;
    login: (token: string, remember?: boolean) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper: 獲取存儲的 token
const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

// Helper: 存儲 token
const storeToken = (token: string, remember: boolean): void => {
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

// Helper: 清除 token
const clearToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
};

// Helper: 刷新 Access Token
const refreshAccessToken = async (): Promise<string | null> => {
    // 🔧 DevMode 時跳過 token refresh（使用模擬用戶）
    const devModeEnabled = typeof window !== 'undefined' && localStorage.getItem('devModeUser') === 'true';
    if (devModeEnabled) {
        return null;
    }

    try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
    } catch (error) {
        console.error('[AuthContext] Token refresh failed:', error);
        return null;
    }
};

// AuthProvider 元件
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    // 🔧 DevMode 時不需要等待 API，直接設 isLoading = false
    const devModeEnabled = typeof window !== 'undefined' && localStorage.getItem('devModeUser') === 'true';
    const [isLoading, setIsLoading] = useState(!devModeEnabled);

    // 載入使用者資訊
    const loadUser = async (retryCount = 0) => {
        // DEV MODE: 如果設置了 devModeUser，使用模擬用戶
        const devModeEnabled = localStorage.getItem('devModeUser') === 'true';
        if (devModeEnabled) {
            console.log('[AuthContext] DEV MODE: Using mock Level 5 user');
            setUser({
                id: 'dev-user-001',
                email: 'xiangteng007@gmail.com',
                displayName: '開發測試用戶',
                roles: ['系統擁有者'],
                roleLevel: 5,
                roleDisplayName: '系統擁有者',
                isAnonymous: false,
                volunteerProfileCompleted: true,
            });
            setIsLoading(false);
            return;
        }

        let token = getStoredToken();

        // 如果沒有 token,嘗試用 refresh token 換取新的
        if (!token) {
            console.log('[AuthContext] No token found, attempting refresh...');
            token = await refreshAccessToken();
            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }
        }

        try {
            // 增加到 15 秒超時機制，應對 Cloud Run cold start
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API timeout')), 15000);
            });

            const response = await Promise.race([
                getProfile(),
                timeoutPromise
            ]) as Awaited<ReturnType<typeof getProfile>>;

            setUser(response.data);
        } catch (error) {
            const isTimeout = error instanceof Error && error.message === 'API timeout';
            const isAuthError = (error as any)?.response?.status === 401;

            console.error('[AuthContext] Failed to load user profile:', error);

            // Timeout 且有重試次數時，重試一次
            if (isTimeout && retryCount < 1) {
                console.log('[AuthContext] Profile load timeout, retrying...');
                return loadUser(retryCount + 1);
            }

            // 如果是 401,嘗試刷新 token
            if (isAuthError && retryCount < 1) {
                console.log('[AuthContext] 401 error, attempting token refresh...');
                const newToken = await refreshAccessToken();
                if (newToken) {
                    return loadUser(retryCount + 1);
                }
            }

            // 只有認證錯誤才清除 token
            if (isAuthError) {
                clearToken();
            }
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    // 初始載入
    useEffect(() => {
        loadUser();
    }, []);

    // 登入
    const login = async (token: string, remember: boolean = true): Promise<void> => {
        storeToken(token, remember);
        await loadUser();
    };

    // 登出
    const logout = async () => {
        try {
            // 呼叫後端 API 清除 refresh_token cookie
            await apiLogout();
        } catch (error) {
            console.error('[AuthContext] Logout API failed:', error);
        } finally {
            // 無論 API 成功與否,都清除本地狀態
            clearToken();
            setUser(null);
        }
    };

    // 刷新使用者資訊
    const refreshUser = async () => {
        await loadUser();
    };

    // 判斷是否為已驗證用戶（有 user 且非匿名）
    const isAuthenticated = !!user && !user.isAnonymous;
    const isAnonymous = !user || !!user.isAnonymous;

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isAnonymous,
        isLoading,
        login,
        logout,
        refreshUser,
    };

    // 自動刷新定時器 - 每 13 分鐘刷新一次 (token 15 分鐘過期)
    useEffect(() => {
        if (!user || user.isAnonymous) return;

        console.log('[AuthContext] Setting up auto-refresh timer (every 13 minutes)');
        const interval = setInterval(async () => {
            console.log('[AuthContext] Auto-refreshing token...');
            await refreshAccessToken();
        }, 13 * 60 * 1000); // 13 分鐘

        return () => {
            console.log('[AuthContext] Clearing auto-refresh timer');
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

