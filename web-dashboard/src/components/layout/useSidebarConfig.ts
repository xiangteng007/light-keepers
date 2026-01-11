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
    // Geo - Geographic Intel
    Map, Bell, CloudRain, Plane, Route,
    // Log - Logistics
    Package, GitMerge, QrCode, Heart,
    // HR - Human Resources
    Users, Calendar, Clock, GraduationCap, Award,
    // Community
    Building2, Home, HeartHandshake,
    // Analytics
    BarChart3, FileSpreadsheet, Brain,
    // Core
    BellRing, ScrollText, UserCog, Building, Settings, ToggleLeft,
    // Utility
    LucideIcon
} from 'lucide-react';
import { PermissionLevel } from './widget.types';

// Navigation group types
export type NavGroup = 'c2' | 'geo' | 'log' | 'hr' | 'community' | 'analytics' | 'core';

export interface NavGroupConfig {
    id: NavGroup;
    label: string;
    icon: string;
    order: number;
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

const STORAGE_KEY = 'lightkeepers-sidebar-config-v2';

// Group definitions
export const NAV_GROUPS: NavGroupConfig[] = [
    { id: 'c2', label: '指揮控制', icon: 'Zap', order: 0 },
    { id: 'geo', label: '地理情資', icon: 'Map', order: 1 },
    { id: 'log', label: '後勤資源', icon: 'Package', order: 2 },
    { id: 'hr', label: '人力動員', icon: 'Users', order: 3 },
    { id: 'community', label: '社區治理', icon: 'Building2', order: 4 },
    { id: 'analytics', label: '分析報表', icon: 'BarChart3', order: 5 },
    { id: 'core', label: '平台治理', icon: 'Settings', order: 6 },
];

// Default navigation items - 33+ pages across 7 domains
const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
    // ========== C2 - 指揮控制 (7 items) ==========
    { id: 'dashboard', icon: 'LayoutDashboard', label: '戰情儀表板', path: '/command-center', group: 'c2', order: 0, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'incidents', icon: 'AlertTriangle', label: '事件中心', path: '/incidents', group: 'c2', order: 1, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'tasks', icon: 'ClipboardList', label: '任務管理', path: '/tasks', group: 'c2', order: 2, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'dispatch', icon: 'Zap', label: '智慧派遣', path: '/domains/mission-command/task-dispatch', group: 'c2', order: 3, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'triage', icon: 'Activity', label: '分流站', path: '/domains/mission-command/triage', group: 'c2', order: 4, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'drills', icon: 'Target', label: '演練模擬', path: '/drills', group: 'c2', order: 5, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'aar', icon: 'FileCheck', label: 'AAR 檢討', path: '/aar', group: 'c2', order: 6, visible: true, minLevel: PermissionLevel.Manager },

    // ========== Geo - 地理情資 (5 items) ==========
    { id: 'tactical-map', icon: 'Map', label: '戰術地圖', path: '/tactical-map', group: 'geo', order: 0, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'alerts', icon: 'Bell', label: '警報中心', path: '/ncdr-alerts', group: 'geo', order: 1, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'weather', icon: 'CloudRain', label: '氣象整合', path: '/forecast', group: 'geo', order: 2, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'drone-ops', icon: 'Plane', label: '無人機作業', path: '/domains/air-ops/drone-control', group: 'geo', order: 3, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'routing', icon: 'Route', label: '路徑規劃', path: '/map', group: 'geo', order: 4, visible: true, minLevel: PermissionLevel.Volunteer },

    // ========== Log - 後勤資源 (5 items) ==========
    { id: 'resource-overview', icon: 'Package', label: '資源總覽', path: '/domains/logistics/resource-overview', group: 'log', order: 0, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'resources', icon: 'Package', label: '物資管理', path: '/resources', group: 'log', order: 1, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'resource-matching', icon: 'GitMerge', label: '資源媒合', path: '/resource-matching', group: 'log', order: 2, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'equipment', icon: 'QrCode', label: '裝備標籤', path: '/domains/logistics/equipment', group: 'log', order: 3, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'donations', icon: 'Heart', label: '捐贈追蹤', path: '/donations', group: 'log', order: 4, visible: true, minLevel: PermissionLevel.Supervisor },

