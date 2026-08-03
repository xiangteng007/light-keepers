/**
 * MapPage — 戰術圖台（/geo/map）container（R5 依 c5 三欄作戰台重排）
 *
 * 目標構圖：web-dashboard/public/design-mockups/r5-b3c-deep.html 的
 * <section class="c5">（owner 核准）——三欄作戰台：
 *   左欄＝圖層開關清單（既有 MapLayerPanel 靜置欄內）＋即時讀數；
 *   中央＝MapLibre 戰術地圖（D31 第一步：本頁移除 Google Maps 依賴，
 *         改掛 components/maps/MapLibreTacticalMap＋本檔薄 adapter）；
 *   右欄＝事件卡堆（既有 MapSidebar：清單 Tabs＋行動卡；
 *         危機/緊急卡由 CSS 以 danger 徽章雙編碼補紅左閂）。
 *
 * 資料接線全數保留（R2b container 拆分結構不變）：
 *   useQuery×8（events/reports/ncdr/shelters/aed/warehouses/airRaidShelters/hotspots）、
 *   災時模式圖層組合（useAppMode → EMERGENCY_LAYER_PRESET）、
 *   單一 selection 來源（marker／清單 → 行動卡）、handleLocateMe 定位。
 *
 * D31 第一步的已知取捨（薄 adapter，不改共用元件）：
 * - MapLibreTacticalMap 不回報 pan/zoom（無 onIdle 對應 prop）：
 *   nearby 查詢（AED／防空避難處所）的中心點改由「定位／清單置中」驅動；
 *   置中／變焦以 key 重掛地圖實現。
 * - 熱點圖層以標記呈現（Google HeatmapLayer 無對應，待後續補 MapLibre heatmap layer）。
 * - 底圖切換（MAP_TYPES）暫為佔位：MapLibre 底圖僅 OSM raster 一款，
 *   狀態與 UI 保留，待離線 PMTiles／衛星底圖樣式接上。
 *
 * TODO(D31/導航): DirectionsPanel（Google Directions 路線面板）已自本頁拔除；
 * 行動卡「導航」維持 openDirections() 網頁深連結，後續應改為
 * geo:/maps: 原生地圖深連結（iOS/Android 分流）。
 *
 * TODO(離線地圖包): 防空避難處所圖層的 PMTiles 離線封裝尚未納入本次工作範圍。
 * 待離線地圖包（見 web-dashboard/src/pages/OfflinePrepPage.tsx、
 * web-dashboard/src/pages/PackageLibraryPage.tsx、
 * web-dashboard/src/services/localPMTilesServer.ts）支援自訂圖層資料後，
 * 應將防空避難處所資料一併納入可離線下載的封裝內容。
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    getEvents, getNcdrAlertsForMap, getPublicResourcesForMap, getNearbyAed,
    getReportsForMap, getWarehousesForMap, getHotspots, getNearbyAirRaidShelters,
    type NcdrAlert, type HotspotData,
} from '../api';
import type { Event } from '../api';
import { Badge } from '../design-system';
import useAppMode from '../components/layout/useAppMode';
import MapLibreTacticalMap, {
    type TacticalMarker, type MapLibreConfig,
} from '../components/maps/MapLibreTacticalMap';

import {
    TAIWAN_CENTER, DEFAULT_ZOOM, AED_MIN_ZOOM, EVENT_ZOOM_LEVEL,
    type MapTypeKey,
} from './map-constants';
import { initNcdrFilters } from './map-utils';
import {
    DEFAULT_LAYERS, EMERGENCY_LAYER_PRESET,
    type LayerState, type MapSelection,
} from './map/types';
import MapLayerPanel from './map/MapLayerPanel';
import MapSidebar from './map/MapSidebar';

/** 通報 severity（字串）→ 事件 severity（數字）——沿用 R2b MapMarkers 的既有對應 */
const REPORT_SEVERITY_MAP: Record<string, number> = {
    low: 1, medium: 2, high: 3, critical: 4,
};

/**
 * OSM raster 底圖＋戰術暗化（raster-* paint 去飽和、壓亮度，貼齊 B3c 深底；
 * 標記為 DOM 元素不受影響）。tile 來源沿用 components/map/MapContainer 既有的 OSM。
 *
 * 薄 adapter 註記：MapLibreTacticalMap 的 config.style 型別是 string，
 * 但 maplibre-gl 原生同時接受 style 物件——此處以型別斷言穿過，不改共用元件。
 */
