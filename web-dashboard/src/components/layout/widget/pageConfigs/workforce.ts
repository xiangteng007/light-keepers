/**
 * Page widget configs — Workforce domain (人力 / 排班 / 績效 / 活動)
 */
import { WidgetConfig } from '../types';

export const WORKFORCE_PAGE_CONFIGS: Record<string, WidgetConfig[]> = {
    // Volunteers Page
    'volunteers': [
        { id: 'search-panel', title: '搜尋志工', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'volunteer-grid', title: '志工名冊', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Workforce People (人員名冊)
    'workforce-people': [
        { id: 'search-panel', title: '搜尋志工', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'volunteer-grid', title: '志工名冊', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Personnel (人員管理)
    'personnel': [
        { id: 'search-panel', title: '搜尋人員', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'personnel-grid', title: '人員名冊', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'personnel-stats', title: '人員統計', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Shift Calendar (排班日曆)
    'shift-calendar': [
        { id: 'calendar-view', title: '排班日曆', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 9, h: 8, minW: 7, minH: 6 }, style: 'card' },
        { id: 'shift-summary', title: '排班統計', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
        { id: 'my-shifts', title: '我的班表', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
    ],

    // Workforce Shifts (排班日曆)
    'workforce-shifts': [
        { id: 'calendar-view', title: '排班日曆', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 9, h: 8, minW: 7, minH: 6 }, style: 'card' },
        { id: 'shift-summary', title: '排班統計', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
        { id: 'my-shifts', title: '我的班表', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
    ],

    // Workforce Performance (人員績效)
    'workforce-performance': [
        { id: 'key-metrics', title: '績效指標', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'top-volunteers', title: '排行榜', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'my-ranking', title: '我的排名', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
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
};
