/**
 * 災型分類法（前端 SSOT）— CD-1 / C1.1
 * ---------------------------------------------------------------------------
 * 擴充前，八個災型的 label／emoji／色碼各自硬編在 ReportPage、ReportsAdminPage、
 * EventsPage、AiResultCard 等四處。本檔把它們收斂成單一來源，之後再加災型只需
 * 改這裡。後端對應檔為 `backend/src/modules/reports/disaster-types.ts`。
 *
 * 設計論證見 docs/architecture/CIVIL_DEFENSE_TAXONOMY.md。
 *
 * 向後相容硬要求：既有 8 類的 label / emoji / color **逐字沿用**擴充前各頁的
 * 原值（來源：EventsPage.tsx 與 ReportsAdminPage.tsx 的 TYPE_CONFIG），因此既有
 * 頁面的視覺輸出與擴充前完全相同。
 */

import {
    Biohazard,
    Bomb,
    Building2,
    Car,
    CircleHelp,
    CloudRainWind,
    Flame,
    Mountain,
    ShieldAlert,
    Siren,
    Users,
    Waves,
    Wind,
    type LucideIcon,
} from 'lucide-react';
import type { ReportType } from '../api/services/reports';

export interface DisasterTypeMeta {
    /** 中文標籤 */
    label: string;
    /** 既有頁面沿用的 emoji（保留以免既有視覺改變） */
    emoji: string;
    /** lucide 圖標，新版 UI 與民防分組使用 */
    Icon: LucideIcon;
    /**
     * 類別色。既有 8 類為擴充前的原始 hex（bespoke categorical palette，
     * 無 1:1 semantic token 對應）；民防四類取 design token 的
     * --color-danger / --color-critical 家族值作為 fallback。
     */
    color: string;
    /** 通報表單上的一行說明 */
    description: string;
    /** 是否為 D16 新增的民防類別 */
    civilDefense: boolean;
}

export const LEGACY_DISASTER_TYPES = [
    'earthquake',
    'flood',
    'fire',
    'typhoon',
    'landslide',
    'traffic',
    'infrastructure',
    'other',
] as const satisfies readonly ReportType[];

export const CIVIL_DEFENSE_DISASTER_TYPES = [
    'air_raid',
    'explosion',
    'terror_attack',
    'cbrn',
] as const satisfies readonly ReportType[];

/**
 * 災型中繼資料。
 * `Record<ReportType, …>` 是刻意的：union 加值時 TypeScript 會在這裡報錯，
 * 逼迫新增者補齊標籤與圖標。
 */
export const DISASTER_TYPE_META: Record<ReportType, DisasterTypeMeta> = {
    // ---- 既有 8 類：label / emoji / color 為擴充前原值，不得更動 ----
    earthquake: {
        label: '地震',
        emoji: '🌍',
        Icon: Waves,
        color: '#795548',
        description: '地震造成的損害',
        civilDefense: false,
    },
    flood: {
        label: '淹水',
        emoji: '🌊',
        Icon: CloudRainWind,
        color: '#2196F3',
        description: '淹水、積水情況',
        civilDefense: false,
    },
    fire: {
        label: '火災',
        emoji: '🔥',
        Icon: Flame,
        color: '#FF5722',
        description: '火災、濃煙、瓦斯氣爆',
        civilDefense: false,
    },
    typhoon: {
        label: '颱風',
        emoji: '🌀',
        Icon: Wind,
        color: '#00BCD4',
        description: '颱風、強風災害',
        civilDefense: false,
    },
    landslide: {
        label: '土石流',
        emoji: '⛰️',
        Icon: Mountain,
        color: '#795548',
        description: '山崩、土石滑動',
        civilDefense: false,
    },
    traffic: {
        label: '交通事故',
        emoji: '🚗',
        Icon: Car,
        color: '#FF9800',
        description: '車禍、道路阻塞',
        civilDefense: false,
    },
    infrastructure: {
        label: '設施損壞',
        emoji: '🏗️',
        Icon: Building2,
        color: '#F44336',
        description: '建築、設施損毀',
        civilDefense: false,
    },
    other: {
        label: '其他',
        emoji: '📋',
        Icon: CircleHelp,
        color: '#607D8B',
        description: '其他緊急狀況',
        civilDefense: false,
    },

    // ---- D16 民防類別（CD-1）----
    air_raid: {
        label: '空襲／砲擊',
        emoji: '🚨',
        Icon: Siren,
        color: '#B71C1C',
        description: '空襲、砲擊、飛彈、防空警報',
        civilDefense: true,
    },
    explosion: {
        label: '爆炸／爆裂物',
        emoji: '💥',
        Icon: Bomb,
        color: '#E64A19',
        description: '爆裂物、可疑包裹、不明爆炸',
        civilDefense: true,
    },
    terror_attack: {
        label: '恐怖攻擊',
        emoji: '🛡️',
        Icon: ShieldAlert,
        color: '#880E4F',
        description: '槍擊、持刀攻擊、挾持人質',
        civilDefense: true,
    },
    cbrn: {
        label: '化生放核',
        emoji: '☣️',
        Icon: Biohazard,
        color: '#6A1B9A',
        description: '化學／生物／放射／核事件',
        civilDefense: true,
    },
};

/** 大量傷患（MCI）— 跨災型旗標，不是一個災型 */
export const MASS_CASUALTY_META = {
    label: '大量傷患',
    emoji: '🚑',
    Icon: Users,
    color: '#C2185B',
    description: '現場傷患數量超出救護能量',
} as const;

/** 通報表單的災型選項（既有 8 類在前，民防類在後） */
export const DISASTER_TYPE_OPTIONS: Array<{ value: ReportType } & DisasterTypeMeta> = (
    [...LEGACY_DISASTER_TYPES, ...CIVIL_DEFENSE_DISASTER_TYPES] as ReportType[]
).map((value) => ({ value, ...DISASTER_TYPE_META[value] }));

/** 通報表單／篩選用的分組（民防類獨立成組，避免與天災混在一起誤選） */
export const DISASTER_TYPE_GROUPS: Array<{
    title: string;
    options: Array<{ value: ReportType } & DisasterTypeMeta>;
}> = [
    {
        title: '天災／一般事故',
        options: DISASTER_TYPE_OPTIONS.filter((o) => !o.civilDefense),
    },
    {
        title: '民防／人為事件',
        options: DISASTER_TYPE_OPTIONS.filter((o) => o.civilDefense),
    },
];

/** 取得災型中繼資料（未知值退回 other，避免舊資料或後端新值讓頁面壞掉） */
export function getDisasterTypeMeta(type: ReportType | string | undefined): DisasterTypeMeta {
    if (type && type in DISASTER_TYPE_META) {
        return DISASTER_TYPE_META[type as ReportType];
    }
    return DISASTER_TYPE_META.other;
}

/** 取得災型顏色（地圖 marker／徽章共用） */
export function getDisasterTypeColor(type: ReportType | string | undefined): string {
    return getDisasterTypeMeta(type).color;
}

/** 是否為民防災型 */
export function isCivilDefenseType(type: ReportType | string | undefined): boolean {
    return getDisasterTypeMeta(type).civilDefense;
}
