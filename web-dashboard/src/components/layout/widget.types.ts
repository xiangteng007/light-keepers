/**
 * Widget Layout System - Type Definitions
 */

// Widget size presets
export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Grid position and dimensions
export interface WidgetPosition {
    x: number;  // Grid column position (0-based)
    y: number;  // Grid row position (0-based)
    w: number;  // Width in grid units
    h: number;  // Height in grid units
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
}

// Individual widget configuration
export interface WidgetConfig {
    id: string;             // Unique identifier
    title: string;          // Display title
    region: string;         // Corresponding appshell-layout.md region
    icon?: string;          // Optional icon name
    visible: boolean;       // Is widget visible
    locked: boolean;        // Is widget position locked
    position: WidgetPosition;
    style?: 'card' | 'glass' | 'minimal';
}

// Complete layout configuration
export interface LayoutConfig {
    id: string;
    name: string;
    widgets: WidgetConfig[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

// User permission levels (using const object for compatibility)
export const PermissionLevel = {
    Anonymous: 0,
    Guest: 0,
    Volunteer: 1,
    TeamLead: 2,
    Supervisor: 2,    // Alias for TeamLead
    Coordinator: 3,
    Manager: 3,       // Alias for Coordinator
    Admin: 4,
    SystemOwner: 5,   // Only this level can edit widgets
} as const;

export type PermissionLevel = typeof PermissionLevel[keyof typeof PermissionLevel];

// Widget edit mode
export interface WidgetEditState {
    isEditMode: boolean;
    selectedWidgetId: string | null;
    dragEnabled: boolean;
    resizeEnabled: boolean;
}

// Default widget configurations based on appshell-layout.md
export const DEFAULT_WIDGETS: WidgetConfig[] = [
    {
        id: 'workspace',
        title: '戰情地圖',
        region: 'M-W',
        visible: true,
        locked: false,
        position: { x: 0, y: 0, w: 8, h: 6, minW: 4, minH: 3 },
        style: 'card',
    },
    {
        id: 'event-timeline',
        title: '事件時間線',
        region: 'M-R',
        visible: true,
        locked: false,
        position: { x: 0, y: 6, w: 8, h: 2, minW: 4, minH: 1 },
        style: 'glass',
    },
    {
        id: 'disaster-reports',
        title: '災情通報',
        region: 'R-R1',
        visible: true,
        locked: false,
        position: { x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 2 },
        style: 'card',
    },
    {
        id: 'ncdr-alerts',
        title: 'NCDR 警報',
        region: 'R-R2',
        visible: true,
        locked: false,
        position: { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 2 },
        style: 'card',
    },
];

// Available widget modules for Add Widget picker
export interface WidgetModule {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'map' | 'data' | 'tools' | 'community' | 'analytics' | 'core';
    defaultSize: { w: number; h: number; minW: number; minH: number };
}

export const AVAILABLE_WIDGET_MODULES: WidgetModule[] = [
    // Map & Geo
    { id: 'tactical-map', title: '戰情地圖', description: '即時災情地圖顯示', icon: '🗺️', category: 'map', defaultSize: { w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'weather-radar', title: '氣象雷達', description: '即時雨量雷達圖', icon: '🌧️', category: 'map', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'earthquake-map', title: '地震監測', description: '即時地震資訊', icon: '📍', category: 'map', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'map-layers', title: '圖層控制', description: '地圖圖層管理', icon: '🗂️', category: 'map', defaultSize: { w: 3, h: 4, minW: 2, minH: 3 } },
    { id: 'map-legend', title: '地圖圖例', description: '標記說明', icon: '📍', category: 'map', defaultSize: { w: 2, h: 3, minW: 2, minH: 2 } },

    // Data & Alerts
    { id: 'ncdr-alerts', title: 'NCDR 警報', description: '國家級災害警報', icon: '🚨', category: 'data', defaultSize: { w: 4, h: 4, minW: 3, minH: 2 } },
    { id: 'disaster-reports', title: '災情通報', description: '最新災情回報列表', icon: '📋', category: 'data', defaultSize: { w: 4, h: 4, minW: 3, minH: 2 } },
    { id: 'event-timeline', title: '事件時間線', description: '任務時間軸', icon: '📅', category: 'data', defaultSize: { w: 6, h: 2, minW: 4, minH: 1 } },
    { id: 'volunteer-status', title: '志工狀態', description: '在線志工統計', icon: '👥', category: 'data', defaultSize: { w: 3, h: 3, minW: 2, minH: 2 } },
    { id: 'ai-matches', title: 'AI 配對建議', description: 'AI 智慧資源配對', icon: '🤖', category: 'data', defaultSize: { w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'requests-list', title: '需求列表', description: '資源需求清單', icon: '📝', category: 'data', defaultSize: { w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'supplies-grid', title: '供給庫存', description: '可用物資網格', icon: '📦', category: 'data', defaultSize: { w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'missing-cases', title: '失蹤案例', description: '尋人案例卡片', icon: '🔍', category: 'data', defaultSize: { w: 8, h: 5, minW: 6, minH: 4 } },
    { id: 'audit-table', title: '審計日誌', description: '操作記錄表格', icon: '📜', category: 'data', defaultSize: { w: 12, h: 6, minW: 8, minH: 4 } },

    // Tools
    { id: 'quick-actions', title: '快速操作', description: '常用功能快捷鍵', icon: '⚡', category: 'tools', defaultSize: { w: 3, h: 2, minW: 2, minH: 1 } },
    { id: 'ptt-panel', title: 'PTT 對講', description: '語音對講面板', icon: '🎙️', category: 'tools', defaultSize: { w: 3, h: 3, minW: 2, minH: 2 } },
    { id: 'resource-search', title: '物資查詢', description: '即時物資查詢', icon: '📦', category: 'tools', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'search-panel', title: '搜尋面板', description: '進階搜尋功能', icon: '🔎', category: 'tools', defaultSize: { w: 4, h: 2, minW: 3, minH: 2 } },
    { id: 'report-form', title: '通報表單', description: '新增通報', icon: '📋', category: 'tools', defaultSize: { w: 4, h: 4, minW: 3, minH: 3 } },

    // Community
    { id: 'blessing-wall', title: '祈福牆', description: '社群祝福訊息', icon: '🕯️', category: 'community', defaultSize: { w: 4, h: 4, minW: 3, minH: 3 } },
    { id: 'mood-tracker', title: '心情追蹤', description: '心理健康記錄', icon: '😊', category: 'community', defaultSize: { w: 3, h: 3, minW: 2, minH: 2 } },
    { id: 'pfa-chat', title: 'AI 心理急救', description: '心理支援聊天', icon: '💬', category: 'community', defaultSize: { w: 4, h: 5, minW: 3, minH: 4 } },

    // Analytics
    { id: 'mission-stats', title: '任務統計', description: '本日任務數據', icon: '📊', category: 'analytics', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'resource-chart', title: '物資圖表', description: '物資分佈圖', icon: '📈', category: 'analytics', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'trends-chart', title: '趨勢預測', description: 'AI 趨勢分析', icon: '📈', category: 'analytics', defaultSize: { w: 12, h: 3, minW: 8, minH: 2 } },
    { id: 'ai-reports', title: 'AI 報告', description: 'AI 生成報告列表', icon: '🤖', category: 'analytics', defaultSize: { w: 12, h: 5, minW: 8, minH: 4 } },
    { id: 'key-metrics', title: '關鍵指標', description: '核心數據儀表板', icon: '📊', category: 'analytics', defaultSize: { w: 4, h: 2, minW: 3, minH: 2 } },

    // Core / Admin
    { id: 'accounts-grid', title: '帳戶清單', description: '用戶帳戶管理', icon: '👤', category: 'core', defaultSize: { w: 12, h: 5, minW: 8, minH: 4 } },
    { id: 'tenant-list', title: '租戶列表', description: '多組織管理', icon: '🏢', category: 'core', defaultSize: { w: 5, h: 6, minW: 4, minH: 4 } },
    { id: 'tenant-detail', title: '租戶詳情', description: '選定租戶資訊', icon: '📋', category: 'core', defaultSize: { w: 7, h: 6, minW: 5, minH: 4 } },
    { id: 'settings-nav', title: '設定導航', description: '設定分類選單', icon: '⚙️', category: 'core', defaultSize: { w: 3, h: 6, minW: 2, minH: 4 } },
    { id: 'settings-panel', title: '設定面板', description: '設定選項內容', icon: '🔧', category: 'core', defaultSize: { w: 9, h: 6, minW: 6, minH: 4 } },
    { id: 'feature-flags', title: '功能開關', description: 'Feature Flags 管理', icon: '🚦', category: 'core', defaultSize: { w: 12, h: 5, minW: 8, minH: 4 } },
];

// ===== Page-Specific Widget Configurations =====
export const PAGE_WIDGET_CONFIGS: Record<string, WidgetConfig[]> = {
    // Command Center / Dashboard (default)
    'command-center': DEFAULT_WIDGETS,
    'dashboard': DEFAULT_WIDGETS,
    'default': DEFAULT_WIDGETS,

    // Tactical Map Page
    'tactical-map': [
        { id: 'map-layers', title: '圖層控制', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 5, minW: 2, minH: 3 }, style: 'card' },
        { id: 'tactical-map', title: '戰術地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 7, h: 6, minW: 5, minH: 4 }, style: 'card' },
        { id: 'map-legend', title: '圖例', region: 'sidebar', visible: true, locked: false, position: { x: 10, y: 0, w: 2, h: 3, minW: 2, minH: 2 }, style: 'glass' },
        { id: 'quick-actions', title: '快速操作', region: 'sidebar', visible: true, locked: false, position: { x: 10, y: 3, w: 2, h: 3, minW: 2, minH: 2 }, style: 'glass' },
    ],

    // Resource Matching Page
    'resource-matching': [
        { id: 'key-metrics', title: '配對統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ai-matches', title: 'AI 配對建議', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 4, minW: 8, minH: 3 }, style: 'card' },
        { id: 'requests-list', title: '需求列表', region: 'left', visible: true, locked: false, position: { x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'supplies-grid', title: '供給庫存', region: 'right', visible: true, locked: false, position: { x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
    ],

    // Reunification Page
    'reunification': [
        { id: 'search-panel', title: '搜尋', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 2, minW: 6, minH: 2 }, style: 'glass' },
        { id: 'key-metrics', title: '狀態統計', region: 'header', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 }, style: 'glass' },
        { id: 'missing-cases', title: '失蹤案例', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // AI Summary Page
    'ai-summary': [
        { id: 'trends-chart', title: '趨勢預測', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 3, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ai-reports', title: 'AI 生成報告', region: 'main', visible: true, locked: false, position: { x: 0, y: 3, w: 12, h: 5, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Audit Log Page
    'audit': [
        { id: 'search-panel', title: '篩選器', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'audit-table', title: '審計日誌', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Accounts Page
    'accounts': [
        { id: 'search-panel', title: '搜尋帳戶', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'accounts-grid', title: '帳戶清單', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Tenants Page
    'tenants': [
        { id: 'tenant-list', title: '租戶列表', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 5, h: 8, minW: 4, minH: 6 }, style: 'card' },
        { id: 'tenant-detail', title: '租戶詳情', region: 'main', visible: true, locked: false, position: { x: 5, y: 0, w: 7, h: 8, minW: 5, minH: 6 }, style: 'card' },
    ],

    // Settings Page
    'settings': [
        { id: 'settings-nav', title: '設定分類', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 6 }, style: 'card' },
        { id: 'settings-panel', title: '設定選項', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 }, style: 'card' },
    ],

    // Features Page
    'features': [
        { id: 'key-metrics', title: '功能統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'feature-flags', title: '功能開關', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // ===== Additional Page Configs =====

    // Analytics Page
    'analytics': [
        { id: 'key-metrics', title: '關鍵指標', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'trends-chart', title: '趨勢圖表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 4, minW: 6, minH: 3 }, style: 'card' },
        { id: 'mission-stats', title: '任務統計', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 }, style: 'card' },
    ],

    // Volunteers Page
    'volunteers': [
        { id: 'search-panel', title: '搜尋志工', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'volunteer-grid', title: '志工名冊', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Notifications Page
    'notifications': [
        { id: 'notification-list', title: '通知列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'notification-settings', title: '通知設定', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Events Page
    'events': [
        { id: 'event-timeline', title: '事件時間線', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'event-list', title: '事件列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Training Page
    'training': [
        { id: 'training-progress', title: '學習進度', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'course-grid', title: '課程列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Resources Page
    'resources': [
        { id: 'resource-stats', title: '庫存統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'resource-table', title: '物資清單', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Tasks Page
    'tasks': [
        { id: 'task-stats', title: '任務統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'task-board', title: '任務看板', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Task Dispatch Page (智慧派遣)
    'task-dispatch': [
        { id: 'dispatch-queue', title: '待派遣任務', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 }, style: 'card' },
        { id: 'tactical-map', title: '派遣地圖', region: 'main', visible: true, locked: false, position: { x: 4, y: 0, w: 5, h: 6, minW: 4, minH: 4 }, style: 'card' },
        { id: 'volunteer-status', title: '可用人力', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
        { id: 'quick-actions', title: '快速派遣', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 2 }, style: 'glass' },
        { id: 'event-timeline', title: '派遣時間軸', region: 'footer', visible: true, locked: false, position: { x: 4, y: 6, w: 5, h: 2, minW: 4, minH: 2 }, style: 'glass' },
    ],

    // Triage Page (分流站)
    'triage': [
        { id: 'triage-queue', title: '待分流案件', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 }, style: 'card' },
        { id: 'triage-stats', title: '分流統計', region: 'header', visible: true, locked: false, position: { x: 4, y: 0, w: 8, h: 2, minW: 6, minH: 2 }, style: 'glass' },
        { id: 'triage-workspace', title: '分流工作區', region: 'main', visible: true, locked: false, position: { x: 4, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
    ],

    // Drills Page (演練模擬)
    'drills': [
        { id: 'drill-scenarios', title: '演練情境', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 6 }, style: 'card' },
        { id: 'tactical-map', title: '演練地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 6, h: 6, minW: 5, minH: 4 }, style: 'card' },
        { id: 'drill-controls', title: '演練控制', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
        { id: 'drill-log', title: '演練日誌', region: 'footer', visible: true, locked: false, position: { x: 3, y: 6, w: 9, h: 2, minW: 6, minH: 2 }, style: 'glass' },
    ],

    // Incidents Page (C2)
    'incidents': [
        { id: 'incident-map', title: '事件地圖', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'incident-list', title: '事件列表', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
        { id: 'event-timeline', title: '時間軸', region: 'footer', visible: true, locked: false, position: { x: 0, y: 6, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
    ],

    // Community Page
    'community': [
        { id: 'community-stats', title: '社區統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'community-map', title: '社區地圖', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'blessing-wall', title: '祈福牆', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // NCDR Alerts Page
    'ncdr': [
        { id: 'alert-summary', title: '警報摘要', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ncdr-alerts', title: 'NCDR 警報', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Map Page
    'map': [
        { id: 'map-layers', title: '圖層', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 4 }, style: 'card' },
        { id: 'tactical-map', title: '地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 }, style: 'card' },
    ],

    // Forecast Page
    'forecast': [
        { id: 'weather-radar', title: '氣象雷達', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'forecast-cards', title: '預報資訊', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
        { id: 'alert-summary', title: '警報', region: 'footer', visible: true, locked: false, position: { x: 0, y: 6, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
    ],

    // Donations Page
    'donations': [
        { id: 'donation-stats', title: '捐贈統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'donation-list', title: '捐贈記錄', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Approvals Page
    'approvals': [
        { id: 'pending-count', title: '待審核', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'approval-queue', title: '審核佇列', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Activities Page
    'activities': [
        { id: 'activity-feed', title: '活動動態', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'activity-calendar', title: '活動日曆', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Leaderboard Page
    'leaderboard': [
        { id: 'top-volunteers', title: '排行榜', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'my-ranking', title: '我的排名', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 }, style: 'card' },
    ],

    // ===== V2 Domain Pages =====

    // Drone Control (無人機作業)
    'drone-control': [
        { id: 'drone-list', title: '無人機列表', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 6 }, style: 'card' },
        { id: 'tactical-map', title: '飛行地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 6, h: 6, minW: 5, minH: 4 }, style: 'card' },
        { id: 'drone-controls', title: '飛行控制', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
        { id: 'drone-status', title: '狀態監控', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 }, style: 'glass' },
        { id: 'drone-log', title: '飛行日誌', region: 'footer', visible: true, locked: false, position: { x: 3, y: 6, w: 6, h: 2, minW: 4, minH: 2 }, style: 'glass' },
    ],

    // Equipment (裝備標籤)
    'equipment': [
        { id: 'equipment-stats', title: '裝備統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'equipment-scanner', title: 'QR 掃描', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
        { id: 'equipment-grid', title: '裝備清單', region: 'main', visible: true, locked: false, position: { x: 4, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
    ],

    // Shift Calendar (排班日曆)
    'shift-calendar': [
        { id: 'calendar-view', title: '排班日曆', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 9, h: 8, minW: 7, minH: 6 }, style: 'card' },
        { id: 'shift-summary', title: '排班統計', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
        { id: 'my-shifts', title: '我的班表', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
    ],

    // Resource Overview (資源總覽)
    'resource-overview': [
        { id: 'resource-stats', title: '資源統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'tactical-map', title: '資源分佈', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'resource-categories', title: '資源分類', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Personnel (人員管理)
    'personnel': [
        { id: 'search-panel', title: '搜尋人員', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'personnel-grid', title: '人員名冊', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'personnel-stats', title: '人員統計', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Mental Health (心理支持)
    'mental-health': [
        { id: 'mood-tracker', title: '心情記錄', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'phq9-assessment', title: '憂鬱評估 (PHQ-9)', region: 'main', visible: true, locked: false, position: { x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'gad7-assessment', title: '焦慮評估 (GAD-7)', region: 'main', visible: true, locked: false, position: { x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'blessing-wall', title: '祈福牆', region: 'sidebar', visible: true, locked: false, position: { x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
    ],

    // ===== 新增頁面 Widget 配置 =====

    // Events (事件通報)
    'events': [
        { id: 'event-timeline', title: '事件時間線', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'event-list', title: '事件列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'event-form', title: '新增事件', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Report (災情通報)
    'report': [
        { id: 'report-form', title: '災情通報表單', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'recent-reports', title: '近期通報', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Manuals (作業手冊)
    'manuals': [
        { id: 'search-panel', title: '搜尋手冊', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'manual-categories', title: '手冊分類', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 2, w: 3, h: 6, minW: 2, minH: 4 }, style: 'card' },
        { id: 'manual-list', title: '手冊列表', region: 'main', visible: true, locked: false, position: { x: 3, y: 2, w: 9, h: 6, minW: 6, minH: 4 }, style: 'card' },
    ],

    // Activities (活動動態)
    'activities': [
        { id: 'activity-feed', title: '動態消息', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'activity-calendar', title: '活動日曆', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 }, style: 'card' },
        { id: 'upcoming-events', title: '即將到來', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }, style: 'card' },
    ],

    // Approvals (審批中心)
    'approvals': [
        { id: 'pending-count', title: '待審核統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'approval-queue', title: '審核佇列', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Permissions (權限管理)
    'permissions': [
        { id: 'role-list', title: '角色列表', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 }, style: 'card' },
        { id: 'permission-matrix', title: '權限矩陣', region: 'main', visible: true, locked: false, position: { x: 4, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
    ],

    // Backups (備份管理)
    'backups': [
        { id: 'backup-status', title: '備份狀態', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'backup-list', title: '備份列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'backup-actions', title: '備份操作', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Profile (個人資料)
    'profile': [
        { id: 'profile-card', title: '個人資訊', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 }, style: 'card' },
        { id: 'profile-settings', title: '帳戶設定', region: 'main', visible: true, locked: false, position: { x: 4, y: 0, w: 8, h: 4, minW: 6, minH: 3 }, style: 'card' },
        { id: 'profile-activity', title: '活動記錄', region: 'main', visible: true, locked: false, position: { x: 4, y: 4, w: 8, h: 4, minW: 6, minH: 3 }, style: 'card' },
    ],
};

