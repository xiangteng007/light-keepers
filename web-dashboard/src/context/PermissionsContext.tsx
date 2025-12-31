import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getPagePermissions } from '../api/services';
import type { PagePermission } from '../api/services';

/**
 * PermissionsContext - RBAC 權限配置的單一事實來源
 * 
 * 此 Context 從後端 API 載入頁面權限配置，取代前端硬編碼的 requiredLevel。
 * 這解決了前後端權限定義分散的問題（M1. 前後端權限等級定義分散）。
 * 
 * 使用方式：
 * const { getPagePermission, hasAccessToPage, permissions, loading } = usePermissions();
 */

interface PermissionsContextType {
    permissions: PagePermission[];
    loading: boolean;
    error: string | null;
    getPagePermission: (pageKey: string) => PagePermission | undefined;
    hasAccessToPage: (pageKey: string, userLevel: number) => boolean;
    getRequiredLevel: (pageKey: string) => number;
    refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

// 預設權限配置（作為 fallback）
const DEFAULT_PERMISSIONS: Record<string, number> = {
    'dashboard': 0,
    'ncdr-alerts': 0,
    'map': 0,
    'forecast': 0,
    'manuals': 0,
    'events': 1,
    'report': 1,
    'training': 1,
    'profile': 1,
    'tasks': 2,
    'volunteers': 2,
    'resources': 2,
    'approvals': 2,
    'admin-reports': 2,
    'reports-export': 3,
    'analytics': 3,
    'permissions': 4,
    'donations': 5,
};

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<PagePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPermissions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getPagePermissions();
            setPermissions(response.data);
        } catch (err) {
            console.warn('Failed to load permissions from API, using defaults:', err);
            setError('無法載入權限配置，使用預設值');
            // 使用預設配置建立 PagePermission 陣列
            const defaultPerms: PagePermission[] = Object.entries(DEFAULT_PERMISSIONS).map(
                ([pageKey, requiredLevel], index) => ({
                    id: pageKey,
                    pageKey,
                    pageName: pageKey,
                    pagePath: `/${pageKey}`,
                    requiredLevel,
                    sortOrder: index,
                    isVisible: true,
                })
            );
            setPermissions(defaultPerms);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    const getPagePermission = useCallback(
        (pageKey: string): PagePermission | undefined => {
            return permissions.find(p => p.pageKey === pageKey);
        },
        [permissions]
    );

    const hasAccessToPage = useCallback(
        (pageKey: string, userLevel: number): boolean => {
            const permission = getPagePermission(pageKey);
            if (!permission) {
                // Fallback 到預設配置
                const defaultLevel = DEFAULT_PERMISSIONS[pageKey] ?? 0;
                return userLevel >= defaultLevel;
            }
            return userLevel >= permission.requiredLevel;
        },
        [getPagePermission]
    );

    const getRequiredLevel = useCallback(
        (pageKey: string): number => {
            const permission = getPagePermission(pageKey);
            if (!permission) {
                return DEFAULT_PERMISSIONS[pageKey] ?? 0;
            }
            return permission.requiredLevel;
        },
        [getPagePermission]
    );

    const refreshPermissions = useCallback(async () => {
        await loadPermissions();
    }, [loadPermissions]);

    const value: PermissionsContextType = {
        permissions,
        loading,
        error,
        getPagePermission,
        hasAccessToPage,
        getRequiredLevel,
        refreshPermissions,
    };

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}

/**
 * 角色等級常數（與後端一致）
 */
export const ROLE_LEVELS = {
    PUBLIC: 0,       // 一般民眾
    VOLUNTEER: 1,    // 志工
    OFFICER: 2,      // 幹部
    DIRECTOR: 3,     // 常務理事
    CHAIRMAN: 4,     // 理事長
    OWNER: 5,        // 系統擁有者
} as const;

export type RoleLevel = typeof ROLE_LEVELS[keyof typeof ROLE_LEVELS];