    // ========== HR - 人力動員 (6 items) ==========
    { id: 'personnel', icon: 'Users', label: '人員管理', path: '/domains/workforce/personnel', group: 'hr', order: 0, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'volunteers', icon: 'Users', label: '志工名冊', path: '/volunteers', group: 'hr', order: 1, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'schedule', icon: 'Calendar', label: '排班日曆', path: '/domains/workforce/shift-calendar', group: 'hr', order: 2, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'attendance', icon: 'Clock', label: '出勤打卡', path: '/domains/workforce/attendance', group: 'hr', order: 3, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'training', icon: 'GraduationCap', label: '訓練課程', path: '/training', group: 'hr', order: 4, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'rewards', icon: 'Award', label: '積分獎勵', path: '/domains/workforce/leaderboard', group: 'hr', order: 5, visible: true, minLevel: PermissionLevel.Volunteer },

    // ========== Community - 社區治理 (4 items) ==========
    { id: 'community-center', icon: 'Building2', label: '社區中心', path: '/domains/community/center', group: 'community', order: 0, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'community', icon: 'Building2', label: '社區韌性', path: '/community', group: 'community', order: 1, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'reunification', icon: 'Home', label: '家庭團聚', path: '/reunification', group: 'community', order: 2, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'psychological', icon: 'HeartHandshake', label: '心理支持', path: '/mental-health', group: 'community', order: 3, visible: true, minLevel: PermissionLevel.Volunteer },

    // ========== Analytics - 分析報表 (4 items) ==========
    { id: 'analytics', icon: 'BarChart3', label: '分析總覽', path: '/analytics', group: 'analytics', order: 0, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'report-generator', icon: 'FileSpreadsheet', label: '報表產生器', path: '/domains/analytics/report-generator', group: 'analytics', order: 1, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'reports', icon: 'FileSpreadsheet', label: '報表中心', path: '/reports/admin', group: 'analytics', order: 2, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'ai-summary', icon: 'Brain', label: 'AI 彙整', path: '/ai-summary', group: 'analytics', order: 3, visible: true, minLevel: PermissionLevel.Supervisor },

    // ========== Core - 平台治理 (6 items) ==========
    { id: 'notifications', icon: 'BellRing', label: '通知中心', path: '/notifications', group: 'core', order: 0, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'audit', icon: 'ScrollText', label: '審計日誌', path: '/audit', group: 'core', order: 1, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'accounts', icon: 'UserCog', label: '帳戶管理', path: '/accounts', group: 'core', order: 2, visible: true, minLevel: PermissionLevel.Admin },
    { id: 'tenants', icon: 'Building', label: '租戶管理', path: '/tenants', group: 'core', order: 3, visible: true, minLevel: PermissionLevel.SystemOwner },
    { id: 'settings', icon: 'Settings', label: '系統設定', path: '/settings', group: 'core', order: 4, visible: true, minLevel: PermissionLevel.SystemOwner },
    { id: 'features', icon: 'ToggleLeft', label: '功能開關', path: '/features', group: 'core', order: 5, visible: true, minLevel: PermissionLevel.SystemOwner },
];

// Icon mapping for rendering
export const ICON_MAP: Record<string, LucideIcon> = {
    // C2
    LayoutDashboard, AlertTriangle, ClipboardList, Zap, Activity, Target, FileCheck,
    // Geo
    Map, Bell, CloudRain, Plane, Route,
    // Log
    Package, GitMerge, QrCode, Heart,
    // HR
    Users, Calendar, Clock, GraduationCap, Award,
    // Community
    Building2, Home, HeartHandshake,
    // Analytics
    BarChart3, FileSpreadsheet, Brain,
    // Core
    BellRing, ScrollText, UserCog, Building, Settings, ToggleLeft,
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
