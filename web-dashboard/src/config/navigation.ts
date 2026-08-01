/**
 * navigation.ts — 導覽結構單一來源（R1 / FE-7）
 *
 * 這裡只定義「導覽結構」：群組、項目、順序、icon、雙模式與角色分層標記。
 * ⚠ 權限不在這裡 —— 每個項目的 minLevel 一律於執行期由
 *   `pagePolicy.getRequiredLevelByPath(item.path)`（src/config/page-policy.ts）解析。
 *   不得在本檔或任何其他地方新增第二份權限數值（消滅 useSidebarConfig 舊版的重複 minLevel）。
 *
 * 標記說明（見 docs/architecture/DESIGN_LANGUAGE.md §1 / §5）：
 * - volunteerCore: L0–L1 的「任務導向極簡殼」扁平清單成員
 * - emergencyCore: 災時模式收斂後仍顯示的應變核心動作（order 由 emergencyRank 決定）
 * - isQuickAction: 緊急快捷（側欄置頂快速按鈕）
 */

export type NavGroupId =
    | 'emergency'
    | 'ops'
    | 'geo'
    | 'rescue'
    | 'logistics'
    | 'workforce'
    | 'insights'
    | 'admin';

export interface NavGroupDef {
    id: NavGroupId;
    label: string;
    icon: string;
    order: number;
    /** 置頂、不可收合（緊急快捷） */
    isPinned?: boolean;
    isEmergency?: boolean;
}

export interface NavItemDef {
    id: string;
    icon: string;
    label: string;
    /** 收斂後的唯一 canonical 路徑（重複入口已 redirect，見 ROUTE_IA_RECONCILIATION.md §4a） */
    path: string;
    group: NavGroupId;
    order: number;
    /** 預設是否顯示於側欄（使用者可於側欄設定切換；權限過濾另由 policy 決定） */
    visible: boolean;
    volunteerCore?: boolean;
    emergencyCore?: boolean;
    /** 災時清單的固定順序（小者在前；前 4 名構成災時行動端 bottom nav） */
    emergencyRank?: number;
    isQuickAction?: boolean;
}

export const NAV_GROUPS: NavGroupDef[] = [
    { id: 'emergency', label: '緊急快捷', icon: 'Siren', order: 0, isPinned: true, isEmergency: true },
    { id: 'ops', label: '應變指揮', icon: 'Target', order: 1 },
    { id: 'geo', label: '情資地圖', icon: 'Map', order: 2 },
    { id: 'rescue', label: '救援行動', icon: 'Stethoscope', order: 3 },
    { id: 'logistics', label: '資源後勤', icon: 'Package', order: 4 },
    { id: 'workforce', label: '人員動員', icon: 'Users', order: 5 },
    { id: 'insights', label: '分析知識', icon: 'BarChart3', order: 6 },
    { id: 'admin', label: '系統管理', icon: 'Settings', order: 7 },
];

