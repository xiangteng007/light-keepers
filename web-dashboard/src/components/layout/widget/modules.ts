/**
 * Available widget modules shown in the "Add Widget" picker.
 */
import { WidgetModule } from './types';

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

    // ===== Hub Widgets (Phase 11) =====
    // Notification Hub
    { id: 'notification-feed', title: '通知動態', description: '即時通知列表 (LINE/Telegram/Push)', icon: '🔔', category: 'data', defaultSize: { w: 8, h: 6, minW: 6, minH: 4 } },
    { id: 'notification-summary', title: '通知摘要', description: '今日通知統計', icon: '📊', category: 'analytics', defaultSize: { w: 4, h: 2, minW: 3, minH: 2 } },
    { id: 'channel-status', title: '頻道狀態', description: 'LINE/Telegram/Slack 連線狀態', icon: '📡', category: 'tools', defaultSize: { w: 4, h: 4, minW: 3, minH: 3 } },

    // Geo-Intel Hub
    { id: 'geo-alert-feed', title: '警報動態', description: '整合 NCDR/氣象/社群警報', icon: '🚨', category: 'data', defaultSize: { w: 8, h: 6, minW: 6, minH: 4 } },
    { id: 'geo-summary', title: '情資摘要', description: '警報來源分佈統計', icon: '📈', category: 'analytics', defaultSize: { w: 4, h: 2, minW: 3, minH: 2 } },
    { id: 'weather-card', title: '天氣卡片', description: '當前天氣狀態', icon: '🌤️', category: 'map', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },
    { id: 'earthquake-monitor', title: '地震監控', description: '即時地震資訊', icon: '🌋', category: 'map', defaultSize: { w: 4, h: 3, minW: 3, minH: 2 } },

    // Analytics Hub
    { id: 'dashboard-stats', title: '儀表板統計', description: '核心 KPI 面板', icon: '📊', category: 'analytics', defaultSize: { w: 12, h: 2, minW: 8, minH: 2 } },
    { id: 'report-generator', title: '報表生成', description: '一鍵生成報表', icon: '📄', category: 'tools', defaultSize: { w: 4, h: 4, minW: 3, minH: 3 } },
    { id: 'scheduled-reports', title: '排程報表', description: '自動報表列表', icon: '📅', category: 'analytics', defaultSize: { w: 8, h: 4, minW: 6, minH: 3 } },

    // AI Hub
    { id: 'ai-task-list', title: 'AI 任務列表', description: '執行中的 AI 任務', icon: '🤖', category: 'data', defaultSize: { w: 6, h: 5, minW: 4, minH: 4 } },
    { id: 'ai-prediction', title: 'AI 預測', description: '趨勢預測結果', icon: '🔮', category: 'analytics', defaultSize: { w: 6, h: 5, minW: 4, minH: 4 } },
    { id: 'ai-suggestions', title: 'AI 建議', description: '智慧決策建議', icon: '💡', category: 'analytics', defaultSize: { w: 6, h: 4, minW: 4, minH: 3 } },

    // Offline Hub
    { id: 'sync-status', title: '同步狀態', description: '離線/上線同步進度', icon: '🔄', category: 'tools', defaultSize: { w: 6, h: 3, minW: 4, minH: 2 } },
    { id: 'pending-queue', title: '待同步佇列', description: '離線操作列表', icon: '📋', category: 'data', defaultSize: { w: 6, h: 5, minW: 4, minH: 4 } },
    { id: 'mesh-network', title: '網狀網路', description: 'P2P 連線狀態', icon: '🌐', category: 'tools', defaultSize: { w: 6, h: 4, minW: 4, minH: 3 } },

    // Intake Widgets
    { id: 'intake-form', title: '通報表單', description: '災情通報主表單', icon: '📝', category: 'tools', defaultSize: { w: 8, h: 8, minW: 6, minH: 6 } },
    { id: 'intake-tips', title: '通報提示', description: '填表指引', icon: '💡', category: 'tools', defaultSize: { w: 4, h: 4, minW: 3, minH: 3 } },
    { id: 'recent-intakes', title: '近期通報', description: '最新 5 筆通報', icon: '📋', category: 'data', defaultSize: { w: 4, h: 4, minW: 3, minH: 3 } },
];
