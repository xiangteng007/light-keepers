/**
 * B3c 野戰手冊 — 地圖符號 10 枚（R5/T5）
 *
 * MIL-STD-2525 簡化民用版。形狀＝陣營語意：
 *   菱（incident）＝事件、方（unit）＝我方單位、
 *   圓（facility）＝設施、三角（hazard）＝危害
 * 色由使用端決定（React 走 currentColor；MapLibre 走 toDataUri(color)）。
 *
 * 幾何座標皆落在 28×28 網格，外框距 viewBox 邊緣 ≥2（含 stroke 半寬），
 * 內部圖徽與外框保持 ≥1.5 淨空，確保 20px 地圖縮放下仍一眼可辨。
 */
import {
    createMapSymbolComponent,
    createMapSymbolToDataUri,
    type MapSymbolDefinition,
} from './createMapSymbol';

/* ────────────────────────────────────────────────
 * 菱＝事件（incident）
 * ──────────────────────────────────────────────── */

/** 事件通報：菱框＋驚嘆（豎槓＋實心方點） */
export const reportIncidentDefinition: MapSymbolDefinition = {
    id: 'report-incident',
    label: '事件通報',
    shape: 'incident',
    shapes: [
        { tag: 'polygon', attrs: { points: '14,2.5 25.5,14 14,25.5 2.5,14' } },
        { tag: 'line', attrs: { x1: 14, y1: 8, x2: 14, y2: 15 } },
        { tag: 'rect', attrs: { x: 12.5, y: 17.5, width: 3, height: 3 }, solid: true },
    ],
};
export const ReportIncidentSymbol = createMapSymbolComponent(reportIncidentDefinition);
export const reportIncidentToDataUri = createMapSymbolToDataUri(reportIncidentDefinition);

/**
 * SOS 求援：菱框＋實心閃電。
 * 紅語意由使用端傳入（紅色憲法：紅只給生命/安全——SOS 屬之；
 * 使用端應解析 --status-danger 實際色值後傳給 toDataUri / CSS color）。
 */
export const sosDefinition: MapSymbolDefinition = {
    id: 'sos',
    label: 'SOS 求援',
    shape: 'incident',
    shapes: [
        { tag: 'polygon', attrs: { points: '14,2.5 25.5,14 14,25.5 2.5,14' } },
        {
            tag: 'polygon',
            attrs: { points: '16,6 9.5,15 14,15 12,22 18.5,12 14,12' },
            solid: true,
        },
    ],
};
export const SosSymbol = createMapSymbolComponent(sosDefinition);
export const sosToDataUri = createMapSymbolToDataUri(sosDefinition);

/* ────────────────────────────────────────────────
 * 方＝我方單位（unit）
 * ──────────────────────────────────────────────── */

/** 任務小隊：方框＋人形（頭圓＋斜肩軀幹，全直線） */
export const teamDefinition: MapSymbolDefinition = {
    id: 'team',
    label: '任務小隊',
    shape: 'unit',
    shapes: [
        { tag: 'rect', attrs: { x: 4, y: 4, width: 20, height: 20 } },
        { tag: 'circle', attrs: { cx: 14, cy: 10.5, r: 3 } },
        { tag: 'path', attrs: { d: 'M9,20.5 V18 L12,15.5 H16 L19,18 V20.5' } },
    ],
};
export const TeamSymbol = createMapSymbolComponent(teamDefinition);
export const teamToDataUri = createMapSymbolToDataUri(teamDefinition);

/**
 * 集結點：方框＋旗（旗桿＋實心方旗面）。
 * 旗面採實心變體——空心旗面會與旗桿合讀成字母 P（誤認停車格），
 * 實心旗一眼可辨，並與 hq 的空心旗面形成區別。
 */
export const rallyDefinition: MapSymbolDefinition = {
    id: 'rally',
    label: '集結點',
    shape: 'unit',
    shapes: [
        { tag: 'rect', attrs: { x: 4, y: 4, width: 20, height: 20 } },
        { tag: 'line', attrs: { x1: 10, y1: 8, x2: 10, y2: 20.5 } },
        { tag: 'rect', attrs: { x: 10, y: 8, width: 8.5, height: 5.5 }, solid: true },
    ],
};
export const RallySymbol = createMapSymbolComponent(rallyDefinition);
export const rallyToDataUri = createMapSymbolToDataUri(rallyDefinition);

/**
 * 指揮所：方旗面＋旗桿（MIL-STD-2525 HQ 慣例——
 * 單位框本身即旗面，旗桿自框左下角垂下）。
 */
