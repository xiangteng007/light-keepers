/**
 * Default widget layout for the Emergency Response Command Center (戰備系統)
 * Grid: 12 columns, rowHeight=80px, optimized for 1920x1080 viewport
 */
import { WidgetConfig } from './types';

export const DEFAULT_WIDGETS: WidgetConfig[] = [
    // ===== Row 1: Mission Stats Bar (Full Width) =====
    {
        id: 'mission-stats',
        title: '任務統計',
        region: 'header',
        visible: true,
        locked: false,
        position: { x: 0, y: 0, w: 12, h: 1, minW: 6, minH: 1 },
        style: 'glass',
    },
    // ===== Row 2-4: Main Content Area =====
    // Left: Tactical Map (8 cols)
    {
        id: 'workspace',
        title: '戰情地圖',
        region: 'M-W',
        visible: true,
        locked: false,
        position: { x: 0, y: 1, w: 8, h: 4, minW: 6, minH: 3 },
        style: 'card',
    },
    // Right Top: NCDR Alerts (4 cols, 2 rows)
    {
        id: 'ncdr-alerts',
        title: 'NCDR 警報',
        region: 'R-R1',
        visible: true,
        locked: false,
        position: { x: 8, y: 1, w: 4, h: 2, minW: 3, minH: 2 },
        style: 'card',
    },
    // Right Bottom: Disaster Reports (4 cols, 2 rows)
    {
        id: 'disaster-reports',
        title: '災情通報',
        region: 'R-R2',
        visible: true,
        locked: false,
        position: { x: 8, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
        style: 'card',
    },
    // ===== Row 5: Bottom Status Bar =====
    // Event Timeline (6 cols)
    {
        id: 'event-timeline',
        title: '事件時間線',
        region: 'M-R',
        visible: true,
        locked: false,
        position: { x: 0, y: 5, w: 6, h: 2, minW: 4, minH: 1 },
        style: 'glass',
    },
    // Volunteer Status (3 cols)
    {
        id: 'volunteer-status',
        title: '志工動態',
        region: 'sidebar',
        visible: true,
        locked: false,
        position: { x: 6, y: 5, w: 3, h: 2, minW: 2, minH: 1 },
        style: 'card',
    },
    // Quick Actions (3 cols) - Important: Visible on first viewport
    {
        id: 'quick-actions',
        title: '快速操作',
        region: 'footer',
        visible: true,
        locked: false,
        position: { x: 9, y: 5, w: 3, h: 2, minW: 2, minH: 1 },
        style: 'glass',
    },
];
