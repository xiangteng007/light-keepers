/**
 * B3c icon 集 — 狀態/告警組（R5/T5）
 * 幾何規則見 IconBase.tsx 與 icons/README.md。
 * 告警三形制：三角=警告、菱形=事件（nav.tsx）、八角=SOS（field.tsx）。
 */
import { createIcon } from './IconBase';

/** notify 通知 — 稜角鐘形＋鐘舌 */
export const NotifyIcon = createIcon(
    'NotifyIcon',
    <>
        <path d="M19 17H5v-1l2-3V8l3-3h4l3 3v5l2 3v1z" />
        <path d="M10 20h4" />
    </>,
);

/** warning 警告 — 三角＋驚嘆號（EFIS Caution 語義，一般錯誤走琥珀） */
export const WarningIcon = createIcon(
    'WarningIcon',
    <>
        <path d="M12 3L2 20h20z" />
        <path d="M12 10v4" />
        <path d="M12 17v.01" />
    </>,
);

/** info 資訊 — 方框＋i */
export const InfoIcon = createIcon(
    'InfoIcon',
    <>
        <rect x="4" y="4" width="16" height="16" />
        <path d="M12 11v5" />
        <path d="M12 8v.01" />
    </>,
);

/** clock 時鐘 — 方形錶面＋直角指針（等寬讀數的圖形對應） */
export const ClockIcon = createIcon(
    'ClockIcon',
    <>
        <rect x="4" y="4" width="16" height="16" />
        <path d="M12 8v4h4" />
    </>,
);

/** sync 同步 — 直角迴圈雙箭頭 */
export const SyncIcon = createIcon(
    'SyncIcon',
    <>
        <path d="M4 9V5h12" />
        <path d="M13 2l3 3-3 3" />
        <path d="M20 15v4H8" />
        <path d="M11 22l-3-3 3-3" />
    </>,
);

/** online 連線 — 45° 折角訊號波＋方點 */
export const OnlineIcon = createIcon(
    'OnlineIcon',
    <>
        <path d="M4 10l8-8 8 8" />
        <path d="M8 14l4-4 4 4" />
        <path d="M12 19v.01" />
    </>,
);

/** offline 離線 — 單道訊號波＋45° 斬斷線（波退一級＝訊號失效） */
export const OfflineIcon = createIcon(
    'OfflineIcon',
    <>
        <path d="M4 10l8-8 8 8" />
        <path d="M12 19v.01" />
        <path d="M3 3l18 18" />
    </>,
);
