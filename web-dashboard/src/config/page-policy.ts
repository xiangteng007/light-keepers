/**
 * Page Policy - Single Source of Truth for RBAC
 * 
 * 🔐 PR-03: Policy 單一來源實作
 * 
 * 此檔案是所有頁面權限的唯一事實來源（Single Source of Truth）
 * 用於：
 * - App.tsx 路由：requiredLevel
 * - useSidebarConfig.ts：選單可見性
 * - ProtectedRoute.tsx：路由保護
 * - PermissionsContext.tsx：運行時權限檢查
 * 
 * 變更權限時，只需修改此檔案，其他地方會自動同步。
 */

/**
 * 權限等級（與後端 RoleLevel 一致）
 */
export const ROLE_LEVELS = {
    /** L0: 公眾/訪客 - 可瀏覽公開資訊 */
    PUBLIC: 0,
    /** L1: 志工 - 可參與任務 */
    VOLUNTEER: 1,
    /** L2: 幹部 - 可管理資源和人員 */
    OFFICER: 2,
    /** L3: 常務理事 - 可查看敏感報告 */
    DIRECTOR: 3,
    /** L4: 理事長 - 可配置系統設定 */
    CHAIRMAN: 4,
    /** L5: 系統擁有者 - 完全控制 */
    OWNER: 5,
} as const;

export type RoleLevel = typeof ROLE_LEVELS[keyof typeof ROLE_LEVELS];

/**
 * 頁面權限配置
 */
export interface PagePolicyEntry {
    /** 頁面唯一識別碼 */
    pageKey: string;
    /** 路由路徑 */
    path: string;
    /** 顯示名稱 */
    label: string;
    /** 所需權限等級 */
    requiredLevel: RoleLevel;
    /** 所屬導航群組 */
    group?: 'ops' | 'geo' | 'logistics' | 'workforce' | 'insights' | 'admin' | 'personal';
    /** 圖示名稱（Lucide icon） */
    icon?: string;
    /** 在選單中的排序 */
    order?: number;
    /** 是否顯示在選單中 */
    showInMenu?: boolean;
    /** 頁面描述 */
    description?: string;
}

/**
 * 🔐 頁面權限策略 - Single Source of Truth
 * 
 * 所有頁面權限都在這裡定義，其他地方通過工具函數讀取。
 */
