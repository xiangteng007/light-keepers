import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getProfile } from '../api/services';

// 使用者資訊介面
export interface User {
    id: string;
    email: string;
    displayName?: string;
    role?: 'admin' | 'volunteer' | 'user';
}

// Auth Context 介面
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 元件
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 載入使用者資訊
    const loadUser = async () => {
        const token = localStorage.getItem('accessToken');
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
            localStorage.removeItem('accessToken');
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
    const login = (token: string) => {
        localStorage.setItem('accessToken', token);
        loadUser();
    };

    // 登出
    const logout = () => {
        localStorage.removeItem('accessToken');
        setUser(null);
    };

    // 刷新使用者資訊
    const refreshUser = async () => {
        await loadUser();
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
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
