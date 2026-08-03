/**
 * MobileBottomNav.tsx — R1 / FE-7 重建
 *
 * 行動端底部導覽（≤900px 顯示，樣式由 AppShellLayout.css 控制）
 * 雙模式（DESIGN_LANGUAGE.md §1.2 / §6）：
 * - 平時：指揮艙 / 地圖 / 任務 / 通知 + 更多
 * - 災時：通報 / 任務 / 地圖 / 傷檢 + 更多（應變核心，高對比）
 * - SOS 永遠是紅色 FAB（單手可及、1 次點擊）
 * 權限：候選項以 page-policy 過濾（單一來源），不足 4 格時遞補。
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    CommandIcon,
    MapIcon,
    TasksIcon,
    ReportIcon,
    TriageIcon,
    InventoryIcon,
    TeamsIcon,
    AnalyticsIcon,
    ShelterIcon,
    SosIcon,
    NotifyIcon,
    WarningIcon,
    CloseIcon,
    GraduationIcon,
    BookIcon,
    MoreIcon,
    type LkIcon,
} from '../../design-system/icons';
import { pagePolicy } from '../../config/page-policy';
import { PermissionLevel } from './widget.types';
import type { AppMode } from './useSidebarConfig';
import './MobileBottomNav.css';

interface NavItem {
    id: string;
    /** B3c 教範圖例（R5/T5b 起 100% LkIcon，lucide 已出清） */
    icon: LkIcon;
    label: string;
    path: string;
}

/** 平時主 tab 候選（依權限遞補，取前 4） */
const NORMAL_MAIN: NavItem[] = [
    { id: 'dashboard', icon: CommandIcon, label: '指揮艙', path: '/command-center' },
    { id: 'map', icon: MapIcon, label: '地圖', path: '/geo/map' },
    { id: 'tasks', icon: TasksIcon, label: '任務', path: '/tasks' },
    { id: 'notifications', icon: NotifyIcon, label: '通知', path: '/hub/notifications' },
    { id: 'alerts', icon: WarningIcon, label: '警報', path: '/hub/geo-alerts' },
    { id: 'shelters', icon: ShelterIcon, label: '避難所', path: '/geo/shelters' },
];

/** 災時主 tab 候選（應變核心，依權限遞補，取前 4）— DESIGN_LANGUAGE.md §1.2 */
const EMERGENCY_MAIN: NavItem[] = [
    { id: 'report', icon: ReportIcon, label: '通報', path: '/intake' },
    { id: 'tasks', icon: TasksIcon, label: '任務', path: '/tasks' },
    { id: 'map', icon: MapIcon, label: '地圖', path: '/geo/map' },
    { id: 'triage', icon: TriageIcon, label: '傷檢', path: '/rescue/triage' },
    { id: 'alerts', icon: WarningIcon, label: '警報', path: '/hub/geo-alerts' },
    { id: 'shelters', icon: ShelterIcon, label: '避難所', path: '/geo/shelters' },
];

/** 「更多」選單候選 */
const NORMAL_MORE: NavItem[] = [
    { id: 'report', icon: ReportIcon, label: '快速通報', path: '/intake' },
    { id: 'workforce', icon: TeamsIcon, label: '人員動員', path: '/workforce/people' },
    { id: 'inventory', icon: InventoryIcon, label: '物資庫存', path: '/logistics/inventory' },
    { id: 'analytics', icon: AnalyticsIcon, label: '分析儀表板', path: '/hub/analytics' },
    { id: 'training', icon: GraduationIcon, label: '訓練課程', path: '/training' },
    { id: 'manuals', icon: BookIcon, label: '作業手冊', path: '/knowledge/manuals' },
];

const EMERGENCY_MORE: NavItem[] = [
    { id: 'command-center', icon: CommandIcon, label: '戰情儀表板', path: '/command-center' },
    { id: 'alerts', icon: WarningIcon, label: '警報中心', path: '/hub/geo-alerts' },
    { id: 'shelters', icon: ShelterIcon, label: '避難所', path: '/geo/shelters' },
    { id: 'inventory', icon: InventoryIcon, label: '物資庫存', path: '/logistics/inventory' },
    { id: 'workforce', icon: TeamsIcon, label: '人員名冊', path: '/workforce/people' },
];

interface MobileBottomNavProps {
    mode?: AppMode;
    userLevel?: PermissionLevel;
}

export default function MobileBottomNav({
    mode = 'normal',
    userLevel = PermissionLevel.Anonymous,
}: MobileBottomNavProps) {
    const location = useLocation();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const allowed = (item: NavItem) =>
        userLevel >= pagePolicy.getRequiredLevelByPath(item.path);

    const mainCandidates = mode === 'emergency' ? EMERGENCY_MAIN : NORMAL_MAIN;
    const moreCandidates = mode === 'emergency' ? EMERGENCY_MORE : NORMAL_MORE;

    const mainNav = mainCandidates.filter(allowed).slice(0, 4);
    const mainIds = new Set(mainNav.map(i => i.id));
    const moreNav = moreCandidates.filter(item => allowed(item) && !mainIds.has(item.id));

    return (
        <>
            {/* SOS FAB — 紅色僅用於生命安全（DESIGN_LANGUAGE.md §3） */}
            <Link to="/emergency/sos" className="mobile-fab-sos" title="SOS 緊急求救" aria-label="SOS 緊急求救">
                <SosIcon size={28} aria-hidden />
            </Link>

            {/* More Menu（bottom sheet） */}
            {isMoreOpen && (
                <div className="mobile-more-overlay" onClick={() => setIsMoreOpen(false)}>
                    <div className="mobile-more-menu" onClick={e => e.stopPropagation()} role="menu">
                        <div className="mobile-more-header">
                            <span>更多功能</span>
                            <button
                                type="button"
                                onClick={() => setIsMoreOpen(false)}
                                className="mobile-more-close"
                                aria-label="關閉選單"
                            >
                                <CloseIcon size={20} />
                            </button>
                        </div>
                        <div className="mobile-more-items">
                            {moreNav.map(item => {
                                const Icon = item.icon;
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.id}
                                        to={item.path}
                                        className={`mobile-more-item ${isActive ? 'active' : ''}`}
                                        onClick={() => setIsMoreOpen(false)}
                                        role="menuitem"
                                    >
                                        <Icon size={24} aria-hidden />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav
                className={`mobile-bottom-nav ${mode === 'emergency' ? 'mobile-bottom-nav--emergency' : ''}`}
                aria-label="行動端導覽"
            >
                {mainNav.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon size={22} aria-hidden />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
                <button
                    type="button"
                    className={`mobile-nav-item ${isMoreOpen ? 'active' : ''}`}
                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                    aria-haspopup="menu"
                    aria-expanded={isMoreOpen}
                >
                    <MoreIcon size={22} aria-hidden />
                    <span>更多</span>
                </button>
            </nav>
        </>
    );
}
