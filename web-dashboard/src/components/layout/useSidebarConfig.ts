/**
 * useSidebarConfig.ts
 * 
 * Sidebar navigation configuration with workflow-based grouping
 * Supports: editing names, reordering, RBAC filtering, persistence
 * 
 * v2.0 - 7 Workflow Domains + RBAC Integration
 */
import { useState, useEffect, useCallback } from 'react';
import {
    // C2 - Command & Control
    LayoutDashboard, AlertTriangle, ClipboardList, Zap, Activity, Target, FileCheck,
    CalendarDays, FileText,
    // Geo - Geographic Intel
    Map, Bell, CloudRain, Plane, Route, BookOpen,
    // Log - Logistics
    Package, GitMerge, QrCode, Heart,
    // HR - Human Resources
    Users, Calendar, Clock, GraduationCap, Award, Trophy,
    // Community
    Building2, Home, HeartHandshake, PartyPopper,
    // Analytics
    BarChart3, FileSpreadsheet, Brain,
    // Core
    BellRing, ScrollText, UserCog, Building, Settings, ToggleLeft,
    CheckSquare, Lock, HardDrive, User,
    // Utility
    LucideIcon
} from 'lucide-react';
import { PermissionLevel } from './widget.types';

// Navigation group types - v2.1 Optimized (6 Groups)
export type NavGroup = 'ops' | 'geo' | 'logistics' | 'workforce' | 'insights' | 'admin';

export interface NavGroupConfig {
    id: NavGroup;
    label: string;
    icon: string;
    emoji: string;
    order: number;
    minLevel?: PermissionLevel;
}

export interface NavItemConfig {
    id: string;
    icon: string;
    label: string;
    path: string;
    group: NavGroup;
    order: number;
    visible: boolean;
    minLevel?: PermissionLevel;
    roles?: string[];
}

const STORAGE_KEY = 'lightkeepers-sidebar-config-v3';

// Group definitions - v2.1 Optimized (6 Groups)
export const NAV_GROUPS: NavGroupConfig[] = [
    { id: 'ops', label: '作戰中心', icon: 'Target', emoji: '🎯', order: 0 },
    { id: 'geo', label: '情資地圖', icon: 'Map', emoji: '🗺️', order: 1 },
    { id: 'logistics', label: '資源後勤', icon: 'Package', emoji: '📦', order: 2, minLevel: PermissionLevel.Volunteer },
    { id: 'workforce', label: '人員動員', icon: 'Users', emoji: '👥', order: 3, minLevel: PermissionLevel.Volunteer },
    { id: 'insights', label: '分析知識', icon: 'BarChart3', emoji: '📊', order: 4, minLevel: PermissionLevel.Supervisor },
    { id: 'admin', label: '系統管理', icon: 'Settings', emoji: '⚙️', order: 5, minLevel: PermissionLevel.Manager },
];

// Default navigation items - v2.1 Optimized (24 items across 6 groups)
const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
    // ========== 🎯 作戰中心 (ops) - 5 items ==========
    { id: 'command-center', icon: 'LayoutDashboard', label: '戰情儀表板', path: '/command-center', group: 'ops', order: 0, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'intake', icon: 'FileText', label: '通報入口', path: '/intake', group: 'ops', order: 1, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'incidents', icon: 'AlertTriangle', label: '事件列表', path: '/incidents', group: 'ops', order: 2, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'tasks', icon: 'ClipboardList', label: '任務看板', path: '/tasks', group: 'ops', order: 3, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'notifications', icon: 'BellRing', label: '通知中心', path: '/hub/notifications', group: 'ops', order: 4, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'offline', icon: 'HardDrive', label: '離線狀態', path: '/hub/offline', group: 'ops', order: 5, visible: true, minLevel: PermissionLevel.Anonymous },

    // ========== 🗺️ 情資地圖 (geo) - 3 items ==========
    { id: 'map-ops', icon: 'Map', label: '作戰地圖', path: '/geo/map-ops', group: 'geo', order: 0, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'alerts', icon: 'Bell', label: '警報中心', path: '/hub/geo-alerts', group: 'geo', order: 1, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'weather', icon: 'CloudRain', label: '氣象預報', path: '/hub/weather', group: 'geo', order: 2, visible: true, minLevel: PermissionLevel.Anonymous },

    // ========== 📦 資源後勤 (logistics) - 4 items ==========
    { id: 'inventory', icon: 'Package', label: '物資庫存', path: '/logistics/inventory', group: 'logistics', order: 0, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'equipment', icon: 'QrCode', label: '裝備管理', path: '/logistics/equipment', group: 'logistics', order: 1, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'donations', icon: 'Heart', label: '捐贈追蹤', path: '/logistics/donations', group: 'logistics', order: 2, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'approvals', icon: 'CheckSquare', label: '審批中心', path: '/approvals', group: 'logistics', order: 3, visible: true, minLevel: PermissionLevel.Supervisor },

    // ========== 👥 人員動員 (workforce) - 5 items ==========
    { id: 'people', icon: 'Users', label: '人員名冊', path: '/workforce/people', group: 'workforce', order: 0, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'shifts', icon: 'Calendar', label: '排班日曆', path: '/workforce/shifts', group: 'workforce', order: 1, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'performance', icon: 'Trophy', label: '績效中心', path: '/workforce/performance', group: 'workforce', order: 2, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'community-hub', icon: 'Building2', label: '社區活動', path: '/community/hub', group: 'workforce', order: 3, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'mental-health', icon: 'HeartHandshake', label: '心理支持', path: '/community/mental-health', group: 'workforce', order: 4, visible: true, minLevel: PermissionLevel.Volunteer },

    // ========== 📊 分析知識 (insights) - 4 items ==========
    { id: 'analytics', icon: 'BarChart3', label: '分析儀表板', path: '/hub/analytics', group: 'insights', order: 0, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'reports', icon: 'FileSpreadsheet', label: '報表中心', path: '/analytics/reports', group: 'insights', order: 1, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'ai-tasks', icon: 'Brain', label: 'AI 任務', path: '/hub/ai', group: 'insights', order: 2, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'training', icon: 'GraduationCap', label: '訓練課程', path: '/training', group: 'insights', order: 2, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'manuals', icon: 'BookOpen', label: '作業手冊', path: '/knowledge/manuals', group: 'insights', order: 3, visible: true, minLevel: PermissionLevel.Anonymous },

    // ========== ⚙️ 系統管理 (admin) - 3 items ==========
    { id: 'iam', icon: 'Lock', label: '權限管理', path: '/governance/iam', group: 'admin', order: 0, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'audit', icon: 'ScrollText', label: '審計日誌', path: '/governance/audit', group: 'admin', order: 1, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'settings', icon: 'Settings', label: '系統設定', path: '/governance/settings', group: 'admin', order: 2, visible: true, minLevel: PermissionLevel.Admin },
];