export const NAV_ITEMS: NavItemDef[] = [
    // ── ⚡ 緊急快捷（pinned）──
    { id: 'quick-report', icon: 'FileWarning', label: '快速通報', path: '/intake', group: 'emergency', order: 0, visible: true, isQuickAction: true, volunteerCore: true, emergencyCore: true, emergencyRank: 0 },
    { id: 'sos', icon: 'AlertCircle', label: 'SOS 求救', path: '/emergency/sos', group: 'emergency', order: 1, visible: true, isQuickAction: true, emergencyCore: true, emergencyRank: 90 },
    { id: 'evacuation', icon: 'Siren', label: '撤離資訊', path: '/emergency/evacuation', group: 'emergency', order: 2, visible: false, isQuickAction: true, emergencyCore: true, emergencyRank: 91 },
    { id: 'hotline', icon: 'Phone', label: '緊急專線', path: '/emergency/hotline', group: 'emergency', order: 3, visible: false, isQuickAction: true, emergencyCore: true, emergencyRank: 92 },

    // ── 🎯 應變指揮 (ops) ──
    { id: 'command-center', icon: 'LayoutDashboard', label: '戰情儀表板', path: '/command-center', group: 'ops', order: 0, visible: true, emergencyCore: true, emergencyRank: 10 },
    { id: 'incidents', icon: 'AlertTriangle', label: '事件列表', path: '/incidents', group: 'ops', order: 1, visible: true, emergencyCore: true, emergencyRank: 11 },
    { id: 'tasks', icon: 'ClipboardList', label: '任務看板', path: '/tasks', group: 'ops', order: 2, visible: true, volunteerCore: true, emergencyCore: true, emergencyRank: 1 },
    { id: 'ics-dashboard', icon: 'Target', label: 'ICS 派遣台', path: '/ics', group: 'ops', order: 3, visible: true, emergencyCore: true, emergencyRank: 12 },
    { id: 'ics-forms', icon: 'FileStack', label: 'ICS 表單', path: '/ops/ics-forms', group: 'ops', order: 4, visible: false },
    { id: 'notifications', icon: 'BellRing', label: '通知中心', path: '/hub/notifications', group: 'ops', order: 5, visible: true, volunteerCore: true },
    { id: 'offline', icon: 'HardDrive', label: '離線狀態', path: '/hub/offline', group: 'ops', order: 6, visible: false, emergencyCore: true, emergencyRank: 30 },

    // ── 🗺️ 情資地圖 (geo) ──
    { id: 'unified-map', icon: 'Map', label: '統一地圖', path: '/geo/map', group: 'geo', order: 0, visible: true, volunteerCore: true, emergencyCore: true, emergencyRank: 2 },
    { id: 'alerts', icon: 'Bell', label: '警報中心', path: '/hub/geo-alerts', group: 'geo', order: 1, visible: true, volunteerCore: true, emergencyCore: true, emergencyRank: 13 },
    { id: 'weather', icon: 'CloudRain', label: '氣象預報', path: '/hub/weather', group: 'geo', order: 2, visible: true },
    { id: 'shelters', icon: 'MapPin', label: '避難所', path: '/geo/shelters', group: 'geo', order: 3, visible: true, emergencyCore: true, emergencyRank: 14 },

    // ── 🏥 救援行動 (rescue) ──
    { id: 'triage', icon: 'Stethoscope', label: '傷患分類', path: '/rescue/triage', group: 'rescue', order: 0, visible: true, emergencyCore: true, emergencyRank: 3 },
    { id: 'search-rescue', icon: 'Search', label: '搜救任務', path: '/rescue/search-rescue', group: 'rescue', order: 1, visible: true, emergencyCore: true, emergencyRank: 15 },
    { id: 'reunification', icon: 'Users2', label: '家庭重聚', path: '/rescue/reunification', group: 'rescue', order: 2, visible: true },
    { id: 'medical-transport', icon: 'Truck', label: '醫療後送', path: '/rescue/medical-transport', group: 'rescue', order: 3, visible: false },
    { id: 'field-comms', icon: 'Radio', label: '現地通訊', path: '/rescue/field-comms', group: 'rescue', order: 4, visible: false, emergencyCore: true, emergencyRank: 16 },

    // ── 📦 資源後勤 (logistics) ──
    { id: 'inventory', icon: 'Package', label: '物資庫存', path: '/logistics/inventory', group: 'logistics', order: 0, visible: true, emergencyCore: true, emergencyRank: 17 },
    { id: 'equipment', icon: 'QrCode', label: '裝備管理', path: '/logistics/equipment', group: 'logistics', order: 1, visible: true },
    { id: 'donations', icon: 'Heart', label: '捐贈追蹤', path: '/logistics/donations', group: 'logistics', order: 2, visible: true },
    { id: 'unified-resources', icon: 'Combine', label: '資源整合', path: '/logistics/unified-resources', group: 'logistics', order: 3, visible: false },
    { id: 'approvals', icon: 'CheckSquare', label: '審批中心', path: '/approvals', group: 'logistics', order: 4, visible: true },

    // ── 👥 人員動員 (workforce) ──
    { id: 'people', icon: 'Users', label: '人員名冊', path: '/workforce/people', group: 'workforce', order: 0, visible: true, emergencyCore: true, emergencyRank: 18 },
    { id: 'shifts', icon: 'Calendar', label: '排班日曆', path: '/workforce/shifts', group: 'workforce', order: 1, visible: true, volunteerCore: true },
    { id: 'performance', icon: 'Trophy', label: '績效中心', path: '/workforce/performance', group: 'workforce', order: 2, visible: true },
    { id: 'community-hub', icon: 'Building2', label: '社區活動', path: '/community/hub', group: 'workforce', order: 3, visible: true, volunteerCore: true },
    { id: 'mental-health', icon: 'HeartHandshake', label: '心理支持', path: '/community/mental-health', group: 'workforce', order: 4, visible: false },

    // ── 📊 分析知識 (insights) ──
    { id: 'analytics', icon: 'BarChart3', label: '分析儀表板', path: '/hub/analytics', group: 'insights', order: 0, visible: true },
    { id: 'reports', icon: 'FileSpreadsheet', label: '報表中心', path: '/analytics/reports', group: 'insights', order: 1, visible: true },
    { id: 'unified-reporting', icon: 'Files', label: '綜合報表', path: '/analytics/unified-reporting', group: 'insights', order: 2, visible: false },
    { id: 'simulation-engine', icon: 'FlaskConical', label: '模擬引擎', path: '/analytics/simulation', group: 'insights', order: 3, visible: false },
    { id: 'ai-tasks', icon: 'Brain', label: 'AI 任務', path: '/hub/ai', group: 'insights', order: 4, visible: false },
    { id: 'ai-chat', icon: 'Bot', label: 'AI 助手', path: '/hub/ai-chat', group: 'insights', order: 5, visible: false },
    { id: 'training', icon: 'GraduationCap', label: '訓練課程', path: '/training', group: 'insights', order: 6, visible: true, volunteerCore: true },
    { id: 'manuals', icon: 'BookOpen', label: '作業手冊', path: '/knowledge/manuals', group: 'insights', order: 7, visible: true, volunteerCore: true },

    // ── ⚙️ 系統管理 (admin) ──
    { id: 'iam', icon: 'Lock', label: '權限管理', path: '/governance/iam', group: 'admin', order: 0, visible: true },
    { id: 'audit', icon: 'ScrollText', label: '審計日誌', path: '/governance/audit', group: 'admin', order: 1, visible: true },
    { id: 'security', icon: 'Shield', label: '安全中心', path: '/governance/security', group: 'admin', order: 2, visible: false },
    { id: 'interoperability', icon: 'Share2', label: '機構互通', path: '/governance/interoperability', group: 'admin', order: 3, visible: false },
    { id: 'monitor', icon: 'Activity', label: '系統監控', path: '/governance/monitor', group: 'admin', order: 4, visible: false },
    { id: 'webhooks', icon: 'Webhook', label: 'Webhook 管理', path: '/governance/webhooks', group: 'admin', order: 5, visible: false },
    { id: 'biometric', icon: 'Fingerprint', label: '生物辨識', path: '/governance/biometric', group: 'admin', order: 6, visible: false },
    { id: 'settings', icon: 'Settings', label: '系統設定', path: '/governance/settings', group: 'admin', order: 7, visible: false },
];
