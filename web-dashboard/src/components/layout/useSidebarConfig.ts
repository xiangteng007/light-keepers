/**
 * useSidebarConfig.ts
 * 
 * Expert Council Navigation Design v3.0
 * 8-Group Architecture per expert_council_navigation_design.md
 * 
 * Groups:
 * 0. emergency - 緊急快捷 (Always visible, pinned)
 * 1. ops - 作戰中心
 * 2. geo - 情資地圖
 * 3. rescue - 救援行動 (NEW)
 * 4. logistics - 資源後勤
 * 5. workforce - 人員動員
 * 6. insights - 分析知識
 * 7. admin - 系統管理
 * 
 * CHANGELOG:
 * - v3.0: Expert Council 8-Group Architecture
 * - v2.1: Fix localStorage override bug, add config versioning
 * - v2.0: 7 Workflow Domains + RBAC Integration
 */
import { useState, useEffect, useCallback } from 'react';

// Config version - increment when nav structure changes to force localStorage reset
const CONFIG_VERSION = 5;  // v5: Hide shell pages without backend API (P0 audit)
const STORAGE_KEY = 'lk-sidebar-config';
const VERSION_KEY = 'lk-sidebar-version';

import {
    // Emergency
    AlertCircle, Phone, Siren, FileWarning,
    // C2 - Command & Control
    LayoutDashboard, AlertTriangle, ClipboardList, Zap, Activity, Target, FileCheck,
    CalendarDays, FileText, FileStack,
    // Geo - Geographic Intel
    Map, Bell, CloudRain, Plane, Route, BookOpen, MapPin,
    // Rescue Operations (NEW)
    Building, Stethoscope, Users2, Search, Truck, Radio,
    // Log - Logistics
    Package, GitMerge, QrCode, Heart, Combine,
    // HR - Human Resources
    Users, Calendar, Clock, GraduationCap, Award, Trophy,
    // Community
    Building2, Home, HeartHandshake, PartyPopper,
    // Analytics
    BarChart3, FileSpreadsheet, Brain, MessageSquare, Bot, FlaskConical, Files,
    // Core
    BellRing, ScrollText, UserCog, Settings, ToggleLeft,
    CheckSquare, Lock, HardDrive, User, Webhook, Shield, Fingerprint, Share2,
    // Utility
    LucideIcon
} from 'lucide-react';
import { PermissionLevel } from './widget.types';

// Navigation group types - v3.0 Expert Council (8 Groups)
export type NavGroup = 'emergency' | 'ops' | 'geo' | 'rescue' | 'logistics' | 'workforce' | 'insights' | 'admin';

export interface NavGroupConfig {
    id: NavGroup;
    label: string;
    icon: string;
    emoji: string;
    order: number;
    minLevel?: PermissionLevel;
    isPinned?: boolean;  // Always visible, cannot collapse
    isEmergency?: boolean;  // Special styling
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
    isQuickAction?: boolean;  // For emergency quick actions
}

// ==========================================
// Group definitions - v3.0 Expert Council (8 Groups)
// ==========================================
export const NAV_GROUPS: NavGroupConfig[] = [
    { id: 'emergency', label: '緊急快捷', icon: 'Siren', emoji: '⚡', order: 0, isPinned: true, isEmergency: true },
    { id: 'ops', label: '作戰中心', icon: 'Target', emoji: '🎯', order: 1 },
    { id: 'geo', label: '情資地圖', icon: 'Map', emoji: '🗺️', order: 2 },
    { id: 'rescue', label: '救援行動', icon: 'Stethoscope', emoji: '🏥', order: 3, minLevel: PermissionLevel.Volunteer },
    { id: 'logistics', label: '資源後勤', icon: 'Package', emoji: '📦', order: 4, minLevel: PermissionLevel.Volunteer },
    { id: 'workforce', label: '人員動員', icon: 'Users', emoji: '👥', order: 5, minLevel: PermissionLevel.Volunteer },
    { id: 'insights', label: '分析知識', icon: 'BarChart3', emoji: '📊', order: 6 },  // Contains public items like manuals
    { id: 'admin', label: '系統管理', icon: 'Settings', emoji: '⚙️', order: 7, minLevel: PermissionLevel.Manager },
];

