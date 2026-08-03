/**
 * B3c icon 集 — 操作/工具組（R5/T5）
 * 幾何規則見 IconBase.tsx 與 icons/README.md。
 */
import { createIcon } from './IconBase';

/** search 搜尋 — 方形鏡片＋45° 握柄 */
export const SearchIcon = createIcon(
    'SearchIcon',
    <>
        <rect x="4" y="4" width="10" height="10" />
        <path d="M14 14l6 6" />
    </>,
);

/** layers 圖層 — 菱形疊片＋兩道層線 */
export const LayersIcon = createIcon(
    'LayersIcon',
    <>
        <path d="M12 3l9 5-9 5-9-5z" />
        <path d="M21 12l-9 5-9-5" />
        <path d="M21 16l-9 5-9-5" />
    </>,
);

/** edit 編輯 — 45° 平頭鉛筆＋筆頭分界線 */
export const EditIcon = createIcon(
    'EditIcon',
    <>
        <path d="M4 20l1-5L16 4l4 4L9 19l-5 1z" />
        <path d="M14 6l4 4" />
    </>,
);

/** close 關閉 — 斜十字 */
export const CloseIcon = createIcon(
    'CloseIcon',
    <>
        <path d="M5 5l14 14" />
        <path d="M19 5L5 19" />
    </>,
);

/** check 勾核 — 單筆折線 */
export const CheckIcon = createIcon(
    'CheckIcon',
    <path d="M4 13l5 5L20 7" />,
);

/** plus 增加 — 正十字線 */
export const PlusIcon = createIcon(
    'PlusIcon',
    <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </>,
);

/** minus 減少 — 單橫線 */
export const MinusIcon = createIcon(
    'MinusIcon',
    <path d="M5 12h14" />,
);

/** filter 篩選 — 漏斗（單筆閉合多邊形） */
export const FilterIcon = createIcon(
    'FilterIcon',
    <path d="M3 4h18l-7 8v7l-4 2v-9z" />,
);

/** export 匯出 — 托盤＋上出箭頭 */
export const ExportIcon = createIcon(
    'ExportIcon',
    <>
        <path d="M4 14v6h16v-6" />
        <path d="M12 15V3" />
        <path d="M7 8l5-5 5 5" />
    </>,
);

/** user 使用者 — 方首＋梯形肩（teams 同族放大版） */
export const UserIcon = createIcon(
    'UserIcon',
    <>
        <rect x="8" y="3" width="8" height="7" />
        <path d="M4 21v-3l4-4h8l4 4v3" />
    </>,
);

/** logout 登出 — 門框＋右出箭頭 */
export const LogoutIcon = createIcon(
    'LogoutIcon',
    <>
        <path d="M15 4H5v16h10" />
        <path d="M10 12h10" />
        <path d="M16 8l4 4-4 4" />
    </>,
);
