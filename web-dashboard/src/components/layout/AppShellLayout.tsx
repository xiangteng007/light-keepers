/**
 * AppShellLayout.tsx
 * 
 * Implementation of appshell-layout.md with iOS Widget system
 * Level 5 users can edit, drag, resize, and hide widgets
 */
import React, { useState, useEffect } from 'react';
import { Menu, X, Settings, ChevronsLeft, ChevronsRight, Bell, User, Plus, Minus } from 'lucide-react';
import { WidgetGrid } from './WidgetGrid';
import { Widget, WidgetEditControls } from './Widget';
import { WidgetPicker } from './WidgetPicker';
import { SidebarSettings } from './SidebarSettings';
import { useWidgetLayout } from './useWidgetLayout';
import { useSidebarConfig, ICON_MAP } from './useSidebarConfig';
import { PermissionLevel } from './widget.types';
import { WIDGET_CONTENT_MAP } from './WidgetContent';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { Breadcrumb } from '../Breadcrumb';
import { LanguageToggle } from '../LanguageSelector';
import './AppShellLayout.css';

interface AppShellLayoutProps {
    children?: React.ReactNode;
    userLevel?: PermissionLevel;  // Pass from AuthContext
    pageId?: string;  // Page-specific identifier for independent widget configs
}

