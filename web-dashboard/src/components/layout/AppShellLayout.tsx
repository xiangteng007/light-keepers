/**
 * AppShellLayout.tsx — R1 / FE-7 重建
 *
 * 雙模式應用殼（DESIGN_LANGUAGE.md）：
 * - data-app-mode="normal|emergency"：災時模式由 tokens.css LAYER 8 全域換色（高對比戰術深色）
 * - data-density="simple|dense"：L0–L1 志工極簡殼 / L2+ 管理密度殼
 * - EmergencyStatusBar 常駐掛載（有警戒級以上事件時自動顯示）
 * - 導覽：AppSidebar（桌機）/ Drawer（行動端）/ MobileBottomNav（行動端底欄）
 *   權限一律由 page-policy 解析（useSidebarConfig）
 * - Widget 儀表板系統保留（dashboard 類頁面使用）
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useEmergencyStyles } from '../../context/useEmergencyContext';
import { useTheme } from '../../context/ThemeProvider';
import {
    CheckIcon,
    CloseIcon,
    EditIcon,
    MenuIcon,
    MoreIcon,
    NotifyIcon,
    ThemeIcon,
    UserIcon,
    WarningIcon,
} from '../../design-system/icons';
import { LANGUAGES, changeLanguage } from '../../i18n';
import { WidgetGrid } from './WidgetGrid';
import { WidgetEditControls } from './Widget';
import { WidgetPicker } from './WidgetPicker';
import { SidebarSettings } from './SidebarSettings';
import { useWidgetLayout } from './useWidgetLayout';
import { useSidebarConfig } from './useSidebarConfig';
import { useAppMode } from './useAppMode';
import { PermissionLevel } from './widget.types';
import { WIDGET_CONTENT_MAP } from '../widgets/widgetContentMap';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { Breadcrumb } from '../Breadcrumb';
import { LanguageSelector } from '../LanguageSelector';
import AppSidebar, { SidebarNavContent } from './AppSidebar';
import MobileBottomNav from './MobileBottomNav';
import EmergencyStatusBar from './EmergencyStatusBar';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import './AppShellLayout.css';

interface AppShellLayoutProps {
    children?: React.ReactNode;
    userLevel?: PermissionLevel;
    pageId?: string;
}

export default function AppShellLayout({
    children,
    userLevel = PermissionLevel.Anonymous,
    pageId = 'default',
}: AppShellLayoutProps) {
    const { user: authUser } = useAuth();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const { isDark, toggleTheme } = useTheme();

    // ── 雙模式判定（自動 + L2+ 手動覆寫） ──
    const { mode, isEmergencyMode, toggleMode } = useAppMode();
    const emergencyStyles = useEmergencyStyles();

    // ── UI 狀態 ──
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [sidebarSettingsOpen, setSidebarSettingsOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    // 窄幅 more 選單（R5/T5b：≤900px 收納 編輯佈局/災時切換/主題/語言）
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);
    const [sidebarExpanded, setSidebarExpanded] = useState(() => {
        return localStorage.getItem('sidebarExpanded') === 'true';
    });
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('expandedGroups');
            return saved ? new Set(JSON.parse(saved)) : new Set(['ops']);
        } catch {
            return new Set(['ops']);
        }
    });

    // ── 導覽解析（權限唯一來源：page-policy） ──
    const {
        navItems,
        allItems,
        navGroups,
        groupedItems,
        quickActions,
        emergencyItems,
        volunteerItems,
        updateNavItem,
        reorderNavItems,
        resetConfig,
    } = useSidebarConfig(userLevel, mode);

    // ── Widget 儀表板系統（保留） ──
    const {
        widgets,
        editState,
        canEdit,
        gridLayout,
        toggleEditMode,
        updateLayout,
        toggleWidgetVisibility,
        toggleWidgetLock,
        resetLayout,
        selectWidget,
        updateWidgetTitle,
        addWidget,
        removeWidget,
    } = useWidgetLayout({ userLevel, pageId });

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 900);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        localStorage.setItem('expandedGroups', JSON.stringify([...expandedGroups]));
    }, [expandedGroups]);

    useEffect(() => {
        if (!isMobile) setDrawerOpen(false);
    }, [isMobile]);

    // more 選單：點外側關閉
    useEffect(() => {
        if (!moreOpen) return;
        const handleOutside = (event: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [moreOpen]);

    const toggleGroupExpansion = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const toggleSidebarExpanded = () => {
        const next = !sidebarExpanded;
        setSidebarExpanded(next);
        localStorage.setItem('sidebarExpanded', String(next));
    };

    const closeDrawer = () => setDrawerOpen(false);

    const density = userLevel >= PermissionLevel.Supervisor ? 'dense' : 'simple';

    const navContentProps = {
        mode,
        userLevel,
        groups: navGroups,
        groupedItems,
        quickActions,
        emergencyItems,
        volunteerItems,
    };

    return (
        <div
            className={`appShellLayout ${editState.isEditMode ? 'appShellLayout--edit-mode' : ''}`}
            data-app-mode={mode}
            data-density={density}
        >
            {/* 災時狀態列（Warning 級以上自動顯示，常駐置頂） */}
            <EmergencyStatusBar />

            {/* [H] Header */}
            <header className="header">
                <div className="headerLeft">
                    <button
                        type="button"
                        className="burgerBtn"
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        aria-label={drawerOpen ? '關閉選單' : '開啟選單'}
                    >
                        {drawerOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
                    </button>
                    <span className="header__logo">LIGHTKEEPERS</span>
                    {isEmergencyMode && (
                        <span
                            className="header__mode-badge"
                            role="status"
                            aria-label={`災時模式${emergencyStyles.isActive ? ` · ${emergencyStyles.label}` : ''}`}
                        >
                            <WarningIcon size={12} aria-hidden />
                            <span className="header__mode-badge-text" aria-hidden>
                                災時模式{emergencyStyles.isActive ? ` · ${emergencyStyles.label}` : ''}
                            </span>
                        </span>
                    )}
                    {canEdit && (
                        <span className="header__level-badge">Level {userLevel}</span>
                    )}
                </div>
                <div className="headerCenter" />
                <div className="headerRight">
                    {/* 桌機內聯工具（>900px；窄幅收進 more 選單） */}
                    <div className="header__inline-tools">
                        {/* 災時模式手動切換（L2+ 幹部；演練/復盤用） */}
                        {userLevel >= PermissionLevel.Supervisor && (
                            <button
                                type="button"
                                className={`header__icon-btn header__mode-toggle ${isEmergencyMode ? 'active' : ''}`}
                                onClick={toggleMode}
                                title={isEmergencyMode ? '退出災時模式' : '進入災時模式'}
                                aria-pressed={isEmergencyMode}
                            >
                                <WarningIcon size={20} />
                            </button>
                        )}

                        <WidgetEditControls
                            isEditMode={editState.isEditMode}
                            canEdit={canEdit}
                            hiddenWidgets={widgets.filter(w => !w.visible)}
                            onToggleEditMode={toggleEditMode}
                            onResetLayout={resetLayout}
                            onShowWidget={toggleWidgetVisibility}
                            onAddWidget={() => setPickerOpen(true)}
                        />

                        <ThemeSwitcher />
                        <LanguageSelector />
                    </div>

                    <SyncStatusIndicator />

                    {/* 窄幅 more 選單（≤900px 顯示；收納 編輯佈局/災時切換/主題/語言） */}
                    <div className="header__dropdown-container header__more" ref={moreRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setMoreOpen(!moreOpen);
                                setNotificationOpen(false);
                                setAccountOpen(false);
                            }}
                            className="header__icon-btn"
                            title="更多工具"
                            aria-label="更多工具"
                            aria-haspopup="true"
                            aria-expanded={moreOpen}
                        >
                            <MoreIcon size={20} />
                        </button>
                        {moreOpen && (
                            <div className="header__dropdown-panel header__dropdown-panel--more">
                                {userLevel >= PermissionLevel.Supervisor && (
                                    <button
                                        type="button"
                                        className={`header__more-item ${isEmergencyMode ? 'header__more-item--warning' : ''}`}
                                        onClick={() => {
                                            toggleMode();
                                            setMoreOpen(false);
                                        }}
                                        aria-pressed={isEmergencyMode}
                                    >
                                        <WarningIcon size={18} aria-hidden />
                                        {isEmergencyMode ? '退出災時模式' : '進入災時模式'}
                                    </button>
                                )}
                                {canEdit && (
                                    <button
                                        type="button"
                                        className="header__more-item"
                                        onClick={() => {
                                            toggleEditMode();
                                            setMoreOpen(false);
                                        }}
                                    >
                                        <EditIcon size={18} aria-hidden />
                                        {editState.isEditMode ? '完成編輯' : '編輯佈局'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="header__more-item"
                                    onClick={() => {
                                        toggleTheme();
                                        setMoreOpen(false);
                                    }}
                                >
                                    <ThemeIcon size={18} aria-hidden />
                                    切換到{isDark ? '亮鋼版' : '銅鋼版'}
                                </button>
                                <div className="header__more-divider" role="separator" />
                                <div className="header__more-label">語言</div>
                                <div className="header__more-langs">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            className={`header__more-item ${lang.code === i18n.language ? 'header__more-item--active' : ''}`}
                                            onClick={() => {
                                                changeLanguage(lang.code);
                                                setMoreOpen(false);
                                            }}
                                        >
                                            <span className="header__more-flag" aria-hidden>{lang.flag}</span>
                                            {lang.name}
                                            {lang.code === i18n.language && (
                                                <CheckIcon size={16} className="header__more-check" aria-hidden />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 通知 */}
                    <div className="header__dropdown-container">
                        <button
                            type="button"
                            onClick={() => {
                                setNotificationOpen(!notificationOpen);
                                setAccountOpen(false);
                                setMoreOpen(false);
                            }}
                            className="header__icon-btn"
                            title="通知"
                            aria-haspopup="true"
                            aria-expanded={notificationOpen}
                        >
                            <NotifyIcon size={20} />
                        </button>
                        {notificationOpen && (
                            <div className="header__dropdown-panel header__dropdown-panel--notification">
                                <div className="header__dropdown-header">通知</div>
                                <div className="header__dropdown-empty">目前沒有新通知</div>
                            </div>
                        )}
                    </div>

                    {/* 帳戶 */}
                    <div className="header__dropdown-container">
                        <button
                            type="button"
                            onClick={() => {
                                setAccountOpen(!accountOpen);
                                setNotificationOpen(false);
                                setMoreOpen(false);
                            }}
                            className="header__avatar-btn"
                            title="帳戶"
                            aria-haspopup="true"
                            aria-expanded={accountOpen}
                        >
                            <UserIcon size={18} />
                        </button>
                        {accountOpen && (
                            <div className="header__dropdown-panel header__dropdown-panel--account">
                                <div className="header__account-user">
                                    <div className="header__account-avatar">
                                        <UserIcon size={24} />
                                    </div>
                                    <div>
                                        <div className="header__account-name">
                                            {authUser?.displayName || '使用者'}
                                        </div>
                                        <div className="header__account-level">Level {userLevel}</div>
                                    </div>
                                </div>
                                <div className="header__account-actions">
                                    <button
                                        type="button"
                                        className="header__account-link"
                                        onClick={() => {
                                            setAccountOpen(false);
                                            navigate('/account');
                                        }}
                                    >
                                        前往帳戶設定
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="mainBody">
                {/* [S] 桌機側欄 */}
                <AppSidebar
                    {...navContentProps}
                    expanded={sidebarExpanded}
                    expandedGroups={expandedGroups}
                    onToggleGroup={toggleGroupExpansion}
                    onToggleExpanded={toggleSidebarExpanded}
                    onOpenSettings={() => setSidebarSettingsOpen(true)}
                />

                {/* [M] 主工作區 */}
                <main className="mainCol">
                    <Breadcrumb />
                    {children || (
                        <WidgetGrid
                            widgets={widgets}
                            layout={gridLayout}
                            isEditMode={editState.isEditMode}
                            canEdit={canEdit}
                            selectedWidgetId={editState.selectedWidgetId}
                            onLayoutChange={updateLayout}
                            onSelectWidget={selectWidget}
                            onToggleVisibility={toggleWidgetVisibility}
                            onToggleLock={toggleWidgetLock}
                            onTitleChange={updateWidgetTitle}
                            onAddWidget={addWidget}
                            onRemoveWidget={removeWidget}
                            onToggleEditMode={toggleEditMode}
                            onResetLayout={resetLayout}
                            onShowWidget={toggleWidgetVisibility}
                            widgetContent={WIDGET_CONTENT_MAP}
                        />
                    )}
                </main>
            </div>

            {/* [MB] 行動端底欄（雙模式） */}
            <nav className="mobileBottom">
                <MobileBottomNav mode={mode} userLevel={userLevel} />
            </nav>

            {/* [SC] Scrim */}
            <div className={`scrim ${drawerOpen ? 'visible' : ''}`} onClick={closeDrawer} />

            {/* [D] 行動端 Drawer（全功能導覽） */}
            <aside className={`drawer ${drawerOpen ? 'open' : ''}`} aria-label="行動端導覽">
                <div className="drawerTop">
                    <div className="drawer__user">
                        <UserIcon size={36} className="drawer__user-avatar" aria-hidden />
                        <div>
                            <div className="drawer__user-name">{authUser?.displayName || '光守護者'}</div>
                            <div className="drawer__user-level">Level {userLevel}</div>
                        </div>
                    </div>
                    <button type="button" className="drawer__close" onClick={closeDrawer} aria-label="關閉選單">
                        <CloseIcon size={24} />
                    </button>
                </div>
                <div className="drawerScroll">
                    <SidebarNavContent
                        {...navContentProps}
                        expanded
                        expandedGroups={expandedGroups}
                        onToggleGroup={toggleGroupExpansion}
                        onNavigate={closeDrawer}
                    />
                </div>
            </aside>

            {/* Widget Picker Modal */}
            <WidgetPicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelectModule={(module) => {
                    addWidget(module);
                    setPickerOpen(false);
                }}
            />

            {/* 側欄設定（L5；只能調顯示/順序/名稱 —— 權限由 page-policy 管） */}
            <SidebarSettings
                isOpen={sidebarSettingsOpen}
                navItems={allItems.length ? allItems : navItems}
                onClose={() => setSidebarSettingsOpen(false)}
                onUpdateItem={updateNavItem}
                onReorder={reorderNavItems}
                onReset={resetConfig}
            />
        </div>
    );
}
