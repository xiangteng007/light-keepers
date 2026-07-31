/**
 * Page widget configs — Hub & analytics pages (Phase 11)
 */
import { WidgetConfig } from '../types';

export const HUB_PAGE_CONFIGS: Record<string, WidgetConfig[]> = {
    // AI Summary Page
    'ai-summary': [
        { id: 'trends-chart', title: '趨勢預測', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 3, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ai-reports', title: 'AI 生成報告', region: 'main', visible: true, locked: false, position: { x: 0, y: 3, w: 12, h: 5, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Analytics Page
    'analytics': [
        { id: 'key-metrics', title: '關鍵指標', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'trends-chart', title: '趨勢圖表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 4, minW: 6, minH: 3 }, style: 'card' },
        { id: 'mission-stats', title: '任務統計', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 }, style: 'card' },
    ],

    // Notifications Page
    'notifications': [
        { id: 'notification-list', title: '通知列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
        { id: 'notification-settings', title: '通知設定', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Hub: Notifications
    'hub-notifications': [
        { id: 'notification-summary', title: '通知摘要', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'notification-feed', title: '通知動態', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'channel-status', title: '頻道狀態', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 3, minW: 3, minH: 2 }, style: 'card' },
        { id: 'notification-settings', title: '通知設定', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 5, w: 4, h: 3, minW: 3, minH: 2 }, style: 'card' },
    ],

    // Hub: Geo-Alerts
    'hub-geo-alerts': [
        { id: 'geo-summary', title: '情資摘要', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'geo-alert-feed', title: '警報動態', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'earthquake-monitor', title: '地震監控', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 3, minW: 3, minH: 2 }, style: 'card' },
        { id: 'ncdr-alerts', title: 'NCDR 警報', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 5, w: 4, h: 3, minW: 3, minH: 2 }, style: 'card' },
    ],

    // Hub: Weather
    'hub-weather': [
        { id: 'weather-card', title: '天氣總覽', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'weather-radar', title: '氣象雷達', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'forecast-cards', title: '預報資訊', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Hub: Analytics
    'hub-analytics': [
        { id: 'dashboard-stats', title: '儀表板統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'trends-chart', title: '趨勢圖表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 4, minW: 6, minH: 3 }, style: 'card' },
        { id: 'report-generator', title: '報表生成', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 }, style: 'card' },
        { id: 'scheduled-reports', title: '排程報表', region: 'footer', visible: true, locked: false, position: { x: 0, y: 6, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
    ],

    // Hub: AI
    'hub-ai': [
        { id: 'dashboard-stats', title: 'AI 狀態', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ai-task-list', title: 'AI 任務列表', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 6, h: 6, minW: 4, minH: 4 }, style: 'card' },
        { id: 'ai-prediction', title: 'AI 預測', region: 'main', visible: true, locked: false, position: { x: 6, y: 2, w: 6, h: 3, minW: 4, minH: 2 }, style: 'card' },
        { id: 'ai-suggestions', title: 'AI 建議', region: 'main', visible: true, locked: false, position: { x: 6, y: 5, w: 6, h: 3, minW: 4, minH: 2 }, style: 'card' },
    ],

    // Hub: Offline
    'hub-offline': [
        { id: 'sync-status', title: '同步狀態', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'pending-queue', title: '待同步佇列', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'mesh-network', title: '網狀網路', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],
};