const TACTICAL_BASEMAP_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
    },
    layers: [
        {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            paint: {
                'raster-saturation': -0.85,
                'raster-brightness-min': 0.02,
                'raster-brightness-max': 0.42,
                'raster-contrast': 0.12,
            },
        },
    ],
} as unknown as string;

/** 頂列本地時鐘（獨立元件：每秒 tick 不重繪整頁） */
function TacClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        <time className="u-mono map-page__clock" dateTime={now.toISOString()}>
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())} L
        </time>
    );
}

export default function MapPage() {
    const { isEmergencyMode } = useAppMode();

    // ===== 圖層／視圖狀態 =====
    // 災時模式進頁即套用災時圖層組合（§1 雙模式 IA）
    const [layers, setLayers] = useState<LayerState>(() =>
        isEmergencyMode ? EMERGENCY_LAYER_PRESET : DEFAULT_LAYERS,
    );
    // 底圖選擇（MapLibre 暫僅 OSM，狀態與面板 UI 保留，見檔頭 D31 取捨）
    const [mapType, setMapType] = useState<MapTypeKey>('roadmap');
    const [mapCenter, setMapCenter] = useState(TAIWAN_CENTER);
    const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

    // ===== 單一選取來源（右欄行動卡） =====
    const [selection, setSelection] = useState<MapSelection | null>(null);

    // NCDR 圖層層級過濾（目前全開，保留擴充點）
    const [ncdrTypeFilters] = useState<Record<number, boolean>>(initNcdrFilters);

    // 定位
    const [isLocating, setIsLocating] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const toggleLayer = useCallback((key: keyof LayerState) => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // ===== 資料查詢 =====
    const { data: eventsData, isLoading } = useQuery({
        queryKey: ['allEvents'],
        queryFn: () => getEvents().then(res => res.data.data),
    });

    const { data: reportsData } = useQuery({
        queryKey: ['confirmedReportsMap'],
        queryFn: () => getReportsForMap().then(res => res.data),
        enabled: layers.events,
    });

    const { data: ncdrData } = useQuery({
        queryKey: ['ncdrAlertsMap'],
        queryFn: () => getNcdrAlertsForMap().then(res => res.data.data),
        enabled: layers.ncdr,
    });

    const { data: sheltersData } = useQuery({
        queryKey: ['sheltersMap'],
        queryFn: async () => {
            const res = await getPublicResourcesForMap(['shelters']);
            return res.data.shelters || [];
        },
        enabled: layers.shelters,
        staleTime: 1000 * 60 * 30,
    });

    const { data: nearbyAedData } = useQuery({
        queryKey: ['nearbyAed', mapCenter.lat, mapCenter.lng, mapZoom >= AED_MIN_ZOOM],
        queryFn: async () => {
            if (mapZoom < AED_MIN_ZOOM) return [];
            const res = await getNearbyAed(mapCenter.lat, mapCenter.lng, 2); // 2km 半徑
            return res.data.data || [];
        },
        enabled: layers.aed && mapZoom >= AED_MIN_ZOOM,
        staleTime: 1000 * 60 * 5,
    });

    const { data: warehousesData } = useQuery({
        queryKey: ['warehousesMap'],
        queryFn: () => getWarehousesForMap(),
        enabled: layers.warehouses,
        staleTime: 1000 * 60 * 30,
    });

    // C1.2：附近防空避難處所（沿用 AED nearby 模式；月度更新資料 → 30 分快取）
    const { data: nearbyAirRaidSheltersData } = useQuery({
        queryKey: ['nearbyAirRaidShelters', mapCenter.lat, mapCenter.lng],
        queryFn: async () => {
            const res = await getNearbyAirRaidShelters(mapCenter.lat, mapCenter.lng, 5); // 5km 半徑
            return res.data.data || [];
        },
        enabled: layers.airRaidShelters,
        staleTime: 1000 * 60 * 30,
    });

    const { data: hotspotsResponse } = useQuery({
        queryKey: ['reportHotspots'],
        queryFn: () => getHotspots({ gridSizeKm: 2, minCount: 1, days: 7 }).then(res => res.data.data),
        enabled: layers.hotspots,
        staleTime: 1000 * 60 * 5,
    });

    const events = useMemo(() => (Array.isArray(eventsData) ? eventsData : []), [eventsData]);
    const confirmedReports = useMemo(() => (Array.isArray(reportsData) ? reportsData : []), [reportsData]);
    const ncdrAlerts = useMemo(() => (Array.isArray(ncdrData) ? ncdrData : []), [ncdrData]);
    const shelters = useMemo(() => (Array.isArray(sheltersData) ? sheltersData : []), [sheltersData]);
    const aedLocations = useMemo(() => (Array.isArray(nearbyAedData) ? nearbyAedData : []), [nearbyAedData]);
    const warehouses = useMemo(() => (Array.isArray(warehousesData) ? warehousesData : []), [warehousesData]);
    const airRaidShelters = useMemo(
        () => (Array.isArray(nearbyAirRaidSheltersData) ? nearbyAirRaidSheltersData : []),
        [nearbyAirRaidSheltersData],
    );

    // 圖層層級的 NCDR 過濾（未知類型預設顯示）
    const filteredNcdrAlerts = useMemo(() => {
        if (!layers.ncdr) return [];
        return ncdrAlerts.filter(alert => ncdrTypeFilters[alert.alertTypeId] !== false);
    }, [ncdrAlerts, ncdrTypeFilters, layers.ncdr]);

    // ===== 座標處理 =====
    const parseCoord = (val: unknown): number | null => {
        if (typeof val === 'number' && !isNaN(val)) return val;
        if (typeof val === 'string') {
            const num = parseFloat(val);
            return !isNaN(num) ? num : null;
        }
        return null;
    };

    const eventsWithLocation = useMemo(() => events
        .map(e => ({
            ...e,
            latitude: parseCoord(e.latitude),
            longitude: parseCoord(e.longitude),
        }))
        .filter((e): e is Event & { latitude: number; longitude: number } =>
            e.latitude !== null && e.longitude !== null,
        ), [events]);

    // ===== MapLibre 薄 adapter：既有圖層資料 → TacticalMarker =====
    // 標記型別對應（紅色憲法：'sos'/'hazard' 紅系只給生命安全——危機 severity>=5）：
    //   事件（危機）→ hazard｜事件/通報 → task｜NCDR 示警 → sector｜
    //   收容所/AED/倉庫/防空避難處所 → resource（selection kind 仍分流，C1.2 不合併）｜
    //   熱點 → rally｜使用者定位 → volunteer
    // R5/T5 符號對應（B3c map-symbols；type 決定 token 色、symbol 決定形狀）：
    //   危機 → hazard-aoi（三角）｜事件/通報 → report-incident（菱＋驚嘆）｜
    //   NCDR → hazard-aoi（三角，warning 琥珀與危機紅區分）｜
    //   收容所 → shelter｜AED → aed｜倉庫 → warehouse｜防空 → air-raid-shelter（皆圓框）｜
    //   熱點 → rally（方旗）｜使用者定位 → team（方＋人）
    const { tacticalMarkers, selectionById } = useMemo(() => {
        const markers: TacticalMarker[] = [];
        const byId = new Map<string, MapSelection>();
        const push = (marker: TacticalMarker, sel?: MapSelection) => {
            markers.push(marker);
            if (sel) byId.set(marker.id, sel);
        };

        if (layers.events) {
            for (const event of eventsWithLocation) {
                const isCrisis = (event.severity || 0) >= 5;
                push({
                    id: `event-${event.id}`,
                    position: [event.longitude, event.latitude],
                    type: isCrisis ? 'hazard' : 'task',
                    symbol: isCrisis ? 'hazard-aoi' : 'report-incident',
                    label: event.title,
                }, { kind: 'event', event });
            }
            // 已確認通報（C1.1）：點擊沿用既有行為——轉換為事件格式顯示
            for (const report of confirmedReports) {
                if (!report.latitude || !report.longitude) continue;
                const eventLike = {
                    ...report,
                    severity: REPORT_SEVERITY_MAP[report.severity] || 2,
                    latitude: Number(report.latitude),
                    longitude: Number(report.longitude),
                } as unknown as Event;
                push({
                    id: `report-${report.id}`,
                    position: [Number(report.longitude), Number(report.latitude)],
                    type: 'task',
                    symbol: 'report-incident',
                    label: report.title,
                }, { kind: 'event', event: eventLike });
            }
        }

        if (layers.ncdr) {
            for (const alert of filteredNcdrAlerts) {
                if (!alert.latitude || !alert.longitude) continue;
                push({
                    id: `ncdr-${alert.id}`,
                    position: [Number(alert.longitude), Number(alert.latitude)],
                    type: 'sector',
                    symbol: 'hazard-aoi',
                    label: alert.title,
                }, { kind: 'ncdr', alert });
            }
        }

        if (layers.shelters) {
            for (const shelter of shelters) {
                push({
                    id: `shelter-${shelter.id}`,
                    position: [shelter.longitude, shelter.latitude],
                    type: 'resource',
                    symbol: 'shelter',
                    label: shelter.name,
                }, { kind: 'shelter', shelter });
            }
        }

        if (layers.aed && mapZoom >= AED_MIN_ZOOM) {
            for (const aed of aedLocations) {
                push({
                    id: `aed-${aed.id}`,
                    position: [aed.longitude, aed.latitude],
                    type: 'resource',
                    symbol: 'aed',
                    label: aed.name,
                }, { kind: 'aed', aed });
            }
        }

        if (layers.warehouses) {
            for (const warehouse of warehouses) {
                push({
                    id: `warehouse-${warehouse.id}`,
                    position: [Number(warehouse.longitude), Number(warehouse.latitude)],
                    type: 'resource',
                    symbol: 'warehouse',
                    label: warehouse.name,
                }, { kind: 'warehouse', warehouse });
            }
        }

        // C1.2：防空避難處所（與避難收容所為不同設施，selection 分流不得合併）
        if (layers.airRaidShelters) {
            for (const shelter of airRaidShelters) {
                push({
                    id: `air-raid-${shelter.id}`,
                    position: [shelter.longitude, shelter.latitude],
                    type: 'resource',
                    symbol: 'air-raid-shelter',
                    label: shelter.name,
                }, { kind: 'airRaidShelter', shelter });
            }
        }

        // 熱點：以標記呈現（見檔頭 D31 取捨）
        if (layers.hotspots && hotspotsResponse?.hotspots) {
            hotspotsResponse.hotspots.forEach((hotspot: HotspotData, i: number) => {
                push({
                    id: `hotspot-${hotspot.gridId ?? i}`,
                    position: [hotspot.centerLng, hotspot.centerLat],
                    type: 'rally',
                    symbol: 'rally',
                    label: `熱點 ×${hotspot.count}`,
                });
            });
        }

        if (userLocation) {
            push({
                id: 'user-location',
                position: [userLocation.lng, userLocation.lat],
                type: 'volunteer',
                symbol: 'team',
                label: '您的位置',
            });
        }

        return { tacticalMarkers: markers, selectionById: byId };
    }, [
        layers, eventsWithLocation, confirmedReports, filteredNcdrAlerts,
        shelters, aedLocations, warehouses, airRaidShelters,
        hotspotsResponse, userLocation, mapZoom,
    ]);

    // marker 點擊 → 既有單一 selection（ref 查表：MapLibre 元件的 click handler
    // 只在 marker 建立當下綁定，須避開 stale closure）
    const selectionByIdRef = useRef(selectionById);
    useEffect(() => {
        selectionByIdRef.current = selectionById;
    }, [selectionById]);

    const handleTacticalMarkerClick = useCallback((marker: TacticalMarker) => {
        const sel = selectionByIdRef.current.get(marker.id);
        if (sel) setSelection(sel);
    }, []);

    // ===== 選取處理 =====

    /** 側欄清單點擊：選取 + 置中（置中以 key 重掛地圖，見檔頭 D31 取捨） */
    const handleEventSelect = useCallback((event: Event) => {
        setSelection({ kind: 'event', event });
        const lat = parseCoord(event.latitude);
        const lng = parseCoord(event.longitude);
        if (lat && lng) {
            setMapCenter({ lat, lng });
            setMapZoom(EVENT_ZOOM_LEVEL);
        }
    }, []);

    const handleNcdrSelect = useCallback((alert: NcdrAlert) => {
        setSelection({ kind: 'ncdr', alert });
        if (alert.latitude && alert.longitude) {
            setMapCenter({ lat: Number(alert.latitude), lng: Number(alert.longitude) });
            setMapZoom(EVENT_ZOOM_LEVEL);
        }
    }, []);

    const clearSelection = useCallback(() => setSelection(null), []);

    // ===== 地圖視圖（初始化 config；center/zoom 變更→key 重掛） =====
    const mapConfig = useMemo<MapLibreConfig>(() => ({
        center: [mapCenter.lng, mapCenter.lat],
        zoom: mapZoom,
        style: TACTICAL_BASEMAP_STYLE,
        minZoom: 5,
        maxZoom: 19,
    }), [mapCenter, mapZoom]);
    const mapViewKey = `${mapCenter.lat.toFixed(5)},${mapCenter.lng.toFixed(5)}@${mapZoom}`;

    // ===== 定位目前位置 =====
    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) {
            alert('您的瀏覽器不支援定位功能');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setUserLocation(newLocation);
                setMapCenter(newLocation);
                setMapZoom(15);
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        alert('定位權限被拒絕，請在瀏覽器設定中允許定位');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert('無法取得位置資訊');
                        break;
                    case error.TIMEOUT:
                        alert('定位逾時，請重試');
                        break;
                    default:
                        alert('定位時發生錯誤');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    }, []);

    // 左欄小讀數（c5：mono、tabular-nums、卡其）
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const activeLayerCount = Object.values(layers).filter(Boolean).length;

    return (
        <div className="page map-page">
            {/* ===== 頂列（c5-hd）：識別＋作業區＋本地時鐘 ===== */}
            <header className="map-page__topbar">
                <div className="map-page__topbar-group">
                    <span className="map-page__sig" aria-hidden="true">▣</span>
                    <h2 className="map-page__title">戰術圖台</h2>
                    <span className="u-stencil map-page__stencil">TACMAP OPCON</span>
                    {isEmergencyMode && (
                        <Badge variant="danger" dot pulse>災時模式</Badge>
                    )}
                </div>
                <div className="map-page__topbar-group">
                    <span className="u-stencil map-page__stencil">GEO / MAP</span>
                    <TacClock />
                </div>
            </header>

            <div className="map-layout">
                {/* ===== 左欄：圖層開關＋即時讀數 ===== */}
                <aside className="map-col-left" aria-label="圖層與即時讀數">
                    <MapLayerPanel
                        layers={layers}
                        onToggleLayer={toggleLayer}
                        onApplyPreset={setLayers}
                        mapType={mapType}
                        onMapTypeChange={setMapType}
                        currentZoom={mapZoom}
                    />

                    <section className="map-readout" aria-label="即時讀數">
                        <div className="map-readout__head">
                            <h3>讀數</h3>
                            <span className="u-stencil map-page__stencil">READOUT</span>
                        </div>
                        <dl className="map-readout__list">
                            <div className="map-readout__row">
                                <dt>事件</dt>
                                <dd className="u-mono">{pad2(events.length)}</dd>
                            </div>
                            <div className="map-readout__row">
                                <dt>通報</dt>
                                <dd className="u-mono">{pad2(confirmedReports.length)}</dd>
                            </div>
                            <div className="map-readout__row">
                                <dt>示警</dt>
                                <dd className="u-mono">{pad2(filteredNcdrAlerts.length)}</dd>
                            </div>
                            <div className="map-readout__row">
                                <dt>圖上標記</dt>
                                <dd className="u-mono">{pad2(tacticalMarkers.length)}</dd>
                            </div>
                            <div className="map-readout__row">
                                <dt>啟用圖層</dt>
                                <dd className="u-mono">{pad2(activeLayerCount)}</dd>
                            </div>
                        </dl>
                    </section>

                    <div className="map-col-left__foot">
                        <span className="u-stencil map-page__stencil">BASEMAP OSM</span>
                    </div>
                </aside>

                {/* ===== 中央：MapLibre 戰術地圖（控制鈕垂直靠左上，見 css） ===== */}
                <div className="map-stage">
                    <MapLibreTacticalMap
                        key={mapViewKey}
                        config={mapConfig}
                        markers={tacticalMarkers}
                        onMarkerClick={handleTacticalMarkerClick}
                        onMapClick={clearSelection}
                        showControls
                    />

                    {/* 定位目前位置（左下、44px 觸控目標，與左上控制鈕同欄） */}
                    <button
                        className={`map-locate-btn ${isLocating ? 'map-locate-btn--loading' : ''}`}
                        onClick={handleLocateMe}
                        disabled={isLocating}
                        title="定位目前位置"
                        aria-label="定位目前位置"
                    >
                        {isLocating ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" opacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="4" />
                                <line x1="12" y1="2" x2="12" y2="6" />
                                <line x1="12" y1="18" x2="12" y2="22" />
                                <line x1="2" y1="12" x2="6" y2="12" />
                                <line x1="18" y1="12" x2="22" y2="12" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* ===== 右欄：事件卡堆（清單 Tabs＋行動卡） ===== */}
                <MapSidebar
                    events={events}
                    isLoadingEvents={isLoading}
                    ncdrAlerts={filteredNcdrAlerts}
                    selection={selection}
                    onSelectEvent={handleEventSelect}
                    onSelectNcdr={handleNcdrSelect}
                    onClearSelection={clearSelection}
                />
            </div>
        </div>
    );
}
