/**
 * B3c 野戰手冊圖形文法 — icon 基座（R5/T5）
 *
 * 鐵律（見 icons/README.md 與 docs/architecture/DESIGN_LANGUAGE.md v2）：
 * - viewBox 24×24、stroke 2、stroke-linecap="square"、stroke-linejoin="miter"
 * - 預設 stroke="currentColor" fill="none"（實心變體才准用 fill）
 * - 幾何直角＋45° 斜線；禁圓潤有機曲線（無 circle / 無 arc / 無貝茲）
 * - 每個圖形 3–7 筆畫內完成；一眼可辨勝過精緻
 */
import React from 'react';

/** 所有 icon 的統一 props：size 一個數字同時控制寬高，其餘透傳 SVG 屬性。 */
export type LkIconProps = { size?: number } & React.SVGProps<SVGSVGElement>;

/** icon 元件型別（iconRegistry 的 value 型別）。 */
export type LkIcon = React.FC<LkIconProps>;

/**
 * 建立一個符合圖形文法的 icon 元件。
 * children 只放幾何（path / rect / line…），樣式屬性一律由基座統一，
 * 保證整套 icon 並排時筆畫與光學重量一致（同一本教範的圖例頁）。
 */
export const createIcon = (displayName: string, children: React.ReactNode): LkIcon => {
    const Icon: LkIcon = ({ size = 24, ...props }) => (
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
            focusable="false"
            {...props}
        >
            {children}
        </svg>
    );
    Icon.displayName = displayName;
    return Icon;
};
