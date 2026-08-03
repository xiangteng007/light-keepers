/**
 * 地圖符號系統（R5/T5 主題化圖文系統）— 公開出入口
 *
 * MIL-STD-2525 簡化民用版：形狀＝陣營語意
 * （方=我方單位、圓=設施、菱=事件、三角=危害），色由使用端決定。
 *
 * 注意：MapLibreTacticalMap 換裝屬下一波，本批只產符號。
 */
export {
    MAP_SYMBOL_STROKE_WIDTH,
    MAP_SYMBOL_VIEWBOX,
    createMapSymbolComponent,
    createMapSymbolToDataUri,
    mapSymbolToSvgString,
    type MapSymbolDefinition,
    type MapSymbolProps,
    type MapSymbolShape,
    type MapSymbolShapeSemantics,
} from './createMapSymbol';

export {
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

export {
    MAP_SYMBOL_IDS,
    mapSymbolRegistry,
    type MapSymbolId,
    type MapSymbolRegistryEntry,
} from './registry';
