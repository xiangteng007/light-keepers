/**
 * MapPage — 統一地圖（/geo/map）container（R2b 重設計）
 *
 * DESIGN_LANGUAGE §7.4 地圖 archetype：
 * - 地圖滿版；左上圖層控制（浮動 Panel，分組可收合）；
 *   桌機右側詳情側欄；行動端轉為下方 bottom sheet。
 * - 標記點擊 → 單一 selection 驅動 InfoWindow（快速一瞥）與
 *   側欄行動卡（通報詳情／導航／建立任務派遣捷徑）。
 * - 災時模式（useAppMode）自動套用災時圖層組合
 *   （回報＋示警＋收容所＋防空避難處所）。
 *
 * 拆分結構（原 1,124 行單檔 → container + 子元件，延續 cc33c15 抽取路線）：
 *   MapPage.tsx（本檔）— 狀態 + 資料查詢 + 組裝
 *   map/MapLayerPanel.tsx — 圖層分組面板（C1.2 防空避難處所開關在此）
 *   map/MapMarkers.tsx — 標記層（C1.1 民防 marker／C1.2 盾牌圖標在此）
 *   map/MapInfoWindows.tsx — InfoWindow 層
 *   map/MapSidebar.tsx — 清單 + 行動卡
 *   map/types.ts — MapSelection / LayerState / 災時圖層組合
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import {
    getEvents, getNcdrAlertsForMap, getPublicResourcesForMap, getNearbyAed,
    getReportsForMap, getWarehousesForMap, getHotspots, getNearbyAirRaidShelters,
    type NcdrAlert, type HotspotData,
} from '../api';
import type { Event } from '../api';
import { Badge } from '../design-system';
import useAppMode from '../components/layout/useAppMode';

import {
    GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES,
    TAIWAN_CENTER, DEFAULT_ZOOM, AED_MIN_ZOOM, EVENT_ZOOM_LEVEL,
    MAP_TYPES, type MapTypeKey,
} from './map-constants';
import { containerStyle, mapOptions, initNcdrFilters } from './map-utils';
import {
    DEFAULT_LAYERS, EMERGENCY_LAYER_PRESET,
    type LayerState, type MapSelection,
} from './map/types';
import MapLayerPanel from './map/MapLayerPanel';
import MapMarkers from './map/MapMarkers';
import MapInfoWindows from './map/MapInfoWindows';
import MapSidebar from './map/MapSidebar';

// TODO(離線地圖包): 防空避難處所圖層的 PMTiles 離線封裝尚未納入本次工作範圍。
// 待離線地圖包（見 web-dashboard/src/pages/OfflinePrepPage.tsx、
// web-dashboard/src/pages/PackageLibraryPage.tsx、
// web-dashboard/src/services/localPMTilesServer.ts）支援自訂圖層資料後，
// 應將防空避難處所資料一併納入可離線下載的封裝內容。

export default function MapPage() {
    const { isEmergencyMode } = useAppMode();

    // ===== 圖層／視圖狀態 =====
    // 災時模式進頁即套用災時圖層組合（§1 雙模式 IA）
    const [layers, setLayers] = useState<LayerState>(() =>
        isEmergencyMode ? EMERGENCY_LAYER_PRESET : DEFAULT_LAYERS,
    );
    const [mapType, setMapType] = useState<MapTypeKey>('roadmap');
    const [mapCenter, setMapCenter] = useState(TAIWAN_CENTER);
    const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
    const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);

    // ===== 單一選取來源（InfoWindow + 側欄行動卡） =====
    const [selection, setSelection] = useState<MapSelection | null>(null);

    // NCDR 圖層層級過濾（目前全開，保留擴充點）
    const [ncdrTypeFilters] = useState<Record<number, boolean>>(initNcdrFilters);

    // 定位
    const [isLocating, setIsLocating] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const mapRef = useRef<google.maps.Map | null>(null);

    const toggleLayer = useCallback((key: keyof LayerState) => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // ===== Google Maps API =====
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

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
        queryKey: ['nearbyAed', mapCenter.lat, mapCenter.lng, currentZoom >= AED_MIN_ZOOM],
        queryFn: async () => {
            if (currentZoom < AED_MIN_ZOOM) return [];
            const res = await getNearbyAed(mapCenter.lat, mapCenter.lng, 2); // 2km 半徑
            return res.data.data || [];
        },
        enabled: layers.aed && currentZoom >= AED_MIN_ZOOM,
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

    const events = Array.isArray(eventsData) ? eventsData : [];
    const confirmedReports = Array.isArray(reportsData) ? reportsData : [];
    const ncdrAlerts = Array.isArray(ncdrData) ? ncdrData : [];
    const shelters = Array.isArray(sheltersData) ? sheltersData : [];
    const aedLocations = Array.isArray(nearbyAedData) ? nearbyAedData : [];
    const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
    const airRaidShelters = Array.isArray(nearbyAirRaidSheltersData) ? nearbyAirRaidSheltersData : [];

    // 熱點 → HeatmapLayer 格式
    const heatmapData = useMemo(() => {
        if (!hotspotsResponse?.hotspots || !isLoaded) return [];
        return hotspotsResponse.hotspots.flatMap((hotspot: HotspotData) => {
            const severityWeight: Record<string, number> = {
                critical: 4, high: 3, medium: 2, low: 1,
            };
            return {
                location: new google.maps.LatLng(hotspot.centerLat, hotspot.centerLng),
                weight: (severityWeight[hotspot.severity] || 1) * hotspot.count,
            };
        });
    }, [hotspotsResponse, isLoaded]);

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

    const eventsWithLocation = events
        .map(e => ({
            ...e,
            latitude: parseCoord(e.latitude),
            longitude: parseCoord(e.longitude),
        }))
        .filter((e): e is Event & { latitude: number; longitude: number } =>
            e.latitude !== null && e.longitude !== null,
        );

    // ===== 選取處理 =====

    /** 地圖標記點擊：只更新選取（不移動視角，避免打斷正在平移的使用者） */
    const handleMarkerSelect = useCallback((sel: MapSelection) => {
        setSelection(sel);
    }, []);

    /** 側欄清單點擊：選取 + 置中 */
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

    // ===== 地圖事件 =====
    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onMapIdle = useCallback(() => {
        if (!mapRef.current) return;
        const zoom = mapRef.current.getZoom();
        const center = mapRef.current.getCenter();
        if (zoom !== undefined && zoom !== currentZoom) {
            setCurrentZoom(zoom);
        }
        if (center) {
            const newCenter = { lat: center.lat(), lng: center.lng() };
            // 只在中心點變化較大時更新（避免 nearby 查詢過於頻繁）
            const dist = Math.abs(newCenter.lat - mapCenter.lat) + Math.abs(newCenter.lng - mapCenter.lng);
            if (dist > 0.01) { // 約 1km
                setMapCenter(newCenter);
            }
        }
    }, [currentZoom, mapCenter]);

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

    if (loadError) {
        return (
            <div className="page map-page">
                <div className="map-error">
                    <h3>❌ 地圖載入失敗</h3>
                    <p>請檢查網路連線或 API 金鑰設定</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page map-page">
            <div className="map-page__header">
                <h2>地圖總覽</h2>
                {isEmergencyMode && (
                    <Badge variant="danger" dot pulse>災時模式</Badge>
                )}
            </div>

            <div className="map-layout">
                {/* ===== 地圖區域（滿版） ===== */}
                <div className="map-container">
                    {!isLoaded ? (
                        <div className="map-loading">
                            <div className="map-loading__spinner" />
                            <p>載入 Google Maps...</p>
                        </div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={mapCenter}
                            zoom={mapZoom}
                            onLoad={onMapLoad}
                            onClick={clearSelection}
                            onIdle={onMapIdle}
                            options={{
                                ...mapOptions,
                                mapTypeId: MAP_TYPES[mapType].id,
                            }}
                        >
                            <MapMarkers
                                layers={layers}
                                currentZoom={currentZoom}
                                eventsWithLocation={eventsWithLocation}
                                confirmedReports={confirmedReports}
                                ncdrAlerts={filteredNcdrAlerts}
                                shelters={shelters}
                                aedLocations={aedLocations}
                                warehouses={warehouses}
                                airRaidShelters={airRaidShelters}
                                heatmapData={heatmapData}
                                userLocation={userLocation}
                                onSelect={handleMarkerSelect}
                            />
                            <MapInfoWindows selection={selection} onClose={clearSelection} />
                        </GoogleMap>
                    )}

                    {/* 圖層控制（左上浮動、分組、可收合；含災時圖層組合） */}
                    <MapLayerPanel
                        layers={layers}
                        onToggleLayer={toggleLayer}
                        onApplyPreset={setLayers}
                        mapType={mapType}
                        onMapTypeChange={setMapType}
                        currentZoom={currentZoom}
                    />

                    {/* 定位目前位置（右下，44px 觸控目標） */}
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

                {/* ===== 側欄（桌機右側；行動端下方 sheet） ===== */}
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
