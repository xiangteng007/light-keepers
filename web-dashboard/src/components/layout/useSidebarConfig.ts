/**
 * useSidebarConfig.ts — R1 / FE-7 重寫
 *
 * 導覽解析 hook：
 * - 結構單一來源：`src/config/navigation.ts`（NAV_GROUPS / NAV_ITEMS）
 * - 權限單一來源：`src/config/page-policy.ts`（pagePolicy.getRequiredLevelByPath）
 *   ⚠ 本檔不再持有任何權限數值（v3.x 的第二份 minLevel 已消滅）。
 *   item.minLevel 僅為執行期解析結果，供 UI 顯示；不可寫入、不可持久化。
 * - 使用者自訂（顯示/順序/名稱）以 overrides 形式存 localStorage，
 *   權限與路徑永遠取自單一來源，不會被舊快取蓋掉。
 *
 * 雙模式（DESIGN_LANGUAGE.md §1）：
 * - normal：完整群組（權限過濾）
 * - emergency：只留 emergencyCore 項目，依 emergencyRank 排序
 * 角色分層（§5）：volunteerItems 提供 L0–L1 扁平清單。
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    // Emergency
    AlertCircle, Phone, Siren, FileWarning,
    // Ops
    LayoutDashboard, AlertTriangle, ClipboardList, Target, FileStack, BellRing, HardDrive,
    // Geo
    Map, Bell, CloudRain, MapPin,
    // Rescue
    Stethoscope, Search, Users2, Truck, Radio,
    // Logistics
    Package, QrCode, Heart, Combine, CheckSquare,
    // Workforce
    Users, Calendar, Trophy, Building2, HeartHandshake,
    // Insights
    BarChart3, FileSpreadsheet, Files, FlaskConical, Brain, Bot, GraduationCap, BookOpen,
    // Admin
    Lock, ScrollText, Shield, Share2, Activity, Webhook, Fingerprint, Settings,
    // Utility
    User,
    LucideIcon,
} from 'lucide-react';
import {
    NAV_GROUPS as NAV_GROUP_DEFS,
    NAV_ITEMS as NAV_ITEM_DEFS,
    type NavGroupId,
    type NavGroupDef,
    type NavItemDef,
} from '../../config/navigation';
import { pagePolicy } from '../../config/page-policy';
import { PermissionLevel } from './widget.types';

// Config version — v6: R1 重寫（overrides-only 儲存、權限改由 page-policy 解析）
const CONFIG_VERSION = 6;
const STORAGE_KEY = 'lk-sidebar-overrides';
const VERSION_KEY = 'lk-sidebar-version';

export type NavGroup = NavGroupId;
export type NavGroupConfig = NavGroupDef;

/** 執行期導覽項目（minLevel 為 page-policy 解析結果，唯讀） */
export interface NavItemConfig extends NavItemDef {
    /** 由 pagePolicy.getRequiredLevelByPath(path) 解析；僅供顯示/過濾，不可寫入 */
    minLevel: number;
}

/** 使用者可自訂的欄位（權限/路徑/群組不可自訂） */
interface NavItemOverride {
    visible?: boolean;
    order?: number;
    label?: string;
}
type OverrideMap = Record<string, NavItemOverride>;

export const NAV_GROUPS: NavGroupConfig[] = NAV_GROUP_DEFS;

export type AppMode = 'normal' | 'emergency';

// ==========================================
// Icon mapping for rendering
// ==========================================
export const ICON_MAP: Record<string, LucideIcon> = {
    AlertCircle, Phone, Siren, FileWarning,
    LayoutDashboard, AlertTriangle, ClipboardList, Target, FileStack, BellRing, HardDrive,
    Map, Bell, CloudRain, MapPin,
    Stethoscope, Search, Users2, Truck, Radio,
    Package, QrCode, Heart, Combine, CheckSquare,
    Users, Calendar, Trophy, Building2, HeartHandshake,
    BarChart3, FileSpreadsheet, Files, FlaskConical, Brain, Bot, GraduationCap, BookOpen,
    Lock, ScrollText, Shield, Share2, Activity, Webhook, Fingerprint, Settings,
    User,
    default: User,
};

function loadOverrides(): OverrideMap {
    try {
        const storedVersion = localStorage.getItem(VERSION_KEY);
        if (storedVersion !== String(CONFIG_VERSION)) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.setItem(VERSION_KEY, String(CONFIG_VERSION));
            return {};
        }
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? (JSON.parse(stored) as OverrideMap) : {};
    } catch {
        return {};
    }
}

