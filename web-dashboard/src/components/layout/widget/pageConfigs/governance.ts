/**
 * Page widget configs — Governance domain (帳戶 / 租戶 / 權限 / 稽核 / 設定 / 備份 / 個人)
 */
import { WidgetConfig } from '../types';

export const GOVERNANCE_PAGE_CONFIGS: Record<string, WidgetConfig[]> = {
    // Audit Log Page
    'audit': [
        { id: 'search-panel', title: '篩選器', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 1 }, style: 'glass' },
        { id: 'audit-table', title: '審計日誌', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Governance Audit (審計日誌)
    'governance-audit': [
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

    // Governance Settings (系統設定)
    'governance-settings': [
        { id: 'settings-nav', title: '設定分類', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 3, h: 8, minW: 2, minH: 6 }, style: 'card' },
        { id: 'settings-panel', title: '設定選項', region: 'main', visible: true, locked: false, position: { x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 }, style: 'card' },
    ],

    // Features Page
    'features': [
        { id: 'key-metrics', title: '功能統計', region: 'header', visible: true, locked: false, position: { x: 0, y: 0, w: 12, h: 2, minW: 8, minH: 2 }, style: 'glass' },
        { id: 'feature-flags', title: '功能開關', region: 'main', visible: true, locked: false, position: { x: 0, y: 2, w: 12, h: 6, minW: 8, minH: 4 }, style: 'card' },
    ],

    // Permissions (權限管理)
    'permissions': [
        { id: 'role-list', title: '角色列表', region: 'sidebar', visible: true, locked: false, position: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 }, style: 'card' },
        { id: 'permission-matrix', title: '權限矩陣', region: 'main', visible: true, locked: false, position: { x: 4, y: 0, w: 8, h: 8, minW: 6, minH: 6 }, style: 'card' },
    ],

    // Governance IAM (權限管理)
    'governance-iam': [
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
