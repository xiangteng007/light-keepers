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

/** theme 對比切換 — 方框族＋中分線＋半面 45° 剖面線（工程圖「實體」畫法＝半填圓的直角重譯） */
export const ThemeIcon = createIcon(
    'ThemeIcon',
    <>
        <rect x="4" y="4" width="16" height="16" />
        <path d="M12 4v16" />
        <path d="M12 12l8-8M12 20l8-8" />
    </>,
);

/* ── R5/T6 chrome 批 ── */

/** grip 拖曳柄 — 2×3 方點方陣（方點律） */
export const GripIcon = createIcon(
    'GripIcon',
    <>
        <path d="M9 6v.01M15 6v.01" />
        <path d="M9 12v.01M15 12v.01" />
        <path d="M9 18v.01M15 18v.01" />
    </>,
);

/** eye 顯示 — 菱形眼眶＋方瞳（可視性開） */
export const EyeIcon = createIcon(
    'EyeIcon',
    <>
        <path d="M2 12l10-7 10 7-10 7z" />
        <rect x="10" y="10" width="4" height="4" />
    </>,
);

/** eye-off 隱藏 — 菱形眼眶＋45° 斬斷線（offline 同律：斬斷＝失效，瞳孔省略） */
export const EyeOffIcon = createIcon(
    'EyeOffIcon',
    <>
        <path d="M2 12l10-7 10 7-10 7z" />
        <path d="M3 3l18 18" />
    </>,
);

/** rotate 迴轉/重置 — 直角迴圈單箭（sync 同族減半，逆時針） */
export const RotateIcon = createIcon(
    'RotateIcon',
    <>
        <path d="M4 9v10h16V9h-9" />
        <path d="M14 6l-3 3 3 3" />
    </>,
);

/** fullscreen 全螢幕 — 四角取景框 */
export const FullscreenIcon = createIcon(
    'FullscreenIcon',
    <>
        <path d="M4 9V4h5" />
        <path d="M15 4h5v5" />
        <path d="M20 15v5h-5" />
        <path d="M9 20H4v-5" />
    </>,
);

/** link 連結 — 鏈節直角重譯：對向雙扣框＋連桿 */
export const LinkIcon = createIcon(
    'LinkIcon',
    <>
        <path d="M9 8H4v8h5" />
        <path d="M15 8h5v8h-5" />
        <path d="M8 12h8" />
    </>,
);

/** copy 複製 — 疊框：前頁框＋後頁雙邊（files 同族簡化） */
export const CopyIcon = createIcon(
    'CopyIcon',
    <>
        <rect x="8" y="8" width="12" height="12" />
        <path d="M16 4H4v12" />
    </>,
);

/** download 下載 — 下箭入地線（export 托盤族外，與 upload 鏡像成對） */
export const DownloadIcon = createIcon(
    'DownloadIcon',
    <>
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M4 20h16" />
    </>,
);

/** upload 上傳 — 上箭離地線（download 垂直鏡像） */
export const UploadIcon = createIcon(
    'UploadIcon',
    <>
        <path d="M12 15V3" />
        <path d="M7 8l5-5 5 5" />
        <path d="M4 20h16" />
    </>,
);

/** play 播放 — 直角三角右指楔（45° 律） */
export const PlayIcon = createIcon(
    'PlayIcon',
    <path d="M9 5v14l7-7z" />,
);

/** pause 暫停 — 雙豎槓 */
export const PauseIcon = createIcon(
    'PauseIcon',
    <>
        <path d="M8 5v14" />
        <path d="M16 5v14" />
    </>,
);