// ==========================================
// Hook: useSidebarConfig
// ==========================================
export function useSidebarConfig(
    userLevel: number = PermissionLevel.SystemOwner,
    mode: AppMode = 'normal',
) {
    const [overrides, setOverrides] = useState<OverrideMap>({});
    const [collapsedGroups, setCollapsedGroups] = useState<Set<NavGroup>>(new Set());

    useEffect(() => {
        setOverrides(loadOverrides());
    }, []);

    const persist = useCallback((next: OverrideMap) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            localStorage.setItem(VERSION_KEY, String(CONFIG_VERSION));
        } catch {
            // storage full / unavailable — in-memory state still applies
        }
    }, []);

    /** 全部項目（含隱藏），minLevel 由 policy 解析 —— SidebarSettings 用 */
    const allItems: NavItemConfig[] = useMemo(() => {
        return NAV_ITEM_DEFS
            .map(def => ({
                ...def,
                ...overrides[def.id],
                minLevel: pagePolicy.getRequiredLevelByPath(def.path),
            }))
            .sort((a, b) => a.order - b.order);
    }, [overrides]);

    /** 權限 + 顯示過濾後的項目（不含 mode 過濾） */
    const permittedItems = useMemo(
        () => allItems.filter(item => item.visible && userLevel >= item.minLevel),
        [allItems, userLevel],
    );

    /** 災時模式清單：emergencyCore only，依 emergencyRank 排序（權限仍過濾） */
    const emergencyItems = useMemo(
        () => allItems
            .filter(item => item.emergencyCore && userLevel >= item.minLevel)
            .sort((a, b) => (a.emergencyRank ?? 99) - (b.emergencyRank ?? 99)),
        [allItems, userLevel],
    );

    /** L0–L1 任務導向極簡殼的扁平清單 */
    const volunteerItems = useMemo(
        () => permittedItems.filter(item => item.volunteerCore),
        [permittedItems],
    );

    /** 緊急快捷（側欄置頂按鈕） */
    const quickActions = useMemo(
        () => allItems.filter(item => item.isQuickAction && userLevel >= item.minLevel),
        [allItems, userLevel],
    );

    /** 依目前 mode 決定的有效項目清單 */
    const filteredItems = mode === 'emergency' ? emergencyItems : permittedItems;

    /** 有至少一個可見項目的群組（群組可見性完全由項目推導，無獨立 minLevel） */
    const filteredGroups = useMemo(
        () => NAV_GROUPS.filter(group => filteredItems.some(item => item.group === group.id)),
        [filteredItems],
    );

    const groupedItems = useMemo(() => {
        return filteredGroups.reduce((acc, group) => {
            acc[group.id] = filteredItems
                .filter(item => item.group === group.id)
                .sort((a, b) => a.order - b.order);
            return acc;
        }, {} as Record<NavGroup, NavItemConfig[]>);
    }, [filteredGroups, filteredItems]);

    const toggleGroup = useCallback((groupId: NavGroup) => {
        const group = NAV_GROUPS.find(g => g.id === groupId);
        if (group?.isPinned) return;
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }, []);

    /** 更新項目 —— 只允許 visible / order / label；權限欄位一律忽略（policy 是 SSOT） */
    const updateItem = useCallback((id: string, updates: Partial<NavItemConfig>) => {
        setOverrides(prev => {
            const allowed: NavItemOverride = {};
            if (updates.visible !== undefined) allowed.visible = updates.visible;
            if (updates.order !== undefined) allowed.order = updates.order;
            if (updates.label !== undefined) allowed.label = updates.label;
            const next = { ...prev, [id]: { ...prev[id], ...allowed } };
            persist(next);
            return next;
        });
    }, [persist]);

    /** 以扁平索引重排（SidebarSettings 拖曳用），寫回每個項目的 order override */
    const reorderByIndex = useCallback((oldIndex: number, newIndex: number) => {
        setOverrides(prev => {
            const flat = NAV_ITEM_DEFS
                .map(def => ({ ...def, ...prev[def.id] }))
                .sort((a, b) => a.order - b.order);
            if (oldIndex < 0 || oldIndex >= flat.length || newIndex < 0 || newIndex >= flat.length) {
                return prev;
            }
            const [moved] = flat.splice(oldIndex, 1);
            flat.splice(newIndex, 0, moved);
            const next: OverrideMap = { ...prev };
            flat.forEach((item, idx) => {
                next[item.id] = { ...next[item.id], order: idx };
            });
            persist(next);
            return next;
        });
    }, [persist]);

    const resetToDefaults = useCallback(() => {
        setOverrides({});
        setCollapsedGroups(new Set());
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
    }, []);

    const getVisibleItemsByGroup = useCallback(
        (groupId: string) => groupedItems[groupId as NavGroup] || [],
        [groupedItems],
    );

    return {
        // 導覽資料
        navItems: filteredItems,
        allItems,
        navGroups: filteredGroups,
        groupedItems,
        quickActions,
        emergencyItems,
        volunteerItems,
        collapsedGroups,
        toggleGroup,
        updateItem,
        resetToDefaults,
        ICON_MAP,

        // 兼容別名（SidebarSettings / 既有呼叫端）
        visibleNavItems: filteredItems,
        visibleGroups: filteredGroups,
        updateNavItem: updateItem,
        reorderNavItems: reorderByIndex,
        resetConfig: resetToDefaults,
        getVisibleItemsByGroup,
    };
}

export default useSidebarConfig;
