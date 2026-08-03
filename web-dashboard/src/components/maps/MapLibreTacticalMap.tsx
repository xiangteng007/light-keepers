/**
 * MapLibre Tactical Map Component
 * Phase 2: 高效能戰術地圖 (共存模式 - 新增元件)
 * 
 * 用途:
 * 1. 大量點位渲染 (5000+ markers)
 * 2. Vector tiles 離線支援
 * 3. 3D 地形視覺化 (可選)
 * 
 * 注意: Leaflet 繼續用於現有頁面，此元件用於新增戰術顯示
 *
 * R5/T5 主題化圖文系統：marker 換裝 B3c 戰術符號（design-system/icons/map-symbols，
 * MIL-STD-2525 簡化民用版——方=我方單位、圓=設施、菱=事件、三角=危害）。
 * 顏色經 mapSymbolColors 接 token 實際色值（data URI 無法解析 var()，
 * 執行期 getComputedStyle 解析；紅色憲法：danger 紅只給 sos/hazard）。
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapSymbolRegistry, type MapSymbolId } from '../../design-system/icons/map-symbols';

// ============ Types ============

export interface TacticalMarker {
    id: string;
    position: [number, number]; // [lng, lat]
    type: 'volunteer' | 'task' | 'resource' | 'sos' | 'hazard' | 'rally' | 'sector';
    /**
     * B3c 地圖符號（R5/T5）：未指定時依 type 走 DEFAULT_TYPE_SYMBOLS 預設對應。
     * 使用端（如 MapPage adapter）可逐 marker 指定，
     * 例如同為 resource 的 shelter/aed/warehouse/air-raid-shelter 各配專屬符號。
     */
    symbol?: MapSymbolId;
    label?: string;
    status?: string;
    metadata?: Record<string, any>;
}

export interface TacticalSector {
    id: string;
    name: string;
    coordinates: [number, number][]; // Polygon coordinates
    color?: string;
    opacity?: number;
}

export interface MapLibreConfig {
    center?: [number, number];
    zoom?: number;
    style?: string;
    pitch?: number;
    bearing?: number;
    maxZoom?: number;
    minZoom?: number;
}

export interface MapLibreTacticalMapProps {
    config?: MapLibreConfig;
    markers?: TacticalMarker[];
    sectors?: TacticalSector[];
    onMarkerClick?: (marker: TacticalMarker) => void;
    onSectorClick?: (sector: TacticalSector) => void;
    onMapClick?: (lngLat: { lng: number; lat: number }) => void;
    className?: string;
    showControls?: boolean;
    enable3D?: boolean;
}

// ============ Default Config ============

const DEFAULT_CONFIG: MapLibreConfig = {
    center: [120.3014, 22.6273], // 高雄市
    zoom: 12,
    style: 'https://demotiles.maplibre.org/style.json', // Free demo tiles
    pitch: 0,
    bearing: 0,
    maxZoom: 18,
    minZoom: 5,
};

// ============ Marker Symbols & Colors（R5/T5 B3c 換裝） ============

/** 符號渲染尺寸（px）＝ MAP_SYMBOL_VIEWBOX，20px 縮放下仍一眼可辨 */
const MARKER_SYMBOL_SIZE = 28;

/** type → 預設符號（marker.symbol 未指定時的對應；形狀＝陣營語意，見 map-symbols README） */
const DEFAULT_TYPE_SYMBOLS: Record<TacticalMarker['type'], MapSymbolId> = {
    volunteer: 'team',           // 方＋人（我方單位）
    task: 'report-incident',     // 菱＋驚嘆（事件）
    resource: 'warehouse',       // 圓＋箱（設施；使用端應逐 marker 指定更精確符號）
    sos: 'sos',                  // 菱＋實心閃電（生命/安全）
    hazard: 'hazard-aoi',        // 三角＋斜紋（危害）
    rally: 'rally',              // 方＋實心旗（集結）
    sector: 'hazard-aoi',        // 三角（示警/區劃，色以 warning 與 hazard 區分）
};

