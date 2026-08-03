/**
 * mapSymbolRegistry — 地圖符號註冊表（R5/T5）
 *
 * 以 kebab-case id 索引全部 10 枚符號，每筆同時攜帶：
 *   Component（React 元件）與 toDataUri(color)（MapLibre image source 用）。
 * MapLibre image id 建議命名：`lk-symbol-${id}`（例：lk-symbol-shelter）。
 */
import type React from 'react';
import type { MapSymbolProps, MapSymbolShapeSemantics } from './createMapSymbol';
import {
    AedSymbol,
    AirRaidShelterSymbol,
    HazardAoiSymbol,
    HqSymbol,
    RallySymbol,
    ReportIncidentSymbol,
    ShelterSymbol,
    SosSymbol,
    TeamSymbol,
    WarehouseSymbol,
    aedDefinition,
    aedToDataUri,
    airRaidShelterDefinition,
    airRaidShelterToDataUri,
    hazardAoiDefinition,
    hazardAoiToDataUri,
    hqDefinition,
    hqToDataUri,
    rallyDefinition,
    rallyToDataUri,
    reportIncidentDefinition,
    reportIncidentToDataUri,
    shelterDefinition,
    shelterToDataUri,
    sosDefinition,
    sosToDataUri,
    teamDefinition,
    teamToDataUri,
    warehouseDefinition,
    warehouseToDataUri,
} from './symbols';

export const MAP_SYMBOL_IDS = [
    'report-incident',
    'sos',
    'team',
    'shelter',
    'aed',
    'warehouse',
    'air-raid-shelter',
    'rally',
    'hazard-aoi',
    'hq',
] as const;

export type MapSymbolId = (typeof MAP_SYMBOL_IDS)[number];

export interface MapSymbolRegistryEntry {
    id: MapSymbolId;
    /** 中文標籤（教範用語） */
    label: string;
    /** 陣營語意：unit=方、facility=圓、incident=菱、hazard=三角 */
    shape: MapSymbolShapeSemantics;
    Component: React.FC<MapSymbolProps>;
    /** data:image/svg+xml URI（encodeURIComponent）；色由使用端決定 */
    toDataUri: (color: string) => string;
}

export const mapSymbolRegistry: Record<MapSymbolId, MapSymbolRegistryEntry> = {
    'report-incident': {
        id: 'report-incident',
        label: reportIncidentDefinition.label,
        shape: reportIncidentDefinition.shape,
        Component: ReportIncidentSymbol,
        toDataUri: reportIncidentToDataUri,
    },
    sos: {
        id: 'sos',
        label: sosDefinition.label,
        shape: sosDefinition.shape,
        Component: SosSymbol,
        toDataUri: sosToDataUri,
    },
    team: {
        id: 'team',
        label: teamDefinition.label,
        shape: teamDefinition.shape,
        Component: TeamSymbol,
        toDataUri: teamToDataUri,
    },
    shelter: {
        id: 'shelter',
        label: shelterDefinition.label,
        shape: shelterDefinition.shape,
        Component: ShelterSymbol,
        toDataUri: shelterToDataUri,
    },
    aed: {
        id: 'aed',
        label: aedDefinition.label,
        shape: aedDefinition.shape,
        Component: AedSymbol,
        toDataUri: aedToDataUri,
    },
    warehouse: {
        id: 'warehouse',
        label: warehouseDefinition.label,
        shape: warehouseDefinition.shape,
        Component: WarehouseSymbol,
        toDataUri: warehouseToDataUri,
    },
    'air-raid-shelter': {
        id: 'air-raid-shelter',
        label: airRaidShelterDefinition.label,
        shape: airRaidShelterDefinition.shape,
        Component: AirRaidShelterSymbol,
        toDataUri: airRaidShelterToDataUri,
    },
    rally: {
        id: 'rally',
        label: rallyDefinition.label,
        shape: rallyDefinition.shape,
        Component: RallySymbol,
        toDataUri: rallyToDataUri,
    },
    'hazard-aoi': {
        id: 'hazard-aoi',
        label: hazardAoiDefinition.label,
        shape: hazardAoiDefinition.shape,
        Component: HazardAoiSymbol,
        toDataUri: hazardAoiToDataUri,
    },
    hq: {
        id: 'hq',
        label: hqDefinition.label,
        shape: hqDefinition.shape,
        Component: HqSymbol,
        toDataUri: hqToDataUri,
    },
};