// ==========================================
// Default navigation items - v3.0 (40+ items across 8 groups)
// ==========================================
const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
    // ========== ⚡ 緊急快捷 (emergency) - 2 active / 2 hidden (shell) ==========
    { id: 'sos', icon: 'AlertCircle', label: 'SOS 發送', path: '/emergency/sos', group: 'emergency', order: 0, visible: false, minLevel: PermissionLevel.Anonymous, isQuickAction: true },
    { id: 'quick-report', icon: 'FileWarning', label: '快速通報', path: '/intake', group: 'emergency', order: 1, visible: true, minLevel: PermissionLevel.Anonymous, isQuickAction: true },
    { id: 'evacuation', icon: 'Siren', label: '撤離警報', path: '/emergency/evacuation', group: 'emergency', order: 2, visible: false, minLevel: PermissionLevel.Volunteer, isQuickAction: true },
    { id: 'hotline', icon: 'Phone', label: '緊急專線', path: '/emergency/hotline', group: 'emergency', order: 3, visible: false, minLevel: PermissionLevel.Anonymous, isQuickAction: true },

    // ========== 🎯 作戰中心 (ops) - 7 items ==========
    { id: 'command-center', icon: 'LayoutDashboard', label: '戰情儀表板', path: '/command-center', group: 'ops', order: 0, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'incidents', icon: 'AlertTriangle', label: '事件列表', path: '/incidents', group: 'ops', order: 1, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'tasks', icon: 'ClipboardList', label: '任務看板', path: '/tasks', group: 'ops', order: 2, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'ics-forms', icon: 'FileStack', label: 'ICS 表單', path: '/ops/ics-forms', group: 'ops', order: 3, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'notifications', icon: 'BellRing', label: '通知中心', path: '/hub/notifications', group: 'ops', order: 4, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'ic-dashboard', icon: 'Target', label: 'IC 儀表板', path: '/command/ic', group: 'ops', order: 5, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'offline', icon: 'HardDrive', label: '離線狀態', path: '/hub/offline', group: 'ops', order: 6, visible: false, minLevel: PermissionLevel.Anonymous },

    // ========== 🗺️ 情資地圖 (geo) - 4 items ==========
    { id: 'unified-map', icon: 'Map', label: '統一地圖', path: '/geo/map', group: 'geo', order: 0, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'alerts', icon: 'Bell', label: '警報中心', path: '/hub/geo-alerts', group: 'geo', order: 1, visible: true, minLevel: PermissionLevel.Anonymous },
    { id: 'weather', icon: 'CloudRain', label: '氣象預報', path: '/hub/weather', group: 'geo', order: 2, visible: false, minLevel: PermissionLevel.Anonymous },
    { id: 'shelter-map', icon: 'MapPin', label: '避難所地圖', path: '/geo/shelters', group: 'geo', order: 3, visible: false, minLevel: PermissionLevel.Anonymous },

    // ========== 🏥 救援行動 (rescue) - 6 items (NEW GROUP) ==========
    { id: 'shelters', icon: 'Building', label: '避難所管理', path: '/rescue/shelters', group: 'rescue', order: 0, visible: false, minLevel: PermissionLevel.Volunteer },
    { id: 'triage', icon: 'Stethoscope', label: '傷患分類', path: '/rescue/triage', group: 'rescue', order: 1, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'reunification', icon: 'Users2', label: '家庭重聚', path: '/rescue/reunification', group: 'rescue', order: 2, visible: false, minLevel: PermissionLevel.Volunteer },
    { id: 'search-rescue', icon: 'Search', label: '搜救任務', path: '/rescue/search-rescue', group: 'rescue', order: 3, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'medical-transport', icon: 'Truck', label: '醫療後送', path: '/rescue/medical-transport', group: 'rescue', order: 4, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'field-comms', icon: 'Radio', label: '現地通訊', path: '/rescue/field-comms', group: 'rescue', order: 5, visible: false, minLevel: PermissionLevel.Supervisor },

    // ========== 📦 資源後勤 (logistics) - 5 items ==========
    { id: 'inventory', icon: 'Package', label: '物資庫存', path: '/logistics/inventory', group: 'logistics', order: 0, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'equipment', icon: 'QrCode', label: '裝備管理', path: '/logistics/equipment', group: 'logistics', order: 1, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'donations', icon: 'Heart', label: '捐贈追蹤', path: '/logistics/donations', group: 'logistics', order: 2, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'unified-resources', icon: 'Combine', label: '資源整合', path: '/logistics/unified-resources', group: 'logistics', order: 3, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'approvals', icon: 'CheckSquare', label: '審批中心', path: '/approvals', group: 'logistics', order: 4, visible: true, minLevel: PermissionLevel.Supervisor },

    // ========== 👥 人員動員 (workforce) - 6 items ==========
    { id: 'people', icon: 'Users', label: '人員名冊', path: '/workforce/people', group: 'workforce', order: 0, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'shifts', icon: 'Calendar', label: '排班日曆', path: '/workforce/shifts', group: 'workforce', order: 1, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'mobilization', icon: 'Zap', label: '志工動員', path: '/workforce/mobilization', group: 'workforce', order: 2, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'performance', icon: 'Trophy', label: '績效中心', path: '/workforce/performance', group: 'workforce', order: 3, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'community-hub', icon: 'Building2', label: '社區活動', path: '/community/hub', group: 'workforce', order: 4, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'mental-health', icon: 'HeartHandshake', label: '心理支持', path: '/community/mental-health', group: 'workforce', order: 5, visible: false, minLevel: PermissionLevel.Volunteer },

    // ========== 📊 分析知識 (insights) - 8 items ==========
    { id: 'analytics', icon: 'BarChart3', label: '分析儀表板', path: '/hub/analytics', group: 'insights', order: 0, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'reports', icon: 'FileSpreadsheet', label: '報表中心', path: '/analytics/reports', group: 'insights', order: 1, visible: true, minLevel: PermissionLevel.Supervisor },
    { id: 'unified-reporting', icon: 'Files', label: '綜合報表', path: '/analytics/unified-reporting', group: 'insights', order: 2, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'simulation-engine', icon: 'FlaskConical', label: '模擬引擎', path: '/analytics/simulation', group: 'insights', order: 3, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'ai-tasks', icon: 'Brain', label: 'AI 任務', path: '/hub/ai', group: 'insights', order: 4, visible: false, minLevel: PermissionLevel.Supervisor },
    { id: 'ai-chat', icon: 'Bot', label: 'AI 助手', path: '/hub/ai-chat', group: 'insights', order: 5, visible: false, minLevel: PermissionLevel.Volunteer },
    { id: 'training', icon: 'GraduationCap', label: '訓練課程', path: '/training', group: 'insights', order: 6, visible: true, minLevel: PermissionLevel.Volunteer },
    { id: 'manuals', icon: 'BookOpen', label: '作業手冊', path: '/knowledge/manuals', group: 'insights', order: 7, visible: true, minLevel: PermissionLevel.Anonymous },

    // ========== ⚙️ 系統管理 (admin) - 7 items ==========
    { id: 'iam', icon: 'Lock', label: '權限管理', path: '/governance/iam', group: 'admin', order: 0, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'audit', icon: 'ScrollText', label: '審計日誌', path: '/governance/audit', group: 'admin', order: 1, visible: true, minLevel: PermissionLevel.Manager },
    { id: 'security', icon: 'Shield', label: '安全中心', path: '/governance/security', group: 'admin', order: 2, visible: false, minLevel: PermissionLevel.Manager },
    { id: 'interoperability', icon: 'Share2', label: '機構互通', path: '/governance/interoperability', group: 'admin', order: 3, visible: false, minLevel: PermissionLevel.Manager },
    { id: 'webhooks', icon: 'Webhook', label: 'Webhook 管理', path: '/governance/webhooks', group: 'admin', order: 4, visible: false, minLevel: PermissionLevel.Admin },
    { id: 'biometric', icon: 'Fingerprint', label: '生物辨識', path: '/governance/biometric', group: 'admin', order: 5, visible: false, minLevel: PermissionLevel.Admin },
    { id: 'settings', icon: 'Settings', label: '系統設定', path: '/governance/settings', group: 'admin', order: 6, visible: false, minLevel: PermissionLevel.Admin },
];