export const PAGE_POLICIES: PagePolicyEntry[] = [
    // ========== 公開頁面 (L0) ==========
    { pageKey: 'command-center', path: '/command-center', label: '戰情儀表板', requiredLevel: 0, group: 'ops', icon: 'LayoutDashboard', order: 0, showInMenu: true },
    { pageKey: 'intake', path: '/intake', label: '通報入口', requiredLevel: 0, group: 'ops', icon: 'FileText', order: 1, showInMenu: true },
    { pageKey: 'dashboard', path: '/dashboard', label: '儀表版', requiredLevel: 0, group: 'ops', icon: 'Home', order: 0, showInMenu: false },
    { pageKey: 'account', path: '/account', label: '帳戶', requiredLevel: 0, group: 'personal', icon: 'User', showInMenu: false },
    { pageKey: 'profile', path: '/profile', label: '個人資料', requiredLevel: 0, group: 'personal', icon: 'User', showInMenu: true },
    
    // Geo 公開頁面
    { pageKey: 'unified-map', path: '/geo/map', label: '統一地圖', requiredLevel: 0, group: 'geo', icon: 'Map', order: 0, showInMenu: true },
    { pageKey: 'geo-alerts', path: '/hub/geo-alerts', label: '警報中心', requiredLevel: 0, group: 'geo', icon: 'Bell', order: 1, showInMenu: true },
    { pageKey: 'weather', path: '/hub/weather', label: '氣象預報', requiredLevel: 0, group: 'geo', icon: 'CloudRain', order: 2, showInMenu: true },
    { pageKey: 'offline', path: '/hub/offline', label: '離線狀態', requiredLevel: 0, group: 'ops', icon: 'HardDrive', order: 6, showInMenu: true },

    // ========== 志工頁面 (L1) ==========
    { pageKey: 'volunteer-setup', path: '/volunteer-setup', label: '志工資料設定', requiredLevel: 1, showInMenu: false },
    { pageKey: 'incidents', path: '/incidents', label: '事件列表', requiredLevel: 1, group: 'ops', icon: 'AlertTriangle', order: 2, showInMenu: true },
    { pageKey: 'tasks', path: '/tasks', label: '任務看板', requiredLevel: 1, group: 'ops', icon: 'ClipboardList', order: 3, showInMenu: true },
    { pageKey: 'notifications', path: '/hub/notifications', label: '通知中心', requiredLevel: 1, group: 'ops', icon: 'BellRing', order: 5, showInMenu: true },
    
    // 物資後勤 L1
    { pageKey: 'inventory', path: '/logistics/inventory', label: '物資庫存', requiredLevel: 1, group: 'logistics', icon: 'Package', order: 0, showInMenu: true },
    
    // 人員動員 L1
    { pageKey: 'people', path: '/workforce/people', label: '人員名冊', requiredLevel: 1, group: 'workforce', icon: 'Users', order: 0, showInMenu: true },
    { pageKey: 'shifts', path: '/workforce/shifts', label: '排班日曆', requiredLevel: 1, group: 'workforce', icon: 'Calendar', order: 1, showInMenu: true },
    { pageKey: 'performance', path: '/workforce/performance', label: '績效中心', requiredLevel: 1, group: 'workforce', icon: 'Trophy', order: 2, showInMenu: true },
    
    // 社區 L1
    { pageKey: 'community-hub', path: '/community/hub', label: '社區中心', requiredLevel: 1, group: 'personal', icon: 'Home', showInMenu: true },
    
    // 個人頁面 L1
    { pageKey: 'events', path: '/events', label: '活動', requiredLevel: 1, group: 'personal', icon: 'Calendar', showInMenu: true },
    { pageKey: 'report', path: '/report', label: '通報', requiredLevel: 1, group: 'personal', icon: 'FileText', showInMenu: true },
    { pageKey: 'training', path: '/training', label: '訓練', requiredLevel: 1, group: 'personal', icon: 'BookOpen', showInMenu: true },
    { pageKey: 'resources-public', path: '/resources-public', label: '公開物資', requiredLevel: 1, group: 'personal', showInMenu: true },
    { pageKey: 'community', path: '/community', label: '社區', requiredLevel: 1, group: 'personal', showInMenu: true },
    { pageKey: 'reunification', path: '/reunification', label: '尋人', requiredLevel: 1, group: 'personal', showInMenu: true },
    { pageKey: 'activities', path: '/activities', label: '活動記錄', requiredLevel: 1, group: 'personal', showInMenu: true },
    { pageKey: 'leaderboard', path: '/leaderboard', label: '排行榜', requiredLevel: 1, group: 'personal', showInMenu: true },
    { pageKey: 'my-vehicles', path: '/my-vehicles', label: '我的車輛', requiredLevel: 1, group: 'personal', showInMenu: true },
    { pageKey: 'my-insurance', path: '/my-insurance', label: '我的保險', requiredLevel: 1, group: 'personal', showInMenu: true },
    { pageKey: 'ai-chat', path: '/hub/ai-chat', label: 'AI 助手', requiredLevel: 1, group: 'ops', icon: 'Bot', showInMenu: true },

    // ========== 幹部頁面 (L2) ==========
    { pageKey: 'ics-forms', path: '/ops/ics-forms', label: 'ICS 表單', requiredLevel: 2, group: 'ops', icon: 'FileStack', order: 4, showInMenu: true },
    { pageKey: 'equipment', path: '/logistics/equipment', label: '裝備管理', requiredLevel: 2, group: 'logistics', icon: 'QrCode', order: 1, showInMenu: true },
    { pageKey: 'donations', path: '/logistics/donations', label: '捐贈追蹤', requiredLevel: 2, group: 'logistics', icon: 'Heart', order: 2, showInMenu: true },
    { pageKey: 'unified-resources', path: '/logistics/unified-resources', label: '資源整合', requiredLevel: 2, group: 'logistics', icon: 'Combine', order: 3, showInMenu: true },
    { pageKey: 'approvals', path: '/approvals', label: '審批中心', requiredLevel: 2, group: 'logistics', icon: 'CheckSquare', order: 4, showInMenu: true },
    { pageKey: 'reports', path: '/analytics/reports', label: '報告管理', requiredLevel: 2, group: 'insights', icon: 'BarChart', showInMenu: true },
    { pageKey: 'hub-analytics', path: '/hub/analytics', label: '分析中心', requiredLevel: 2, group: 'insights', icon: 'TrendingUp', showInMenu: true },
    { pageKey: 'hub-ai', path: '/hub/ai', label: 'AI 中心', requiredLevel: 2, group: 'insights', icon: 'Bot', showInMenu: true },
    { pageKey: 'unified-reporting', path: '/analytics/unified-reporting', label: '統一報表', requiredLevel: 2, group: 'insights', showInMenu: true },
    { pageKey: 'simulation', path: '/analytics/simulation', label: '模擬推演', requiredLevel: 2, group: 'insights', showInMenu: true },

    // ========== 常務理事頁面 (L3) ==========
    { pageKey: 'governance-iam', path: '/governance/iam', label: '權限管理', requiredLevel: 3, group: 'admin', icon: 'Shield', showInMenu: true },
    { pageKey: 'governance-audit', path: '/governance/audit', label: '審計日誌', requiredLevel: 3, group: 'admin', icon: 'FileSearch', showInMenu: true },
    { pageKey: 'governance-security', path: '/governance/security', label: '安全設定', requiredLevel: 3, group: 'admin', icon: 'Lock', showInMenu: true },
    { pageKey: 'governance-interoperability', path: '/governance/interoperability', label: '互通性', requiredLevel: 3, group: 'admin', showInMenu: true },

    // ========== 理事長頁面 (L4) ==========
    { pageKey: 'governance-webhooks', path: '/governance/webhooks', label: 'Webhooks', requiredLevel: 4, group: 'admin', icon: 'Webhook', showInMenu: true },
    { pageKey: 'governance-biometric', path: '/governance/biometric', label: '生物辨識', requiredLevel: 4, group: 'admin', icon: 'Fingerprint', showInMenu: true },
    { pageKey: 'governance-settings', path: '/governance/settings', label: '系統設定', requiredLevel: 4, group: 'admin', icon: 'Settings', showInMenu: true },

    // ========== 系統擁有者頁面 (L5) ==========
    { pageKey: 'admin-audit-logs', path: '/admin/audit-logs', label: '管理員審計', requiredLevel: 5, group: 'admin', icon: 'FileSearch', showInMenu: true },
];

