/**
 * Page widget configs — Command & Operations (指揮 / 任務 / 事件)
 */
import { WidgetConfig } from '../types';
import { DEFAULT_WIDGETS } from '../defaults';

export const COMMAND_PAGE_CONFIGS: Record<string, WidgetConfig[]> = {
    // Command Center / Dashboard (default)
    'command-center': DEFAULT_WIDGETS,
    'dashboard': DEFAULT_WIDGETS,
    'default': DEFAULT_WIDGETS,

    // Incidents Page (C2)
    'incidents': [
        { id: 'incident-map', title: '事件地圖', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'incident-list', title: '事件列表', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
        { id: 'event-timeline', title: '時間軸', region: 'footer', visible: true, locked: false, position: { x: 0, y: 6, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
    ],

    // Events Page
    'events': [
        { id: 'event-timeline', title: '事件時間線', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'event-list', title: '事件列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
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
};