export default function AppShellLayout({
    children,
    userLevel = PermissionLevel.SystemOwner,  // Default to Level 5 for demo
    pageId = 'default',
}: AppShellLayoutProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    // Persist sidebar expanded state to localStorage
    const [sidebarExpanded, setSidebarExpanded] = useState(() => {
        const saved = localStorage.getItem('sidebarExpanded');
        return saved === 'true';
    });
    // Accordion state: track the single expanded group
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [sidebarSettingsOpen, setSidebarSettingsOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    // Sidebar navigation config with RBAC
    const {
        visibleNavItems,
        visibleGroups,
        navItems,
        updateNavItem,
        reorderNavItems,
        resetConfig,
        getVisibleItemsByGroup,
    } = useSidebarConfig(userLevel);

    // Widget layout system with RBAC
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

    // Auto-expand group based on current path
    useEffect(() => {
        const currentPath = window.location.pathname;
        const activeItem = navItems.find(item => item.path === currentPath);
        if (activeItem) {
            setExpandedGroupId(activeItem.group);
        }
    }, [navItems]);

    useEffect(() => {
        if (!isMobile) setDrawerOpen(false);
    }, [isMobile]);

    const toggleDrawer = () => setDrawerOpen(!drawerOpen);
    const closeDrawer = () => setDrawerOpen(false);

    const toggleGroupExpansion = (groupId: string) => {
        // Toggle: if clicked open group -> close it; if different -> open new one (closes others)
        setExpandedGroupId(prev => (prev === groupId ? null : groupId));
    };

    // Widget content is now provided by WIDGET_CONTENT_MAP
    const widgetContent = WIDGET_CONTENT_MAP;

    return (
        <div className={`appShellLayout ${editState.isEditMode ? 'appShellLayout--edit-mode' : ''}`}>
            {/* [H] Header */}
            <header className="header">
                <div className="headerLeft">
                    <button className="burgerBtn" onClick={toggleDrawer}>
                        {drawerOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <span style={{ fontWeight: 600, letterSpacing: '2px', color: 'var(--accent-gold)' }}>
                        LIGHTKEEPERS
                    </span>
                    {canEdit && (
                        <span style={{
                            marginLeft: '12px',
                            padding: '2px 8px',
                            background: 'rgba(212, 168, 75, 0.2)',
                            color: 'var(--accent-gold)',
                            borderRadius: '4px',
                            fontSize: '10px',
                        }}>
                            Level {userLevel}
                        </span>
                    )}
                </div>
                <div className="headerCenter">{/* H-C */}</div>
                <div className="headerRight">
                    <WidgetEditControls
                        isEditMode={editState.isEditMode}
                        canEdit={canEdit}
                        hiddenWidgets={widgets.filter(w => !w.visible)}
                        onToggleEditMode={toggleEditMode}
                        onResetLayout={resetLayout}
                        onShowWidget={toggleWidgetVisibility}
                        onAddWidget={() => setPickerOpen(true)}
                    />

                    {/* Sync Status Indicator */}
                    <SyncStatusIndicator />

                    {/* Language Toggle */}
                    <LanguageToggle />

                    {/* Notification Icon */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setNotificationOpen(!notificationOpen)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="通知"
                        >
                            <Bell size={20} />
                        </button>
                        {notificationOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                width: '300px',
                                background: 'var(--layout-bg, #0b111b)',
                                border: '1px solid var(--accent-gold, #d4a84b)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                zIndex: 200,
                                padding: '16px',
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>通知</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>目前沒有新通知</div>
                            </div>
                        )}
                    </div>

                    {/* Account Avatar */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => {
                                setAccountOpen(!accountOpen);
                                setNotificationOpen(false);
                            }}
                            style={{
                                background: 'rgba(212, 168, 75, 0.2)',
                                border: '2px solid var(--accent-gold)',
                                color: 'var(--accent-gold)',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="帳戶"
                        >
                            <User size={18} />
                        </button>
                        {accountOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                width: '240px',
                                background: 'var(--layout-bg, #0b111b)',
                                border: '1px solid var(--accent-gold, #d4a84b)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                zIndex: 200,
                                padding: '16px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        background: 'rgba(212, 168, 75, 0.2)',
                                        border: '2px solid var(--accent-gold)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--accent-gold)',
                                    }}>
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>使用者</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Level 5</div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                    <button
                                        onClick={() => window.location.href = '/account'}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'var(--text-primary)',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            textAlign: 'left',
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
                {/* [S] Sidebar */}
                <aside className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}>
                    <div className="sbTop">
                        <button
                            onClick={() => {
                                const newState = !sidebarExpanded;
                                setSidebarExpanded(newState);
                                localStorage.setItem('sidebarExpanded', String(newState));
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            {sidebarExpanded ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
                        </button>
                    </div>
                    <nav className="sbScroll">
                        {visibleGroups.map(group => {
                            const groupItems = getVisibleItemsByGroup(group.id);
                            if (groupItems.length === 0) return null;

                            const isCollapsed = expandedGroupId !== group.id;

                            return (
                                <div key={group.id} style={{ marginBottom: '16px' }}>
                                    {/* Group Header - Adaptive for both expanded and collapsed sidebar */}
                                    <div
                                        onClick={() => toggleGroupExpansion(group.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: sidebarExpanded ? 'space-between' : 'center',
                                            padding: sidebarExpanded ? '8px 10px' : '8px 0',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            marginBottom: '4px',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            background: (!isCollapsed && !sidebarExpanded) ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            borderRadius: sidebarExpanded ? '0' : '8px',
                                        }}
                                        title={sidebarExpanded ? (isCollapsed ? "展開" : "收合") : group.label}
                                    >
                                        {sidebarExpanded ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{group.emoji}</span>
                                                    <span>{group.label}</span>
                                                </div>
                                                {isCollapsed ? <Plus size={16} /> : <Minus size={16} />}
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '18px' }}>{group.emoji}</span>
                                        )}
                                    </div>

                                    {/* Group Items - Strictly follow accordion state even when minimized */}
                                    {!isCollapsed && (
                                        <div style={{
                                            overflow: 'hidden',
                                            transition: 'height 0.3s ease',
                                        }}>
                                            {groupItems.map(item => {
                                                const IconComponent = ICON_MAP[item.icon];
                                                return (
                                                    <NavItem
                                                        key={item.id}
                                                        icon={IconComponent ? <IconComponent size={20} /> : null}
                                                        label={item.label}
                                                        path={item.path}
                                                        expanded={sidebarExpanded}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                    <div className="sbBottom">
                        {/* 編輯 Sidebar 導航 - Level 5 Only */}
                        {userLevel >= PermissionLevel.SystemOwner && (
                            <div
                                onClick={() => setSidebarSettingsOpen(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                                    borderRadius: '8px', cursor: 'pointer',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '4px', justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                                }}
                            >
                                <Settings size={20} />
                                {sidebarExpanded && <span style={{ fontSize: '14px' }}>設定</span>}
                            </div>
                        )}
                    </div>
                </aside>

                {/* [M] MainColumn - Widget Grid */}
                <main className="mainCol">
                    {/* Breadcrumb Navigation */}
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
                            widgetContent={widgetContent}
                        />
                    )}
                </main>

                {/* Desktop: Right column removed - now part of widget grid */}
            </div>

            {/* [MB] MobileBottom */}
            <nav className="mobileBottom">[MB] Mobile Nav</nav>

            {/* [SC] Scrim */}
            <div className={`scrim ${drawerOpen ? 'visible' : ''}`} onClick={closeDrawer} />

            {/* [D] Drawer */}
            <aside className={`drawer ${drawerOpen ? 'open' : ''}`}>
                <div className="drawerTop">[D-T]</div>
                <nav className="drawerScroll">[D-M]</nav>
                <div className="drawerBottom">[D-B]</div>
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

            {/* Sidebar Settings Modal */}
            <SidebarSettings
                isOpen={sidebarSettingsOpen}
                navItems={navItems}
                onClose={() => setSidebarSettingsOpen(false)}
                onUpdateItem={updateNavItem}
                onReorder={reorderNavItems}
                onReset={resetConfig}
            />
        </div>
    );
}

// Simple placeholder components
function NavItem({ icon, label, path, expanded, active }: {
    icon: React.ReactNode;
    label: string;
    path?: string;
    expanded: boolean;
    active?: boolean;
}) {
    const isActive = path && window.location.pathname === path;
    return (
        <div
            onClick={() => path && (window.location.href = path)}
            title={!expanded ? label : undefined}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                borderRadius: '8px', cursor: 'pointer',
                background: (active || isActive) ? 'rgba(212, 168, 75, 0.15)' : 'transparent',
                color: (active || isActive) ? 'var(--accent-gold)' : 'var(--text-secondary)',
                marginBottom: '4px', justifyContent: expanded ? 'flex-start' : 'center',
                transition: 'all 0.2s ease',
            }}
        >
            {icon}
            {expanded && <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
        </div>
    );
}

function EventPlaceholder({ title }: { title: string }) {
    return (
        <div style={{
            minWidth: '180px', padding: '12px', background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px', borderLeft: '3px solid var(--accent-gold)',
        }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>00:00</div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{title}</div>
        </div>
    );
}

function CardPlaceholder({ title }: { title: string }) {
    return (
        <div style={{
            padding: '12px', background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px', marginBottom: '8px',
            borderLeft: '3px solid rgba(255,255,255,0.2)',
        }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{title}</div>
        </div>
    );
}
