/**
 * Page widget configs — Logistics domain (資源 / 物資 / 裝備 / 捐贈 / 審核)
 */
import { WidgetConfig } from '../types';

export const RESOURCE_PAGE_CONFIGS: Record<string, WidgetConfig[]> = {
    // Resource Matching Page
    'resource-matching': [
        { id: 'key-metrics', title: '配對統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'ai-matches', title: 'AI 配對建議', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 4, minW: 8, minH: 3 }, style: 'card' },
        { id: 'requests-list', title: '需求列表', region: 'left', visible: true, locked: false, position: { x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
        { id: 'supplies-grid', title: '供給庫存', region: 'right', visible: true, locked: false, position: { x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 }, style: 'card' },
    ],

    // Resources Page
    'resources': [
        { id: 'resource-stats', title: '庫存統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'resource-table', title: '物資清單', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Resource Overview (資源總覽)
    'resource-overview': [
        { id: 'resource-stats', title: '資源統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'tactical-map', title: '資源分佈', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
        { id: 'resource-categories', title: '資源分類', region: 'sidebar', visible: true, locked: false, position: { x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
    ],

    // Logistics Inventory (物資庫存)
    'logistics-inventory': [
        { id: 'resource-stats', title: '庫存統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'resource-table', title: '物資清單', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Equipment (裝備標籤)
    'equipment': [
        { id: 'equipment-stats', title: '裝備統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'equipment-scanner', title: 'QR 掃描', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
        { id: 'equipment-grid', title: '裝備清單', region: 'main', visible: true, locked: false, position: { x: 4, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
    ],

    // Logistics Equipment (裝備管理)
    'logistics-equipment': [
        { id: 'equipment-stats', title: '裝備統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'equipment-scanner', title: 'QR 掃描', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 2, w: 4, h: 6, minW: 3, minH: 4 }, style: 'card' },
        { id: 'equipment-grid', title: '裝備清單', region: 'main', visible: true, locked: false, position: { x: 4, y: 2, w: 8, h: 6, minW: 6, minH: 4 }, style: 'card' },
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
};
