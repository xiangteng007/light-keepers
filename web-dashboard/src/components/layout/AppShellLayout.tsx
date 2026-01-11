/**
 * AppShellLayout.tsx
 * 
 * Implementation of appshell-layout.md with iOS Widget system
 * Level 5 users can edit, drag, resize, and hide widgets
 */
import React, { useState, useEffect } from 'react';
import { Menu, X, Settings, ChevronsLeft, ChevronsRight, Bell, User } from 'lucide-react';
import { WidgetGrid } from './WidgetGrid';
import { Widget, WidgetEditControls } from './Widget';
import { WidgetPicker } from './WidgetPicker';
import { SidebarSettings } from './SidebarSettings';
import { useWidgetLayout } from './useWidgetLayout';
import { useSidebarConfig, ICON_MAP } from './useSidebarConfig';
import { PermissionLevel } from './widget.types';
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
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
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

    useEffect(() => {
        if (!isMobile) setDrawerOpen(false);
    }, [isMobile]);

    const toggleDrawer = () => setDrawerOpen(!drawerOpen);
    const closeDrawer = () => setDrawerOpen(false);

    // Widget content placeholders - can be replaced with actual components
    const widgetContent: Record<string, React.ReactNode> = {
        'workspace': (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                [M-W] 地圖內容區
            </div>
        ),
        'event-timeline': (
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
                <EventPlaceholder title="事件 1" />
                <EventPlaceholder title="事件 2" />
                <EventPlaceholder title="事件 3" />
            </div>
        ),
        'disaster-reports': (
            <div>
                <CardPlaceholder title="災情通報 1" />
                <CardPlaceholder title="災情通報 2" />
            </div>
        ),
        'ncdr-alerts': (
            <div>
                <CardPlaceholder title="NCDR 警報 1" />
                <CardPlaceholder title="NCDR 警報 2" />
            </div>
        ),
    };

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
                            onClick={() => setSidebarExpanded(!sidebarExpanded)}
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
                        {visibleNavItems.map(item => {
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