export const hqDefinition: MapSymbolDefinition = {
    id: 'hq',
    label: '指揮所',
    shape: 'unit',
    shapes: [
        { tag: 'rect', attrs: { x: 6.5, y: 5, width: 16.5, height: 11.5 } },
        { tag: 'line', attrs: { x1: 6.5, y1: 16.5, x2: 6.5, y2: 25.5 } },
    ],
};
export const HqSymbol = createMapSymbolComponent(hqDefinition);
export const hqToDataUri = createMapSymbolToDataUri(hqDefinition);

/* ────────────────────────────────────────────────
 * 圓＝設施（facility）
 * ──────────────────────────────────────────────── */

/** 收容所：圓框＋屋（山形屋頂＋直牆） */
export const shelterDefinition: MapSymbolDefinition = {
    id: 'shelter',
    label: '收容所',
    shape: 'facility',
    shapes: [
        { tag: 'circle', attrs: { cx: 14, cy: 14, r: 11 } },
        { tag: 'polyline', attrs: { points: '7.5,14 14,7.5 20.5,14' } },
        { tag: 'path', attrs: { d: 'M10,13.5 V20.5 H18 V13.5' } },
    ],
};
export const ShelterSymbol = createMapSymbolComponent(shelterDefinition);
export const shelterToDataUri = createMapSymbolToDataUri(shelterDefinition);

/** AED 站點：圓框＋心電折線（單筆 polyline，直線鋸齒） */
export const aedDefinition: MapSymbolDefinition = {
    id: 'aed',
    label: 'AED 站點',
    shape: 'facility',
    shapes: [
        { tag: 'circle', attrs: { cx: 14, cy: 14, r: 11 } },
        {
            tag: 'polyline',
            attrs: { points: '6.5,14 10.5,14 12.5,8.5 15.5,19.5 17.5,14 21.5,14' },
        },
    ],
};
export const AedSymbol = createMapSymbolComponent(aedDefinition);
export const aedToDataUri = createMapSymbolToDataUri(aedDefinition);

/** 物資倉庫：圓框＋物資箱（箱體＋封條線） */
export const warehouseDefinition: MapSymbolDefinition = {
    id: 'warehouse',
    label: '物資倉庫',
    shape: 'facility',
    shapes: [
        { tag: 'circle', attrs: { cx: 14, cy: 14, r: 11 } },
        { tag: 'rect', attrs: { x: 9, y: 10, width: 10, height: 9.5 } },
        { tag: 'line', attrs: { x1: 14, y1: 10, x2: 14, y2: 13 } },
        { tag: 'line', attrs: { x1: 9, y1: 13, x2: 19, y2: 13 } },
    ],
};
export const WarehouseSymbol = createMapSymbolComponent(warehouseDefinition);
export const warehouseToDataUri = createMapSymbolToDataUri(warehouseDefinition);

/** 防空避難所：圓框＋盾（全直線幾何盾形） */
export const airRaidShelterDefinition: MapSymbolDefinition = {
    id: 'air-raid-shelter',
    label: '防空避難所',
    shape: 'facility',
    shapes: [
        { tag: 'circle', attrs: { cx: 14, cy: 14, r: 11 } },
        { tag: 'path', attrs: { d: 'M14,7.5 L20,10 V14.5 L14,20.5 L8,14.5 V10 Z' } },
    ],
};
export const AirRaidShelterSymbol = createMapSymbolComponent(airRaidShelterDefinition);
export const airRaidShelterToDataUri = createMapSymbolToDataUri(airRaidShelterDefinition);

/* ────────────────────────────────────────────────
 * 三角＝危害（hazard）
 * ──────────────────────────────────────────────── */

/** 危害區域（AOI）：三角框＋45° 斜紋（禁入/管制區劃線慣例） */
export const hazardAoiDefinition: MapSymbolDefinition = {
    id: 'hazard-aoi',
    label: '危害區域',
    shape: 'hazard',
    shapes: [
        { tag: 'polygon', attrs: { points: '14,3.5 25.5,24.5 2.5,24.5' } },
        { tag: 'line', attrs: { x1: 6.5, y1: 22, x2: 11, y2: 17.5 } },
        { tag: 'line', attrs: { x1: 11, y1: 22, x2: 15.5, y2: 17.5 } },
        { tag: 'line', attrs: { x1: 15.5, y1: 22, x2: 20, y2: 17.5 } },
    ],
};
export const HazardAoiSymbol = createMapSymbolComponent(hazardAoiDefinition);
export const hazardAoiToDataUri = createMapSymbolToDataUri(hazardAoiDefinition);