// Icon mapping for rendering
export const ICON_MAP: Record<string, LucideIcon> = {
    // C2
    LayoutDashboard, AlertTriangle, ClipboardList, Zap, Activity, Target, FileCheck,
    CalendarDays, FileText,
    // Geo
    Map, Bell, CloudRain, Plane, Route, BookOpen,
    // Log
    Package, GitMerge, QrCode, Heart,
    // HR
    Users, Calendar, Clock, GraduationCap, Award, Trophy,
    // Community
    Building2, Home, HeartHandshake, PartyPopper,
    // Analytics
    BarChart3, FileSpreadsheet, Brain,
    // Core
    BellRing, ScrollText, UserCog, Building, Settings, ToggleLeft,
    CheckSquare, Lock, HardDrive, User,
};

export function useSidebarConfig(userLevel: PermissionLevel = PermissionLevel.SystemOwner) {
    const [navItems, setNavItems] = useState<NavItemConfig[]>(DEFAULT_NAV_ITEMS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as NavItemConfig[];
                // Merge with defaults to add any new items
                const merged = DEFAULT_NAV_ITEMS.map(defaultItem => {
                    const savedItem = parsed.find(p => p.id === defaultItem.id);
                    return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
                });
                setNavItems(merged);
            }
        } catch (e) {
            console.warn('Failed to load sidebar config:', e);
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage
    const saveConfig = useCallback((items: NavItemConfig[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.warn('Failed to save sidebar config:', e);
        }
    }, []);

    // Update a single nav item
    const updateNavItem = useCallback((id: string, updates: Partial<NavItemConfig>) => {
        setNavItems(prev => {
            const updated = prev.map(item =>
                item.id === id ? { ...item, ...updates } : item
            );
            saveConfig(updated);
            return updated;
        });
    }, [saveConfig]);

    // Reorder nav items within a group
    const reorderNavItems = useCallback((oldIndex: number, newIndex: number) => {
        setNavItems(prev => {
            const items = [...prev];
            const [removed] = items.splice(oldIndex, 1);
            items.splice(newIndex, 0, removed);

            // Update order values
            const reordered = items.map((item, idx) => ({ ...item, order: idx }));
            saveConfig(reordered);
            return reordered;
        });
    }, [saveConfig]);

    // Reset to defaults
    const resetConfig = useCallback(() => {
        setNavItems(DEFAULT_NAV_ITEMS);
        saveConfig(DEFAULT_NAV_ITEMS);
    }, [saveConfig]);

    // Get visible items filtered by RBAC and sorted
    const getVisibleItemsByGroup = useCallback((group: NavGroup): NavItemConfig[] => {
        return navItems
            .filter(item =>
                item.group === group &&
                item.visible &&
                (item.minLevel === undefined || userLevel >= item.minLevel)
            )
            .sort((a, b) => a.order - b.order);
    }, [navItems, userLevel]);

    // Get all visible items (flat list)
    const visibleNavItems = navItems
        .filter(item => item.visible && (item.minLevel === undefined || userLevel >= item.minLevel))
        .sort((a, b) => {
            // Sort by group first, then by order
            const groupOrderA = NAV_GROUPS.find(g => g.id === a.group)?.order ?? 99;
            const groupOrderB = NAV_GROUPS.find(g => g.id === b.group)?.order ?? 99;
            if (groupOrderA !== groupOrderB) return groupOrderA - groupOrderB;
            return a.order - b.order;
        });

    // Get groups that have visible items
    const visibleGroups = NAV_GROUPS.filter(group =>
        getVisibleItemsByGroup(group.id).length > 0
    );

    return {
        navItems,
        visibleNavItems,
        visibleGroups,
        isLoaded,
        updateNavItem,
        reorderNavItems,
        resetConfig,
        getVisibleItemsByGroup,
        NAV_GROUPS,
    };
}
