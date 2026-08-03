/**
 * AppSidebar.tsx — R1 / FE-7 新側欄
 *
 * 三種呈現（DESIGN_LANGUAGE.md §1 / §5）：
 * - 災時模式（mode='emergency'）：收斂為應變核心動作扁平清單（emergencyCore）
 * - L0–L1（平時）：任務導向極簡殼 —— 扁平清單（volunteerCore），無群組樹
 * - L2+（平時）：完整 8 群組樹（項目由 page-policy 權限過濾）
 *
 * 權限唯一來源 page-policy；本元件只讀 useSidebarConfig 的解析結果。
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    iconRegistry,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    MinusIcon,
    SettingsIcon,
} from '../../design-system/icons';
import { ICON_MAP, NAV_GROUPS, type NavItemConfig, type NavGroupConfig, type AppMode } from './useSidebarConfig';
import { PermissionLevel } from './widget.types';

/**
 * icon 解析：優先 B3c 教範圖例集（iconRegistry 語意名），
 * 未收錄語意者 fallback 舊 lucide ICON_MAP（不硬換，見 R5/T5）。
 */
const resolveIcon = (name: string) =>
    iconRegistry[name] || ICON_MAP[name] || ICON_MAP.default;

/** kebab-case id → camelCase i18n key（沿用 sidebar.items.* 字典） */
function toCamel(id: string): string {
    return id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

interface NavListProps {
    mode: AppMode;
    userLevel: PermissionLevel;
    groups: NavGroupConfig[];
    groupedItems: Record<string, NavItemConfig[]>;
    quickActions: NavItemConfig[];
    emergencyItems: NavItemConfig[];
    volunteerItems: NavItemConfig[];
    expanded: boolean;
    expandedGroups: Set<string>;
    onToggleGroup: (groupId: string) => void;
    onNavigate?: () => void;
}

/** 導覽內容（桌機側欄與行動端 drawer 共用） */
export function SidebarNavContent({
    mode,
    userLevel,
    groups,
    groupedItems,
    quickActions,
    emergencyItems,
    volunteerItems,
    expanded,
    expandedGroups,
    onToggleGroup,
    onNavigate,
}: NavListProps) {
    const { t } = useTranslation();
    const location = useLocation();

    const itemLabel = (item: NavItemConfig) =>
        t(`sidebar.items.${toCamel(item.id)}`, item.label);

    const renderItem = (item: NavItemConfig, options?: { large?: boolean }) => {
        const Icon = resolveIcon(item.icon);
        const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
        return (
            <Link
                key={item.id}
                to={item.path}
                className={[
                    'sidebar__item',
                    isActive ? 'sidebar__item--active' : '',
                    options?.large ? 'sidebar__item--large' : '',
                ].filter(Boolean).join(' ')}
                title={!expanded ? itemLabel(item) : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
            >
                <Icon size={20} aria-hidden />
                {expanded && <span className="sidebar__item-label">{itemLabel(item)}</span>}
            </Link>
        );
    };

    // ── 災時模式：應變核心扁平清單 ──
    if (mode === 'emergency') {
        return (
            <nav className="sidebar__nav sidebar__nav--emergency" aria-label="應變核心導覽">
                {expanded && (
                    <div className="sidebar__section-label sidebar__section-label--emergency">
                        <span className="sidebar__pulse-dot" aria-hidden />
                        應變核心
                    </div>
                )}
                {emergencyItems.map(item => renderItem(item, { large: true }))}
            </nav>
        );
    }

    // ── L0–L1：任務導向極簡殼（快捷 + 扁平核心清單） ──
    if (userLevel <= PermissionLevel.Volunteer) {
        return (
            <nav className="sidebar__nav" aria-label="主導覽">
                {quickActions.length > 0 && (
                    <div className="sidebar__quick-actions">
                        {expanded && (
                            <div className="sidebar__section-label">
                                {t('sidebar.groups.emergency', '緊急快捷')}
                            </div>
                        )}
                        {quickActions.map(item => renderItem(item, { large: true }))}
                    </div>
                )}
                {volunteerItems
                    .filter(item => !item.isQuickAction)
                    .map(item => renderItem(item, { large: true }))}
            </nav>
        );
    }

    // ── L2+：完整群組樹 ──
    return (
        <nav className="sidebar__nav" aria-label="主導覽">
            {groups.map(group => {
                const items = (groupedItems[group.id] || []).filter(i => !i.isQuickAction || group.isPinned);
                if (items.length === 0) return null;
                const GroupIcon = resolveIcon(group.icon);
                const isCollapsed = group.isPinned ? false : !expandedGroups.has(group.id);

                return (
                    <div
                        key={group.id}
                        className={`sidebar__group ${group.isEmergency ? 'sidebar__group--emergency' : ''}`}
                    >
                        <button
                            type="button"
                            className="sidebar__group-header"
                            onClick={() => !group.isPinned && onToggleGroup(group.id)}
                            aria-expanded={!isCollapsed}
                            title={expanded ? undefined : t(`sidebar.groups.${group.id}`, group.label)}
                        >
                            <GroupIcon size={16} aria-hidden />
                            {expanded && (
                                <>
                                    <span className="sidebar__group-label">
                                        {t(`sidebar.groups.${group.id}`, group.label)}
                                    </span>
                                    {!group.isPinned && (
                                        <span className="sidebar__group-toggle" aria-hidden>
                                            {isCollapsed ? <PlusIcon size={14} /> : <MinusIcon size={14} />}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                        {!isCollapsed && (
                            <div className="sidebar__group-items">
                                {items.map(item => renderItem(item))}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

interface AppSidebarProps extends Omit<NavListProps, 'expandedGroups' | 'onToggleGroup' | 'onNavigate'> {
    expandedGroups: Set<string>;
    onToggleGroup: (groupId: string) => void;
    onToggleExpanded: () => void;
    onOpenSettings?: () => void;
}

/** 桌機常駐側欄（≥768px；行動端由 drawer 取代） */
export default function AppSidebar({
    onToggleExpanded,
    onOpenSettings,
    ...navProps
}: AppSidebarProps) {
    const { expanded, userLevel } = navProps;

    return (
        <aside className={`sidebar ${expanded ? 'expanded' : ''}`} aria-label="側邊導覽">
            <div className="sidebar__top">
                <button
                    type="button"
                    className="sidebar__collapse-btn"
                    onClick={onToggleExpanded}
                    title={expanded ? '收合側欄' : '展開側欄'}
                    aria-label={expanded ? '收合側欄' : '展開側欄'}
                >
                    {expanded ? <ChevronLeftIcon size={20} /> : <ChevronRightIcon size={20} />}
                </button>
            </div>
            <div className="sidebar__scroll">
                <SidebarNavContent {...navProps} />
            </div>
            <div className="sidebar__bottom">
                {userLevel >= PermissionLevel.SystemOwner && onOpenSettings && (
                    <button
                        type="button"
                        className="sidebar__settings-btn"
                        onClick={onOpenSettings}
                        title="側欄設定"
                    >
                        <SettingsIcon size={20} aria-hidden />
                        {expanded && <span>側欄設定</span>}
                    </button>
                )}
            </div>
        </aside>
    );
}

export { NAV_GROUPS };
export type { NavListProps };
