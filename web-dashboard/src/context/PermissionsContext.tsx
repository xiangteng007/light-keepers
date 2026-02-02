import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getPagePermissions } from '../api/services';
import type { PagePermission } from '../api/services';
import { PAGE_POLICIES } from '../config/page-policy';

/**
 * PermissionsContext - RBAC 權限配置的單一事實來源
 * 
 * 🔐 PR-03: 現在從 page-policy.ts 讀取預設權限配置
 * 
 * 此 Context 從後端 API 載入頁面權限配置，若 API 不可用則使用 page-policy.ts 預設值。
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

// 🔐 PR-03: 從集中式 page-policy.ts 取得預設權限
const getDefaultPermissions = (): Record<string, number> => {
    const defaults: Record<string, number> = {};
    PAGE_POLICIES.forEach(p => {
        defaults[p.pageKey] = p.requiredLevel;
    });
    return defaults;
};

const DEFAULT_PERMISSIONS = getDefaultPermissions();

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
 * 🔐 PR-03: 從 page-policy.ts 重新導出 ROLE_LEVELS
 * 這確保全應用使用同一份權限定義
 */
export { ROLE_LEVELS } from '../config/page-policy';
export type { RoleLevel } from '../config/page-policy';
