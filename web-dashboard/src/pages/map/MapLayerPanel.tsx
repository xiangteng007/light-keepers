/**
 * MapLayerPanel — 圖層控制面板（R2b）
 *
 * DESIGN_LANGUAGE §7.4：圖層/搜尋控制收斂為左上浮動 Panel，可收合，
 * 不遮擋地圖中心 60%。圖層依語意分兩組：
 *   態勢（回報/示警/熱點）／ 避難與資源（收容所/AED/倉庫/防空避難處所）
 * 另提供「災時圖層組合」一鍵套用（§1 災時模式預設圖層組合）。
 *
 * C1.2 保留：防空避難處所圖層開關（含與避難收容所區分的說明 tooltip）。
 *
 * R5/T5 主題化圖文系統：圖層列與嚴重程度圖例換裝 B3c 地圖符號
 * （design-system/icons/map-symbols，與 MapLibreTacticalMap 圖上 marker 同款；
 * 顏色 token 對應 MapLibreTacticalMap 的 mapSymbolColors，React 端直接走 var()）。
 */
import { useState, type FC } from 'react';
import { ChevronDownIcon, LayersIcon, SirenIcon } from '../../design-system/icons';
import {
    AedSymbol,
    AirRaidShelterSymbol,
    HazardAoiSymbol,
    RallySymbol,
    ReportIncidentSymbol,
    ShelterSymbol,
    WarehouseSymbol,
    type MapSymbolProps,
} from '../../design-system/icons/map-symbols';
import { MAP_TYPES, type MapTypeKey, AED_MIN_ZOOM } from '../map-constants';
import { getSeverityColor, getSeverityLabel } from '../map-utils';
import { EMERGENCY_LAYER_PRESET, type LayerState } from './types';

interface LayerToggleDef {
    key: keyof LayerState;
    label: string;
    /** B3c 地圖符號（與圖上 marker 同款） */
    Symbol: FC<MapSymbolProps>;
    /** 符號色（token var()；對應 MapLibreTacticalMap mapSymbolColors 同名 token） */
    symbolColor: string;
    /** hover 補充說明（例如 C1.2 防空避難處所與收容所的差異） */
    title?: string;
}

const SITUATION_LAYERS: LayerToggleDef[] = [
    { key: 'events', label: '災害回報', Symbol: ReportIncidentSymbol, symbolColor: 'var(--color-warning)' },
    { key: 'ncdr', label: 'NCDR示警', Symbol: HazardAoiSymbol, symbolColor: 'var(--color-warning)' },
    { key: 'hotspots', label: '熱點分析', Symbol: RallySymbol, symbolColor: 'var(--accent-primary)', title: '顯示災情回報熱點分析' },
];

const RESOURCE_LAYERS: LayerToggleDef[] = [
    { key: 'shelters', label: '避難收容所', Symbol: ShelterSymbol, symbolColor: 'var(--color-safe)' },
    { key: 'aed', label: 'AED', Symbol: AedSymbol, symbolColor: 'var(--color-safe)', title: '需放大至 50m 比例尺才會顯示' },
    { key: 'warehouses', label: '物資倉庫', Symbol: WarehouseSymbol, symbolColor: 'var(--color-safe)' },
    {
        key: 'airRaidShelters',
        label: '防空避難處所',
        Symbol: AirRaidShelterSymbol,
        symbolColor: 'var(--color-safe)',
        // C1.2：與避難收容所（長期收容）為不同設施類型
        title: '政府公告防空避難處所（空襲/飛彈警報短時掩蔽用，與避難收容所不同）',
    },
];

export interface MapLayerPanelProps {
    layers: LayerState;
    onToggleLayer: (key: keyof LayerState) => void;
    onApplyPreset: (preset: LayerState) => void;
    mapType: MapTypeKey;
    onMapTypeChange: (type: MapTypeKey) => void;
    /** AED 縮放提示用 */
    currentZoom: number;
}

export default function MapLayerPanel({
    layers,
    onToggleLayer,
    onApplyPreset,
    mapType,
    onMapTypeChange,
    currentZoom,
}: MapLayerPanelProps) {
    // 行動端預設收合（面板不得吃掉小螢幕地圖）；桌機預設展開
    const [open, setOpen] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    );

    const renderToggle = ({ key, label, Symbol, symbolColor, title }: LayerToggleDef) => (
        <label key={key} className="map-layer-panel__toggle-row" title={title}>
            <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => onToggleLayer(key)}
            />
            <Symbol size={16} style={{ color: symbolColor, flexShrink: 0 }} aria-hidden="true" />
            <span>
                {label}
                {key === 'aed' && layers.aed && currentZoom < AED_MIN_ZOOM && (
                    <em className="map-layer-panel__hint">（請放大）</em>
                )}
            </span>
        </label>
    );

    return (
        <section className={`map-layer-panel ${open ? 'map-layer-panel--open' : ''}`} aria-label="地圖圖層控制">
            <button
                type="button"
                className="map-layer-panel__header"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
            >
                <LayersIcon size={16} aria-hidden="true" />
                <span>圖層</span>
                <ChevronDownIcon
                    size={16}
                    aria-hidden="true"
                    className={`map-layer-panel__chevron ${open ? 'rotated' : ''}`}
                />
            </button>

            {open && (
                <div className="map-layer-panel__body">
                    {/* 災時一鍵套用（戰術動作，克制使用 accent） */}
                    <button
                        type="button"
                        className="map-layer-panel__preset"
                        title="一鍵開啟災時建議圖層：回報＋示警＋收容所＋防空避難處所"
                        onClick={() => onApplyPreset(EMERGENCY_LAYER_PRESET)}
                    >
                        <SirenIcon size={16} aria-hidden="true" />
                        災時圖層組合
                    </button>

                    <div className="map-layer-panel__group">
                        <h4 className="map-layer-panel__group-title">態勢</h4>
                        {SITUATION_LAYERS.map(renderToggle)}
                    </div>

                    <div className="map-layer-panel__group">
                        <h4 className="map-layer-panel__group-title">避難與資源</h4>
                        {RESOURCE_LAYERS.map(renderToggle)}
                    </div>

                    <div className="map-layer-panel__group">
                        <h4 className="map-layer-panel__group-title">底圖</h4>
                        <div className="map-layer-panel__basemaps" role="group" aria-label="底圖切換">
                            {(Object.keys(MAP_TYPES) as MapTypeKey[]).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`map-layer-panel__basemap ${mapType === key ? 'active' : ''}`}
                                    aria-pressed={mapType === key}
                                    onClick={() => onMapTypeChange(key)}
                                >
                                    {MAP_TYPES[key].name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="map-layer-panel__group">
                        <h4 className="map-layer-panel__group-title">嚴重程度</h4>
                        <div className="map-layer-panel__legend">
                            {/* R5/T5：色點換 B3c 符號，與圖上 marker 對齊——
                                危機（severity>=5）＝hazard 三角、其餘＝incident 菱 */}
                            {[5, 4, 3, 2, 1].map((level) => {
                                const SeveritySymbol = level >= 5 ? HazardAoiSymbol : ReportIncidentSymbol;
                                return (
                                    <span key={level} className="map-layer-panel__legend-item">
                                        <SeveritySymbol
                                            size={14}
                                            style={{ color: getSeverityColor(level), flexShrink: 0 }}
                                            aria-hidden="true"
                                        />
                                        {getSeverityLabel(level)}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
