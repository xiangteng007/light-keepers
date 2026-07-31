/**
 * Page widget configs — Community, wellbeing, knowledge, intake and air-ops pages
 */
import { WidgetConfig } from '../types';

export const COMMUNITY_PAGE_CONFIGS: Record<string, WidgetConfig[]> = {
    // Reunification Page
    'reunification': [
        { id: 'search-panel', title: '搜尋', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 2, minW: 6, minH: 2 }, style: 'glass' },
        { id: 'key-metrics', title: '狀態統計', region: 'header', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 }, style: 'glass' },
        { id: 'missing-cases', title: '失蹤案例', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Community Page
    'community': [
        { id: 'community-stats', title: '社區統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'community-map', title: '社區地圖', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'blessing-wall', title: '祈福牆', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Mental Health (心理支持)
    'mental-health': [
        { id: 'mood-tracker', title: '心情記錄', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'phq9-assessment', title: '憂鬱評估 (PHQ-9)', region: 'main', visible: true, locked: false, position: { x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'gad7-assessment', title: '焦慮評估 (GAD-7)', region: 'main', visible: true, locked: false, position: { x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'blessing-wall', title: '祈福牆', region: 'sidebar', visible: true, locked: false, position: { x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
    ],

    // Training Page
    'training': [
        { id: 'training-progress', title: '學習進度', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'course-grid', title: '課程列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Manuals (作業手冊)
    'manuals': [
        { id: 'search-panel', title: '搜尋手冊', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'manual-categories', title: '手冊分類', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 2, w: 3, h: 6, minW: 2, minH: 4 }, style: 'card' },
        { id: 'manual-list', title: '手冊列表', region: 'main', visible: true, locked: false, position: { x: 3, y: 2, w: 9, h: 6, minW: 6, minH: 4 }, style: 'card' },
    ],

    // Report (災情通報)
    'report': [
        { id: 'report-form', title: '災情通報表單', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'recent-reports', title: '近期通報', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Intake (統一通報入口)
    'intake': [
        { id: 'intake-form', title: '災情通報表單', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'intake-tips', title: '通報提示', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 }, style: 'card' },
        { id: 'recent-intakes', title: '近期通報', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }, style: 'card' },
    ],

    // Drone Control (無人機作業)
    'drone-control': [
        { id: 'drone-list', title: '無人機列表', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 6 }, style: 'card' },
        { id: 'tactical-map', title: '飛行地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 6, h: 6, minW: 5, minH: 4 }, style: 'card' },
        { id: 'drone-controls', title: '飛行控制', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, style: 'card' },
        { id: 'drone-status', title: '狀態監控', region: 'sidebar', visible: true, locked: false, position: { x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 }, style: 'glass' },
        { id: 'drone-log', title: '飛行日誌', region: 'footer', visible: true, locked: false, position: { x: 3, y: 6, w: 6, h: 2, minW: 4, minH: 2 }, style: 'glass' },
    ],
};
