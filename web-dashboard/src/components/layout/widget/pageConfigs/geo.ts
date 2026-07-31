/**
 * Page widget configs — Geo domain (地圖 / 警報 / 氣象)
 */
import { WidgetConfig } from '../types';

export const GEO_PAGE_CONFIGS: Record<string, WidgetConfig[]> = {
    // Tactical Map Page
    'tactical-map': [
        { id: 'map-layers', title: '圖層控制', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 5, minW: 2, minH: 3 }, style: 'card' },
        { id: 'tactical-map', title: '戰術地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 7, h: 6, minW: 5, minH: 4 }, style: 'card' },
        { id: 'map-legend', title: '圖例', region: 'sidebar', visible: true, locked: false, position: { x: 10, y: 0, w: 2, h: 3, minW: 2, minH: 2 }, style: 'glass' },
        { id: 'quick-actions', title: '快速操作', region: 'sidebar', visible: true, locked: false, position: { x: 10, y: 3, w: 2, h: 3, minW: 2, minH: 2 }, style: 'glass' },
    ],

    // Map Page
    'map': [
        { id: 'map-layers', title: '圖層', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 4 }, style: 'card' },
        { id: 'tactical-map', title: '地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 }, style: 'card' },
    ],

    // Map Ops (作戰地圖)
    'map-ops': [
        { id: 'map-layers', title: '圖層控制', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 4 }, style: 'card' },
        { id: 'tactical-map', title: '作戰地圖', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 9, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'event-timeline', title: '事件時間線', region: 'footer', visible: true, locked: false, position: { x: 3, y: 6, w: 9, h: 2, minW: 6, minH: 2 }, style: 'glass' },
    ],

    // NCDR Alerts Page
    'ncdr': [
        { id: 'alert-summary', title: '警報摘要', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ncdr-alerts', title: 'NCDR 警報', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Geo Alerts (警報中心)
    'geo-alerts': [
        { id: 'geo-summary', title: '警報摘要', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ncdr-alerts', title: 'NCDR 警報', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Forecast Page
    'forecast': [
        { id: 'weather-radar', title: '氣象雷達', region: 'main', visible: true, locked: false, position: { x: 0, y: 0, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'forecast-cards', title: '預報資訊', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
        { id: 'alert-summary', title: '警報', region: 'footer', visible: true, locked: false, position: { x: 0, y: 6, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
    ],

    // Geo Weather (氣象預報)
    'geo-weather': [
        { id: 'weather-card', title: '天氣總覽', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'weather-radar', title: '氣象雷達', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'forecast-cards', title: '預報資訊', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],
};
