import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getProfile } from '../api/services';

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

// AuthProvider 元件
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 載入使用者資訊
    const loadUser = async () => {
        const token = getStoredToken();
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await getProfile();
            setUser(response.data);
        } catch (error) {
            console.error('Failed to load user profile:', error);
            clearToken();
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
    const logout = () => {
        clearToken();
        setUser(null);
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

