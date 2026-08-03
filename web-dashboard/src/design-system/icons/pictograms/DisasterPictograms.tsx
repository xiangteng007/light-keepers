/**
 * 災型象形 12 枚（B3c 野戰手冊圖文系統，R5/T5）
 * ---------------------------------------------------------------------------
 * 比 icon 更「圖例」：32×32 網格、筆畫 2.5、幾何直角、軍事教範圖例感。
 * 一律 stroke="currentColor" fill="none"（無實心變體），square cap ＋ miter join，
 * 每枚 3–7 筆畫內完成，一眼可辨勝過精緻。
 *
 * key 對齊前端災型 SSOT：`src/constants/disasterTypes.ts`（ReportType 12 值）。
 * 新增災型時 `disasterPictogramRegistry` 的 Record<ReportType, …> 會編譯報錯，
 * 逼迫補齊象形——與 DISASTER_TYPE_META 相同的窮舉紀律。
 */
import React from 'react';
import type { ReportType } from '../../../api/services/reports';
import type { PictogramProps } from './types';

/** 32×32 象形外框：stroke 2.5 描邊制，色由 currentColor。 */
const Pictogram: React.FC<PictogramProps> = ({ size = 32, children, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
        {...props}
    >
        {children}
    </svg>
);

/** 地震：斷層線——左右地表錯位＋閃電形裂縫，兩短豎為地層錯動記號。 */
export const EarthquakePictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M2 20 H10 L13 26 L17 7 L20 14 H30" />
        <path d="M6 20 V25" />
        <path d="M25 14 V19" />
    </Pictogram>
);

/** 淹水：水位線——▽ 水位標＋兩道方波水線（幾何直角，不用有機波浪）。 */
export const FloodPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M11 3 H21 L16 9 Z" />
        <path d="M2 14 H6 V18 H10 V14 H14 V18 H18 V14 H22 V18 H26 V14 H30" />
        <path d="M2 23 H6 V27 H10 V23 H14 V27 H18 V23 H22 V27 H26 V23 H30" />
    </Pictogram>
);

/** 火災：三束角形火舌（全直線段）＋基線。 */
export const FirePictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M8 28 L11 14 L14 19 L16 4 L18 19 L21 14 L24 28" />
        <path d="M5 28 H27" />
    </Pictogram>
);

/** 颱風：旋——矩形螺線（直角化的氣旋），單筆畫由外收向中心。 */
export const TyphoonPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M28 6 H6 V26 H24 V12 H12 V20 H18" />
    </Pictogram>
);

/** 土石流：坡＋落石——崖頂平台、斜坡面、坡趾走出線，兩枚方形落石懸於坡上。 */
export const LandslidePictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M2 9 H7 L23 27 H30" />
        <path d="M11 7 H15 V11 H11 Z" />
        <path d="M19 13 H23 V17 H19 Z" />
    </Pictogram>
);

/** 交通事故：車禍——側視車體＋兩方形車輪＋車頭三道撞擊短線。 */
export const TrafficPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M5 23 V18 H9 L12 13 H20 L23 18 H27 V23 H5 Z" />
        <path d="M7 23 H11 V27 H7 Z" />
        <path d="M20 23 H24 V27 H20 Z" />
        <path d="M25 10 L28 7" />
        <path d="M27 15 H30" />
        <path d="M22 7 V4" />
    </Pictogram>
);

/** 設施損壞：建物裂——矩形建物立面自屋頂到地面的閃電形裂縫＋地面線。 */
export const InfrastructurePictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M2 28 H30" />
        <path d="M7 28 V4 H25 V28" />
        <path d="M16 4 L13 11 L18 16 L14 22 L17 28" />
    </Pictogram>
);

/** 其他：直角化問號＋方點。 */
export const OtherPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M10 12 V6 H22 V17 H16 V21" />
        <path d="M16 26 V28" />
    </Pictogram>
);

/** 空襲／砲擊：落彈——尾翼橫線＋彈體下指、兩側下墜速度線、下方地面線。 */
export const AirRaidPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M6 6 V12" />
        <path d="M26 6 V12" />
        <path d="M10 4 H22" />
        <path d="M12.5 4 V15 L16 21.5 L19.5 15 V4" />
        <path d="M4 27 H28" />
    </Pictogram>
);

/** 爆炸／爆裂物：爆星——四芒星形爆心＋四向斜射短線。 */
export const ExplosionPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M16 3 L19 13 L29 16 L19 19 L16 29 L13 19 L3 16 L13 13 Z" />
        <path d="M24 8 L27 5" />
        <path d="M24 24 L27 27" />
        <path d="M8 24 L5 27" />
        <path d="M8 8 L5 5" />
    </Pictogram>
);

/** 恐怖攻擊：盾＋驚嘆——平頂角形盾牌，內置驚嘆號（豎線＋方點）。 */
export const TerrorAttackPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M4 6 H28 V15 L16 29 L4 15 Z" />
        <path d="M16 11 V19" />
        <path d="M16 23 V25" />
    </Pictogram>
);

/** 化生放核：三葉幾何化——三片梯形葉 120° 環列＋中央方核。 */
export const CbrnPictogram: React.FC<PictogramProps> = (props) => (
    <Pictogram {...props}>
        <path d="M11 3 H21 L18.5 9.5 H13.5 Z" />
        <path d="M11 3 H21 L18.5 9.5 H13.5 Z" transform="rotate(120 16 16)" />
        <path d="M11 3 H21 L18.5 9.5 H13.5 Z" transform="rotate(240 16 16)" />
        <path d="M13.75 13.75 H18.25 V18.25 H13.75 Z" />
    </Pictogram>
);

/**
 * 災型 → 象形 對照表（key 與 ReportType SSOT 逐字對齊）。
 * `Record<ReportType, …>` 是刻意的：SSOT union 加值時這裡會編譯報錯。
 */
export const disasterPictogramRegistry: Record<ReportType, React.FC<PictogramProps>> = {
    earthquake: EarthquakePictogram,
    flood: FloodPictogram,
    fire: FirePictogram,
    typhoon: TyphoonPictogram,
    landslide: LandslidePictogram,
    traffic: TrafficPictogram,
    infrastructure: InfrastructurePictogram,
    other: OtherPictogram,
    air_raid: AirRaidPictogram,
    explosion: ExplosionPictogram,
    terror_attack: TerrorAttackPictogram,
    cbrn: CbrnPictogram,
};