/**
 * mapSymbolColors — marker 顏色的唯一色值來源（集中管理，禁散寫）。
 *
 * SVG data URI 內無法解析 var(--token)，故執行期以 getComputedStyle 讀取
 * token 實際色值；讀不到（測試環境/極早期渲染）時退回 fallback。
 * fallback 值必須與 tokens.css Layer 9（B3c 平時模式）保持一致。
 * 紅色憲法：danger 紅只給生命/安全（sos／hazard 危機），見 DESIGN_LANGUAGE v2 §D。
 */
const mapSymbolColors: Record<TacticalMarker['type'], { token: string; fallback: string }> = {
    volunteer: { token: '--color-info', fallback: '#93A3B0' },      // 藍灰＝我方/使用者
    task: { token: '--color-warning', fallback: '#C9A23E' },        // 琥珀＝事件/通報
    resource: { token: '--color-safe', fallback: '#8CA353' },       // 橄欖綠＝設施/資源
    sos: { token: '--color-danger', fallback: '#C25B5F' },          // 紅＝SOS（紅色憲法）
    hazard: { token: '--color-danger', fallback: '#C25B5F' },       // 紅＝危機/禁入
    rally: { token: '--accent-primary', fallback: '#9BA85C' },      // 橄欖＝集結/熱點
    sector: { token: '--color-warning', fallback: '#C9A23E' },      // 琥珀＝示警
};

/** 責任區（sector polygon）預設色 — token: --accent-primary（B3c 橄欖） */
const SECTOR_DEFAULT_COLOR = { token: '--accent-primary', fallback: '#9BA85C' };

/** 自容器節點解析 token 色值（容器繼承 [data-app-mode] 模式覆寫，優於 documentElement） */
const readTokenColor = (
    styles: CSSStyleDeclaration | null,
    spec: { token: string; fallback: string },
): string => styles?.getPropertyValue(spec.token).trim() || spec.fallback;

// ============ Component ============

