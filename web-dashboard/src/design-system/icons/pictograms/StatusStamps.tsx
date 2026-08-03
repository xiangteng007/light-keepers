/**
 * 通用狀態章 5 枚（B3c 野戰手冊圖文系統，R5/T5）
 * ---------------------------------------------------------------------------
 * 供 UI 中的 ■ □ ✓ ▲ ● 字元升級為對齊像素的元件：24×24 網格、stroke 2、
 * 幾何直角、square cap ＋ miter join。元件只畫形，色一律由 currentColor 繼承
 * （狀態語意色由使用端以 token 上色，見 DESIGN_LANGUAGE v2 §D 紅色憲法）。
 */
import React from 'react';
import type { PictogramProps } from './types';

/** 24×24 描邊章外框（stroke 2 描邊制）。 */
const StrokeStamp: React.FC<PictogramProps> = ({ size = 24, children, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
        {...props}
    >
        {children}
    </svg>
);

/** 24×24 實心章外框（fill 制——實心變體才用 fill）。 */
const FillStamp: React.FC<PictogramProps> = ({ size = 24, children, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="none"
        aria-hidden="true"
        {...props}
    >
        {children}
    </svg>
);

/** ■ 實心方章。 */
export const SolidSquareStamp: React.FC<PictogramProps> = (props) => (
    <FillStamp {...props}>
        <path d="M4 4 H20 V20 H4 Z" />
    </FillStamp>
);

/** □ 描邊方章。 */
export const OutlineSquareStamp: React.FC<PictogramProps> = (props) => (
    <StrokeStamp {...props}>
        <path d="M4 4 H20 V20 H4 Z" />
    </StrokeStamp>
);

/** ✓ 勾章（全直線段）。 */
export const CheckStamp: React.FC<PictogramProps> = (props) => (
    <StrokeStamp {...props}>
        <path d="M4 13 L9.5 18.5 L20 6" />
    </StrokeStamp>
);

/** ▲ 實心三角章。 */
export const TriangleStamp: React.FC<PictogramProps> = (props) => (
    <FillStamp {...props}>
        <path d="M12 4 L21 20 H3 Z" />
    </FillStamp>
);

/** ● 點章——B3c 禁圓，以幾何八角形代圓；小尺寸下讀作實心點。 */
export const DotStamp: React.FC<PictogramProps> = (props) => (
    <FillStamp {...props}>
        <path d="M9.5 6 H14.5 L18 9.5 V14.5 L14.5 18 H9.5 L6 14.5 V9.5 Z" />
    </FillStamp>
);
