/**
 * B3c icon 集 — 導覽/旗艦頁組（R5/T5）
 * 幾何規則見 IconBase.tsx 與 icons/README.md。
 */
import { createIcon } from './IconBase';

/** command 指揮儀表 — HQ 旗標（軍用地圖 HQ 記號：旗桿＋方旗＋基座） */
export const CommandIcon = createIcon(
    'CommandIcon',
    <>
        <path d="M7 21V3" />
        <path d="M7 4h11v7H7" />
        <path d="M4 21h7" />
    </>,
);

/** map 地圖 — 三摺圖幅＋摺線 */
export const MapIcon = createIcon(
    'MapIcon',
    <>
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
    </>,
);

/** tasks 任務 — 寫字夾板＋勾核 */
export const TasksIcon = createIcon(
    'TasksIcon',
    <>
        <rect x="5" y="4" width="14" height="17" />
        <path d="M9 4V2h6v2" />
        <path d="M9 13l2 2 4-5" />
    </>,
);

/** report 通報 — 摺角公文＋內文線 */
export const ReportIcon = createIcon(
    'ReportIcon',
    <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v4h4" />
        <path d="M9 12h6M9 16h6" />
    </>,
);

/** triage 傷檢 — 正十字（醫療十字單筆閉合多邊形） */
export const TriageIcon = createIcon(
    'TriageIcon',
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />,
);

/** inventory 物資 — 等角貨箱＋稜線 */
export const InventoryIcon = createIcon(
    'InventoryIcon',
    <>
        <path d="M3 8l9-5 9 5v9l-9 5-9-5V8z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v9" />
    </>,
);

/** teams 人員 — 併肩雙兵（方首＋梯形肩，共用中線） */
export const TeamsIcon = createIcon(
    'TeamsIcon',
    <>
        <rect x="5" y="5" width="4" height="4" />
        <rect x="15" y="5" width="4" height="4" />
        <path d="M2 19v-3l3-3h4l3 3v3" />
        <path d="M12 19v-3l3-3h4l3 3v3" />
    </>,
);

/** events 事件 — 菱形（MIL-STD-2525 事態框）＋驚嘆號 */
export const EventsIcon = createIcon(
    'EventsIcon',
    <>
        <path d="M12 4l8 8-8 8-8-8z" />
        <path d="M12 9v4" />
        <path d="M12 16v.01" />
    </>,
);

/** analytics 分析 — 基線＋三柱 */
export const AnalyticsIcon = createIcon(
    'AnalyticsIcon',
    <>
        <path d="M3 21h18" />
        <path d="M7 21v-8" />
        <path d="M12 21V6" />
        <path d="M17 21V11" />
    </>,
);

/** settings 設定 — 三軌滑桿＋方形旋鈕 */
export const SettingsIcon = createIcon(
    'SettingsIcon',
    <>
        <path d="M3 6h18" />
        <path d="M3 12h18" />
        <path d="M3 18h18" />
        <rect x="14" y="4" width="4" height="4" />
        <rect x="6" y="10" width="4" height="4" />
        <rect x="11" y="16" width="4" height="4" />
    </>,
);