export const MapLibreTacticalMap: React.FC<MapLibreTacticalMapProps> = ({
    config = {},
    markers = [],
    sectors = [],
    onMarkerClick,
    onSectorClick,
    onMapClick,
    className = '',
    showControls = true,
    enable3D = false,
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);

    // Merge config with defaults
    const mapConfig = { ...DEFAULT_CONFIG, ...config };

    // ============ Initialize Map ============

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: mapConfig.style!,
            center: mapConfig.center,
            zoom: mapConfig.zoom,
            pitch: enable3D ? 45 : mapConfig.pitch,
            bearing: mapConfig.bearing,
            maxZoom: mapConfig.maxZoom,
            minZoom: mapConfig.minZoom,
        });

        map.current.on('load', () => {
            setIsLoaded(true);
        });

        // Add controls
        if (showControls) {
            map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
            map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
            map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');
        }

        // Map click handler
        if (onMapClick) {
            map.current.on('click', (e) => {
                onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
            });
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // ============ Update Markers ============

    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // Track which markers to keep
        const currentMarkerIds = new Set(markers.map(m => m.id));

        // Remove old markers
        markersRef.current.forEach((marker, id) => {
            if (!currentMarkerIds.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // token 色值解析：自地圖容器讀（吃得到 [data-app-mode="emergency"] 覆寫）
        const containerStyles = mapContainer.current
            ? getComputedStyle(mapContainer.current)
            : null;

        // Add/update markers
        markers.forEach((markerData) => {
            const existingMarker = markersRef.current.get(markerData.id);

            if (existingMarker) {
                // Update position
                existingMarker.setLngLat(markerData.position);
            } else {
                // Create new marker（R5/T5：B3c 戰術符號，取代圓底 emoji）
                const symbolId =
                    markerData.symbol ?? DEFAULT_TYPE_SYMBOLS[markerData.type] ?? 'report-incident';
                const symbolEntry = mapSymbolRegistry[symbolId];
                const colorSpec = mapSymbolColors[markerData.type] ?? mapSymbolColors.task;
                const color = readTokenColor(containerStyles, colorSpec);

                const el = document.createElement('div');
                el.className = `tactical-marker tactical-marker--${markerData.type}`;
                el.style.cssText = `
                    width: ${MARKER_SYMBOL_SIZE}px;
                    height: ${MARKER_SYMBOL_SIZE}px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
                `;

                const symbolImg = document.createElement('img');
                symbolImg.src = symbolEntry.toDataUri(color);
                symbolImg.width = MARKER_SYMBOL_SIZE;
                symbolImg.height = MARKER_SYMBOL_SIZE;
                symbolImg.alt = '';
                symbolImg.draggable = false;
                symbolImg.style.display = 'block';
                el.appendChild(symbolImg);

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(markerData.position)
                    .addTo(map.current!);

                // Click handler
                if (onMarkerClick) {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        onMarkerClick(markerData);
                    });
                }

                // Add popup if label exists
                if (markerData.label) {
                    const popup = new maplibregl.Popup({ offset: 25 })
                        .setHTML(`<strong>${markerData.label}</strong>`);
                    marker.setPopup(popup);
                }

                markersRef.current.set(markerData.id, marker);
            }
        });
    }, [markers, isLoaded, onMarkerClick]);

    // ============ Update Sectors ============

    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // 責任區預設色接 token（sector.color 未指定時）
        const sectorDefaultColor = readTokenColor(
            mapContainer.current ? getComputedStyle(mapContainer.current) : null,
            SECTOR_DEFAULT_COLOR,
        );

        sectors.forEach((sector) => {
            const sourceId = `sector-${sector.id}`;
            const layerId = `sector-fill-${sector.id}`;
            const outlineLayerId = `sector-outline-${sector.id}`;

            // Check if source exists
            if (map.current!.getSource(sourceId)) {
                // Update existing source
                (map.current!.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [sector.coordinates],
                    },
                    properties: { name: sector.name },
                });
            } else {
                // Add new source and layers
                map.current!.addSource(sourceId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [sector.coordinates],
                        },
                        properties: { name: sector.name },
                    },
                });

                // Fill layer
                map.current!.addLayer({
                    id: layerId,
                    type: 'fill',
                    source: sourceId,
                    paint: {
                        'fill-color': sector.color || sectorDefaultColor,
                        'fill-opacity': sector.opacity || 0.3,
                    },
                });

                // Outline layer
                map.current!.addLayer({
                    id: outlineLayerId,
                    type: 'line',
                    source: sourceId,
                    paint: {
                        'line-color': sector.color || sectorDefaultColor,
                        'line-width': 2,
                    },
                });

                // Click handler
                if (onSectorClick) {
                    map.current!.on('click', layerId, () => {
                        onSectorClick(sector);
                    });
                }
            }
        });
    }, [sectors, isLoaded, onSectorClick]);

    // ============ Public Methods ============

    const flyTo = useCallback((center: [number, number], zoom?: number) => {
        map.current?.flyTo({
            center,
            zoom: zoom || map.current.getZoom(),
            duration: 1500,
        });
    }, []);

    const fitBounds = useCallback((bounds: [[number, number], [number, number]]) => {
        map.current?.fitBounds(bounds, { padding: 50 });
    }, []);

    // ============ Render ============

    return (
        <div
            ref={mapContainer}
            className={`maplibre-tactical-map ${className}`}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '400px',
                position: 'relative',
            }}
        >
            {!isLoaded && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'var(--text-muted, #8F9184)',
                    fontSize: '14px',
                }}>
                    地圖載入中...
                </div>
            )}
        </div>
    );
};

export default MapLibreTacticalMap;