// ==========================================
// Icon mapping for rendering
// ==========================================
export const ICON_MAP: Record<string, LucideIcon> = {
    // Emergency
    AlertCircle, Phone, Siren, FileWarning,
    // C2
    LayoutDashboard, AlertTriangle, ClipboardList, Zap, Activity, Target, FileCheck,
    CalendarDays, FileText, FileStack,
    // Geo
    Map, Bell, CloudRain, Plane, Route, BookOpen, MapPin,
    // Rescue (NEW)
    Building, Stethoscope, Users2, Search, Truck, Radio,
    // Log
    Package, GitMerge, QrCode, Heart, Combine,
    // HR
    Users, Calendar, Clock, GraduationCap, Award, Trophy,
    // Community
    Building2, Home, HeartHandshake, PartyPopper,
    // Analytics
    BarChart3, FileSpreadsheet, Brain, MessageSquare, Bot, FlaskConical, Files,
    // Core
    BellRing, ScrollText, UserCog, Settings, ToggleLeft,
    CheckSquare, Lock, HardDrive, User, Webhook, Shield, Fingerprint, Share2,
};

// ==========================================
// Hook: useSidebarConfig
// ==========================================
export function useSidebarConfig(userLevel: number = PermissionLevel.SystemOwner) {
    const [navItems, setNavItems] = useState<NavItemConfig[]>([]);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<NavGroup>>(new Set());

    // Initialize from localStorage or defaults
    useEffect(() => {
        const storedVersion = localStorage.getItem(VERSION_KEY);
        const currentVersionStr = String(CONFIG_VERSION);

        // Force reset if version mismatch
        if (storedVersion !== currentVersionStr) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.setItem(VERSION_KEY, currentVersionStr);
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNavItems(parsed);
            } catch {
                setNavItems(DEFAULT_NAV_ITEMS);
            }
        } else {
            setNavItems(DEFAULT_NAV_ITEMS);
        }
    }, []);

    // Filter items by user permission level
    const filteredItems = navItems.filter(item => {
        if (!item.visible) return false;
        if (item.minLevel !== undefined && userLevel < item.minLevel) return false;
        return true;
    });

    // Filter groups by user permission level
    const filteredGroups = NAV_GROUPS.filter(group => {
        if (group.minLevel !== undefined && userLevel < group.minLevel) return false;
        return true;
    });

    // Group items by nav group
    const groupedItems = filteredGroups.reduce((acc, group) => {
        acc[group.id] = filteredItems
            .filter(item => item.group === group.id)
            .sort((a, b) => a.order - b.order);
        return acc;
    }, {} as Record<NavGroup, NavItemConfig[]>);

    // Get emergency/quick action items (always visible)
    const emergencyItems = filteredItems.filter(item => item.isQuickAction);

    // Toggle group collapse
    const toggleGroup = useCallback((groupId: NavGroup) => {
        const group = NAV_GROUPS.find(g => g.id === groupId);
        if (group?.isPinned) return; // Cannot collapse pinned groups
        
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    }, []);

    // Update item
    const updateItem = useCallback((id: string, updates: Partial<NavItemConfig>) => {
        setNavItems(prev => {
            const next = prev.map(item =>
                item.id === id ? { ...item, ...updates } : item
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    // Reorder items within a group
    const reorderItems = useCallback((groupId: NavGroup, orderedIds: string[]) => {
        setNavItems(prev => {
            const next = prev.map(item => {
                if (item.group !== groupId) return item;
                const newOrder = orderedIds.indexOf(item.id);
                return { ...item, order: newOrder >= 0 ? newOrder : item.order };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    // Reset to defaults
    const resetToDefaults = useCallback(() => {
        setNavItems(DEFAULT_NAV_ITEMS);
        setCollapsedGroups(new Set());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NAV_ITEMS));
    }, []);

    // Backward-compatible helper: get visible items by group ID
    const getVisibleItemsByGroup = useCallback((groupId: string) => {
        return groupedItems[groupId as NavGroup] || [];
    }, [groupedItems]);

    // Legacy reorder by index (for SidebarSettings.tsx compatibility)
    const reorderByIndex = useCallback((oldIndex: number, newIndex: number) => {
        setNavItems(prev => {
            const next = [...prev];
            const [removed] = next.splice(oldIndex, 1);
            next.splice(newIndex, 0, removed);
            // Update order values
            const updated = next.map((item, idx) => ({ ...item, order: idx }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return {
        // v3.0 new API
        navItems: filteredItems,
        navGroups: filteredGroups,
        groupedItems,
        emergencyItems,
        collapsedGroups,
        toggleGroup,
        updateItem,
        reorderItems,
        resetToDefaults,
        ICON_MAP,
        
        // v2.x backward-compatible aliases (for AppShellLayout.tsx)
        visibleNavItems: filteredItems,
        visibleGroups: filteredGroups,
        updateNavItem: updateItem,
        reorderNavItems: reorderByIndex,  // Legacy signature: (oldIndex, newIndex)
        resetConfig: resetToDefaults,
        getVisibleItemsByGroup,
    };
}

export default useSidebarConfig;

