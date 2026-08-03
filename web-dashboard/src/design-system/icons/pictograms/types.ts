/**
 * B3c 圖文系統 — 共用型別（R5/T5）
 * ---------------------------------------------------------------------------
 * 所有象形／狀態章元件統一 props 形狀：`size` 控制渲染邊長（正方形），
 * 其餘 SVG props 透傳（className / style / aria-* / role …）。
 * 色彩一律由 `currentColor` 繼承，元件本身不帶任何色碼。
 */
import type React from 'react';

export type PictogramProps = { size?: number } & React.SVGProps<SVGSVGElement>;
