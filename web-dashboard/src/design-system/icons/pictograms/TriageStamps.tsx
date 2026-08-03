/**
 * START 傷檢分級章 4 枚（B3c 野戰手冊圖文系統，R5/T5）
 * ---------------------------------------------------------------------------
 * 形狀雙編碼（MIL-STD-2525 精神：形＋色雙通道＝色盲安全），對齊 TriagePage
 * 現行 LevelSquare 範式：
 *   IMMEDIATE（紅）＝■ 實心    DELAYED（黃）＝◧ 半填
 *   MINOR（綠）＝□ 描邊       EXPECTANT（黑）＝方框帶 ×
 * 元件只畫形，色由 currentColor；紅語意等由使用端以 token 上色
 * （DESIGN_LANGUAGE v2 §D：紅只給生命／安全——BLACK 傷票屬之）。
 */
import React from 'react';
import type { PictogramProps } from './types';
import { OutlineSquareStamp, SolidSquareStamp } from './StatusStamps';

/** START 分級 key（對齊 TriagePage 的 TriageLevel 字面值）。 */
export type TriageLevelKey = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

/** IMMEDIATE（立即·紅）＝■ 實心方章。 */
export const TriageImmediateStamp: React.FC<PictogramProps> = SolidSquareStamp;

/** DELAYED（延遲·黃）＝◧ 半填方章：描邊方框＋左半實填。 */
export const TriageDelayedStamp: React.FC<PictogramProps> = ({ size = 24, ...props }) => (
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
        <path d="M4 4 H20 V20 H4 Z" />
        <path d="M4 4 H12 V20 H4 Z" fill="currentColor" stroke="none" />
    </svg>
);

/** MINOR（輕傷·綠）＝□ 描邊方章。 */
export const TriageMinorStamp: React.FC<PictogramProps> = OutlineSquareStamp;

/** EXPECTANT（瀕危·黑）＝方框帶 ×。 */
export const TriageExpectantStamp: React.FC<PictogramProps> = ({ size = 24, ...props }) => (
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
        <path d="M4 4 H20 V20 H4 Z" />
        <path d="M8.5 8.5 L15.5 15.5" />
        <path d="M15.5 8.5 L8.5 15.5" />
    </svg>
);

/** 分級 → 章 對照表（key 對齊 TriagePage 的 RED/YELLOW/GREEN/BLACK）。 */
export const triageStampRegistry: Record<TriageLevelKey, React.FC<PictogramProps>> = {
    RED: TriageImmediateStamp,
    YELLOW: TriageDelayedStamp,
    GREEN: TriageMinorStamp,
    BLACK: TriageExpectantStamp,
};
