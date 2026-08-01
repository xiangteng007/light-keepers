/**
 * MapPage 共用型別（R2b 拆分）
 *
 * MapPage 原為 1,124 行單檔；R2b 依 DESIGN_LANGUAGE §7.4 地圖 archetype
 * 拆為 container（MapPage.tsx）+ 子元件（MapLayerPanel / MapMarkers /
 * MapInfoWindows / MapSidebar），延續 cc33c15 的 map-constants / map-utils
 * 抽取路線。
 */
import type {
    Event,
    NcdrAlert,
    Shelter,
    AedLocation,
    Warehouse,
    AirRaidShelter,
} from '../../api';

/** 地圖上被點選的物件（單一選取來源，驅動 InfoWindow 與側欄行動卡） */
export type MapSelection =
    | { kind: 'event'; event: Event }
    | { kind: 'ncdr'; alert: NcdrAlert }
    | { kind: 'shelter'; shelter: Shelter }
    | { kind: 'aed'; aed: AedLocation }
    | { kind: 'warehouse'; warehouse: Warehouse }
    /** C1.2：防空避難處所（與避難收容所為不同設施類型，不得合併） */
    | { kind: 'airRaidShelter'; shelter: AirRaidShelter };

/** 圖層開關（分組見 MapLayerPanel：態勢／避難與資源） */
export interface LayerState {
    /** 態勢：災害回報（事件 + 已確認通報） */
    events: boolean;
    /** 態勢：NCDR 示警 */
    ncdr: boolean;
    /** 態勢：熱點分析 */
    hotspots: boolean;
    /** 資源：避難收容所（長期收容） */
    shelters: boolean;
    /** 資源：AED（縮放 ≥ AED_MIN_ZOOM 才顯示） */
    aed: boolean;
    /** 資源：物資倉庫 */
    warehouses: boolean;
    /** 資源：防空避難處所（C1.2，空襲短時掩蔽，與收容所不同） */
    airRaidShelters: boolean;
}

/** 平時預設（與重設計前行為一致：態勢開、資源關） */
export const DEFAULT_LAYERS: LayerState = {
    events: true,
    ncdr: true,
    hotspots: false,
    shelters: false,
    aed: false,
    warehouses: false,
    airRaidShelters: false,
};

/**
 * 災時模式預設圖層組合（DESIGN_LANGUAGE §1 雙模式 IA）：
 * 態勢全開 + 掩蔽/收容資源（收容所、防空避難處所）。
 * AED 維持關閉（有縮放門檻，災時全域視角下無意義）；熱點屬分析用途非應變。
 */
export const EMERGENCY_LAYER_PRESET: LayerState = {
    events: true,
    ncdr: true,
    hotspots: false,
    shelters: true,
    aed: false,
    warehouses: false,
    airRaidShelters: true,
};

/** 開啟 Google Maps 導航（各行動卡共用） */
export function openDirections(lat: number | string, lng: number | string): void {
    window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        '_blank',
    );
}
