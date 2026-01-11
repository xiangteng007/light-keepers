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
    category: 'map' | 'data' | 'tools' | 'community' | 'analytics';
    defaultSize: { w: number; h: number; minW: number; minH: number };
}

export const AVAILABLE_WIDGET_MODULES: WidgetModule[] = [
    // Map & Geo
    { id: 'tactical-map', title: '戰情地圖', description: '即時災情地圖顯示', icon: '🗺️', category: 'map', defaultSize: { w: 6, h: 4, minW: 4, minH: 3 } },
    { id: 'weather-radar', title: '氣象雷達', description: '即時雨量雷達圖', icon: '🌧️', category: 'map', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'earthquake-map', title: '地震監測', description: '即時地震資訊', icon: '📍', category: 'map', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },

    // Data & Alerts
    { id: 'ncdr-alerts', title: 'NCDR 警報', description: '國家級災害警報', icon: '🚨', category: 'data', defaultSize: { w: 4, h: 4, minW: 3, minH: 2 } },
    { id: 'disaster-reports', title: '災情通報', description: '最新災情回報列表', icon: '📋', category: 'data', defaultSize: { w: 4, h: 4, minW: 3, minH: 2 } },
    { id: 'event-timeline', title: '事件時間線', description: '任務時間軸', icon: '📅', category: 'data', defaultSize: { w: 6, h: 2, minW: 4, minH: 1 } },
    { id: 'volunteer-status', title: '志工狀態', description: '在線志工統計', icon: '👥', category: 'data', defaultSize: { w: 3, h: 3, minW: 2, minH: 2 } },

    // Tools
    { id: 'quick-actions', title: '快速操作', description: '常用功能快捷鍵', icon: '⚡', category: 'tools', defaultSize: { w: 3, h: 2, minW: 2, minH: 1 } },
    { id: 'ptt-panel', title: 'PTT 對講', description: '語音對講面板', icon: '🎙️', category: 'tools', defaultSize: { w: 3, h: 3, minW: 2, minH: 2 } },
    { id: 'resource-search', title: '物資查詢', description: '即時物資查詢', icon: '📦', category: 'tools', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },

    // Community
    { id: 'blessing-wall', title: '祈福牆', description: '社群祝福訊息', icon: '🕯️', category: 'community', defaultSize: { w: 4, h: 4, minW: 3, minH: 3 } },
    { id: 'mood-tracker', title: '心情追蹤', description: '心理健康記錄', icon: '😊', category: 'community', defaultSize: { w: 3, h: 3, minW: 2, minH: 2 } },
    { id: 'pfa-chat', title: 'AI 心理急救', description: '心理支援聊天', icon: '💬', category: 'community', defaultSize: { w: 4, h: 5, minW: 3, minH: 4 } },

    // Analytics
    { id: 'mission-stats', title: '任務統計', description: '本日任務數據', icon: '📊', category: 'analytics', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'resource-chart', title: '物資圖表', description: '物資分佈圖', icon: '📈', category: 'analytics', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
];

