/**
 * B3c icon 集 — 文件/資料組（R5/T5b）
 * 幾何規則見 IconBase.tsx 與 icons/README.md。
 * 頁形家族：report（摺角公文）在 nav.tsx，此組共用「方頁框」語彙，內容物區分語義。
 */
import { createIcon } from './IconBase';

/** book 手冊 — 硬皮教範：封面＋裝訂線＋題名線 */
export const BookIcon = createIcon(
    'BookIcon',
    <>
        <rect x="5" y="3" width="14" height="18" />
        <path d="M9 3v18" />
        <path d="M12 8h4M12 12h4" />
    </>,
);

/** calendar 日曆 — 頁框＋裝訂柱＋欄首線＋日期方點（方點律） */
export const CalendarIcon = createIcon(
    'CalendarIcon',
    <>
        <rect x="3" y="5" width="18" height="16" />
        <path d="M8 3v4M16 3v4" />
        <path d="M3 10h18" />
        <path d="M8 14v.01M12 14v.01M16 14v.01M8 18v.01M12 18v.01" />
    </>,
);

/** audit 稽核 — 登記清單：頁框＋條目方點＋條目線 */
export const AuditIcon = createIcon(
    'AuditIcon',
    <>
        <rect x="4" y="3" width="16" height="18" />
        <path d="M8 8v.01M8 12v.01M8 16v.01" />
        <path d="M11 8h5M11 12h5M11 16h5" />
    </>,
);

/** files 檔案 — 疊頁：前頁框＋後頁摺出 */
export const FilesIcon = createIcon(
    'FilesIcon',
    <>
        <rect x="3" y="8" width="13" height="13" />
        <path d="M7 8V4h13v13h-4" />
    </>,
);

/** spreadsheet 試算表 — 格線頁：頁框＋橫格＋縱欄 */
export const SpreadsheetIcon = createIcon(
    'SpreadsheetIcon',
    <>
        <rect x="4" y="3" width="16" height="18" />
        <path d="M4 9h16M4 15h16" />
        <path d="M10 9v12" />
    </>,
);

/** doc-empty 空文件 — 摺角頁＋45° 斜線（空狀態；report 同族去內文） */
export const DocEmptyIcon = createIcon(
    'DocEmptyIcon',
    <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v4h4" />
        <path d="M8 17l8-8" />
    </>,
);