/**
 * 頁面權限查詢工具 - Policy Registry
 */
class PagePolicyRegistry {
    private policies: Map<string, PagePolicyEntry>;
    private pathMap: Map<string, PagePolicyEntry>;

    constructor(policies: PagePolicyEntry[]) {
        this.policies = new Map();
        this.pathMap = new Map();
        policies.forEach(p => {
            this.policies.set(p.pageKey, p);
            this.pathMap.set(p.path, p);
        });
    }

    /** 根據 pageKey 取得權限配置 */
    getByKey(pageKey: string): PagePolicyEntry | undefined {
        return this.policies.get(pageKey);
    }

    /** 根據路由路徑取得權限配置 */
    getByPath(path: string): PagePolicyEntry | undefined {
        return this.pathMap.get(path);
    }

    /** 取得頁面所需權限等級 */
    getRequiredLevel(pageKey: string): RoleLevel {
        return this.policies.get(pageKey)?.requiredLevel ?? ROLE_LEVELS.PUBLIC;
    }

    /** 取得路由路徑所需權限等級 */
    getRequiredLevelByPath(path: string): RoleLevel {
        return this.pathMap.get(path)?.requiredLevel ?? ROLE_LEVELS.PUBLIC;
    }

    /** 檢查用戶是否有權訪問頁面 */
    hasAccess(pageKey: string, userLevel: number): boolean {
        const requiredLevel = this.getRequiredLevel(pageKey);
        return userLevel >= requiredLevel;
    }

    /** 檢查用戶是否有權訪問路由 */
    hasAccessByPath(path: string, userLevel: number): boolean {
        const requiredLevel = this.getRequiredLevelByPath(path);
        return userLevel >= requiredLevel;
    }

    /** 取得所有頁面配置 */
    getAll(): PagePolicyEntry[] {
        return Array.from(this.policies.values());
    }

    /** 取得指定群組的頁面 */
    getByGroup(group: PagePolicyEntry['group']): PagePolicyEntry[] {
        return this.getAll().filter(p => p.group === group);
    }

    /** 取得用戶可見的選單項目 */
    getAccessibleMenuItems(userLevel: number, group?: PagePolicyEntry['group']): PagePolicyEntry[] {
        return this.getAll()
            .filter(p => p.showInMenu !== false)
            .filter(p => userLevel >= p.requiredLevel)
            .filter(p => !group || p.group === group)
            .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    }
}

/** 全局 Policy Registry 實例 */
export const pagePolicy = new PagePolicyRegistry(PAGE_POLICIES);

/**
 * Hook style helper for components
 */
export function usePagePolicy() {
    return pagePolicy;
}

/**
 * 導出常用查詢函數（兼容現有代碼）
 */
export const getRequiredLevel = (pageKey: string) => pagePolicy.getRequiredLevel(pageKey);
export const getRequiredLevelByPath = (path: string) => pagePolicy.getRequiredLevelByPath(path);
export const hasAccessToPage = (pageKey: string, userLevel: number) => pagePolicy.hasAccess(pageKey, userLevel);
