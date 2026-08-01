import { useState, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, HeatmapLayerF } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { getEvents, getNcdrAlertsForMap, getPublicResourcesForMap, getNearbyAed, getReportsForMap, getWarehousesForMap, getHotspots, getNearbyAirRaidShelters, type NcdrAlert, type Shelter, type AedLocation, type Report, type Warehouse, type HotspotData, type AirRaidShelter } from '../api';
import type { Event } from '../api';
import { Badge, Card, Button } from '../design-system';

// Map constants and utilities (extracted)
import {
    GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES,
    TAIWAN_CENTER, DEFAULT_ZOOM, AED_MIN_ZOOM, EVENT_ZOOM_LEVEL,
    NCDR_CORE_TYPES, NCDR_EXTENDED_TYPES,
    MAP_TYPES, type MapTypeKey,
} from './map-constants';
import {
    getSeverityColor, getSeverityLabel,
    createMarkerIcon, createNcdrMarkerIcon,
    createShelterMarkerIcon, createAedMarkerIcon, createWarehouseMarkerIcon,
    createAirRaidShelterMarkerIcon,
    containerStyle, mapOptions, initNcdrFilters,
} from './map-utils';

// TODO(離線地圖包): 防空避難處所圖層的 PMTiles 離線封裝尚未納入本次工作範圍。
// 待離線地圖包（見 web-dashboard/src/pages/OfflinePrepPage.tsx、
// web-dashboard/src/pages/PackageLibraryPage.tsx、
// web-dashboard/src/services/localPMTilesServer.ts）支援自訂圖層資料後，
// 應將防空避難處所資料一併納入可離線下載的封裝內容。

export default function MapPage() {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [mapCenter, setMapCenter] = useState(TAIWAN_CENTER);
    const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [mapType, setMapType] = useState<MapTypeKey>('roadmap');
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [infoWindowEvent, setInfoWindowEvent] = useState<Event | null>(null);

    // NCDR 整合狀態
    const [showEvents, setShowEvents] = useState(true);
    const [showNcdrAlerts, setShowNcdrAlerts] = useState(true);
    const [ncdrTypeFilters] = useState<Record<number, boolean>>(initNcdrFilters);
    const [selectedNcdrAlert, setSelectedNcdrAlert] = useState<NcdrAlert | null>(null);

    // 公共資源圖層狀態（避難所/AED/倉庫/防空避難處所）
    const [showShelters, setShowShelters] = useState(false);
    const [showAed, setShowAed] = useState(false);
    const [showWarehouses, setShowWarehouses] = useState(false);
    const [showAirRaidShelters, setShowAirRaidShelters] = useState(false);
    const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
    const [selectedAed, setSelectedAed] = useState<AedLocation | null>(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [selectedAirRaidShelter, setSelectedAirRaidShelter] = useState<AirRaidShelter | null>(null);

    // Phase 5.2: 熱點分析圖層
    const [showHotspots, setShowHotspots] = useState(false);

    // 側邊欄 Tab 切換
    const [sidebarTab, setSidebarTab] = useState<'events' | 'ncdr'>('events');

    // NCDR 側邊欄篩選器
    const [ncdrSidebarTypeFilter, setNcdrSidebarTypeFilter] = useState<string>('all');
    const [ncdrSidebarSeverityFilter, setNcdrSidebarSeverityFilter] = useState<string>('all');

    // 當前縮放等級追蹤 (用於 AED 顯示判斷)
    const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);

    // 定位當前位置狀態
    const [isLocating, setIsLocating] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const mapRef = useRef<google.maps.Map | null>(null);

    // 載入 Google Maps API
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    // 獲取所有事件
    const { data: eventsData, isLoading } = useQuery({
        queryKey: ['allEvents'],
        queryFn: () => getEvents().then(res => res.data.data),
    });

    // 獲取已確認的回報 (顯示為災害回報)
    const { data: reportsData } = useQuery({
        queryKey: ['confirmedReportsMap'],
        queryFn: () => getReportsForMap().then(res => res.data),
        enabled: showEvents,
    });

    // 獲取 NCDR 警報 (有座標的)
    const { data: ncdrData } = useQuery({
        queryKey: ['ncdrAlertsMap'],
        queryFn: () => getNcdrAlertsForMap().then(res => res.data.data),
        enabled: showNcdrAlerts,
    });

    // 獲取避難所資源
    const { data: sheltersData } = useQuery({
        queryKey: ['sheltersMap'],
        queryFn: async () => {
            const res = await getPublicResourcesForMap(['shelters']);
            return res.data.shelters || [];
        },
        enabled: showShelters,
        staleTime: 1000 * 60 * 30, // 30 分鐘快取
    });

    // 獲取附近 AED（僅在高縮放等級時，基於地圖中心查詢）
    const { data: nearbyAedData } = useQuery({
        queryKey: ['nearbyAed', mapCenter.lat, mapCenter.lng, currentZoom >= AED_MIN_ZOOM],
        queryFn: async () => {
            if (currentZoom < AED_MIN_ZOOM) return [];
            const res = await getNearbyAed(mapCenter.lat, mapCenter.lng, 2); // 2km 半徑
            return res.data.data || [];
        },
        enabled: showAed && currentZoom >= AED_MIN_ZOOM,
        staleTime: 1000 * 60 * 5, // 5 分鐘快取
    });

    // 獲取倉庫位置
    const { data: warehousesData } = useQuery({
        queryKey: ['warehousesMap'],
        queryFn: () => getWarehousesForMap(),
        enabled: showWarehouses,
        staleTime: 1000 * 60 * 30, // 30 分鐘快取
    });

    // 獲取附近防空避難處所（基於地圖中心查詢，沿用 AED nearby 模式）
    const { data: nearbyAirRaidSheltersData } = useQuery({
        queryKey: ['nearbyAirRaidShelters', mapCenter.lat, mapCenter.lng],
        queryFn: async () => {
            const res = await getNearbyAirRaidShelters(mapCenter.lat, mapCenter.lng, 5); // 5km 半徑
            return res.data.data || [];
        },
        enabled: showAirRaidShelters,
        staleTime: 1000 * 60 * 30, // 30 分鐘快取（資料為月度更新，變動不頻繁）
    });

    const events = Array.isArray(eventsData) ? eventsData : [];
    const confirmedReports = Array.isArray(reportsData) ? reportsData : [];
    const ncdrAlerts = Array.isArray(ncdrData) ? ncdrData : [];
    const shelters = Array.isArray(sheltersData) ? sheltersData : [];
    const aedLocations = Array.isArray(nearbyAedData) ? nearbyAedData : [];
    const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
    const airRaidShelters = Array.isArray(nearbyAirRaidSheltersData) ? nearbyAirRaidSheltersData : [];

    // Phase 5.2: 獲取熱點分析數據
    const { data: hotspotsResponse } = useQuery({
        queryKey: ['reportHotspots'],
        queryFn: () => getHotspots({ gridSizeKm: 2, minCount: 1, days: 7 }).then(res => res.data.data),
        enabled: showHotspots,
        staleTime: 1000 * 60 * 5, // 5 分鐘快取
    });

    // 將熱點數據轉換為 Google Maps HeatmapLayer 格式
    const heatmapData = useMemo(() => {
        if (!hotspotsResponse?.hotspots || !isLoaded) return [];

        return hotspotsResponse.hotspots.flatMap((hotspot: HotspotData) => {
            // 根據嚴重度設定權重
            const severityWeight: Record<string, number> = {
                critical: 4,
                high: 3,
                medium: 2,
                low: 1,
            };
            const weight = (severityWeight[hotspot.severity] || 1) * hotspot.count;

            return {
                location: new google.maps.LatLng(hotspot.centerLat, hotspot.centerLng),
                weight: weight,
            };
        });
    }, [hotspotsResponse, isLoaded]);

    // 計算是否應顯示 AED (縮放夠高)
    const shouldShowAed = showAed && currentZoom >= AED_MIN_ZOOM;

    // 根據類型過濾 NCDR 警報 (地圖用)
    // 未知類型預設顯示
    const filteredNcdrAlerts = useMemo(() => {
        if (!showNcdrAlerts) return [];
        return ncdrAlerts.filter(alert => {
            const typeId = alert.alertTypeId;
            // 如果類型不在過濾器中，預設顯示；否則依據過濾器設定
            return ncdrTypeFilters[typeId] !== false;
        });
    }, [ncdrAlerts, ncdrTypeFilters, showNcdrAlerts]);

    // 側邊欄 NCDR 過濾後列表 (額外篩選)
    const filteredNcdrSidebarAlerts = useMemo(() => {
        let result = filteredNcdrAlerts;
        // 類型篩選
        if (ncdrSidebarTypeFilter !== 'all') {
            const typeId = parseInt(ncdrSidebarTypeFilter, 10);
            result = result.filter(alert => alert.alertTypeId === typeId);
        }
        // 嚴重程度篩選
        if (ncdrSidebarSeverityFilter !== 'all') {
            result = result.filter(alert => alert.severity === ncdrSidebarSeverityFilter);
        }
        return result;
    }, [filteredNcdrAlerts, ncdrSidebarTypeFilter, ncdrSidebarSeverityFilter]);



    // 將事件座標轉換為數字
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
            e.latitude !== null && e.longitude !== null
        );

    const handleEventSelect = useCallback((event: Event) => {
        setSelectedEvent(event);
        setSelectedNcdrAlert(null);
        const lat = parseCoord(event.latitude);
        const lng = parseCoord(event.longitude);
        if (lat && lng) {
            setMapCenter({ lat, lng });
            setMapZoom(EVENT_ZOOM_LEVEL);
            setInfoWindowEvent(event);
        }
    }, []);

    // 處理 NCDR 警報選擇
    const handleNcdrAlertSelect = useCallback((alert: NcdrAlert) => {
        setSelectedNcdrAlert(alert);
        setSelectedEvent(null);
        setInfoWindowEvent(null);
        if (alert.latitude && alert.longitude) {
            setMapCenter({ lat: Number(alert.latitude), lng: Number(alert.longitude) });
            setMapZoom(EVENT_ZOOM_LEVEL);
        }
    }, []);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onMapClick = useCallback(() => {
        // 點擊地圖空白處關閉 InfoWindow
        setInfoWindowEvent(null);
    }, []);

    // 地圖閒置時更新縮放等級和中心點（用於 AED 查詢）
    const onMapIdle = useCallback(() => {
        if (mapRef.current) {
            const zoom = mapRef.current.getZoom();
            const center = mapRef.current.getCenter();
            if (zoom !== undefined && zoom !== currentZoom) {
                setCurrentZoom(zoom);
            }
            if (center) {
                const newCenter = { lat: center.lat(), lng: center.lng() };
                // 只在中心點變化較大時更新（避免頻繁查詢）
                const dist = Math.abs(newCenter.lat - mapCenter.lat) + Math.abs(newCenter.lng - mapCenter.lng);
                if (dist > 0.01) { // 約 1km 變化
                    setMapCenter(newCenter);
                }
            }
        }
    }, [currentZoom, mapCenter]);

    // 定位當前位置
    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) {
            alert('您的瀏覽器不支援定位功能');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newLocation = { lat: latitude, lng: longitude };
                setUserLocation(newLocation);
                setMapCenter(newLocation);
                setMapZoom(15); // 較高縮放以便查看周圍
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
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    // 取得所有分類選項
    const categories = [...new Set(events.map(e => e.category || '其他').filter(Boolean))];

    // 篩選事件
    const filteredEvents = events.filter(e => {
        const matchCategory = categoryFilter === 'all' || (e.category || '其他') === categoryFilter;
        const matchSeverity = severityFilter === 'all' ||
            (severityFilter === '5' && (e.severity || 0) >= 5) ||
            (severityFilter === '4' && (e.severity || 0) === 4) ||
            (severityFilter === '3' && (e.severity || 0) === 3) ||
            (severityFilter === '2' && (e.severity || 0) === 2) ||
            (severityFilter === '1' && (e.severity || 0) <= 1);
        return matchCategory && matchSeverity;
    });



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
            <div className="page-header">
                <div className="page-header__left">
                    <h2>地圖總覽</h2>
                    {/* 圖層顯示切換 - 移至標題列 */}
                    <div className="header-layer-toggles">
                        <label className="header-layer-toggle">
                            <input
                                type="checkbox"
                                checked={showEvents}
                                onChange={(e) => setShowEvents(e.target.checked)}
                            />
                            <span>📍 災害回報</span>
                        </label>
                        <label className="header-layer-toggle">
                            <input
                                type="checkbox"
                                checked={showNcdrAlerts}
                                onChange={(e) => setShowNcdrAlerts(e.target.checked)}
                            />
                            <span>⚠️ NCDR示警</span>
                        </label>
                        <label className="header-layer-toggle">
                            <input
                                type="checkbox"
                                checked={showShelters}
                                onChange={(e) => setShowShelters(e.target.checked)}
                            />
                            <span>🏠 避難所</span>
                        </label>
                        <label className="header-layer-toggle" title="需放大至 50m 比例尺才會顯示">
                            <input
                                type="checkbox"
                                checked={showAed}
                                onChange={(e) => setShowAed(e.target.checked)}
                            />
                            <span>❤️ AED {showAed && currentZoom < AED_MIN_ZOOM && '(請放大)'}</span>
                        </label>
                        <label className="header-layer-toggle">
                            <input
                                type="checkbox"
                                checked={showWarehouses}
                                onChange={(e) => setShowWarehouses(e.target.checked)}
                            />
                            <span>📦 倉庫</span>
                        </label>
                        <label className="header-layer-toggle" title="政府公告防空避難處所（空襲/飛彈警報短時掩蔽用，與避難收容所不同）">
                            <input
                                type="checkbox"
                                checked={showAirRaidShelters}
                                onChange={(e) => setShowAirRaidShelters(e.target.checked)}
                            />
                            <span>🛡️ 防空避難處所</span>
                        </label>
                        <label className="header-layer-toggle" title="顯示災情回報熱點分析">
                            <input
                                type="checkbox"
                                checked={showHotspots}
                                onChange={(e) => setShowHotspots(e.target.checked)}
                            />
                            <span>🔥 熱點分析</span>
                        </label>
                    </div>
                </div>
                <div className="page-header__right">
                    {/* 嚴重程度圖例 - 水平排列 */}
                    <div className="header-severity-legend">
                        <span className="header-severity-legend__label">嚴重程度：</span>
                        {[5, 4, 3, 2, 1].map((level) => (
                            <span key={level} className="header-severity-legend__item">
                                <span
                                    className="header-severity-legend__dot"
                                    style={{ background: getSeverityColor(level) }}
                                />
                                <span className="header-severity-legend__text">{getSeverityLabel(level)}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="map-layout">
                {/* 地圖區域 */}
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
                            onClick={onMapClick}
                            onIdle={onMapIdle}
                            options={{
                                ...mapOptions,
                                mapTypeId: MAP_TYPES[mapType].id,
                            }}
                        >
                            {/* 災害回報標記 */}
                            {showEvents && eventsWithLocation.map((event) => (
                                <MarkerF
                                    key={event.id}
                                    position={{ lat: event.latitude, lng: event.longitude }}
                                    icon={createMarkerIcon(event.severity || 1)}
                                    onClick={() => {
                                        setInfoWindowEvent(event);
                                        setSelectedEvent(event);
                                        setSelectedNcdrAlert(null);
                                    }}
                                    title={event.title}
                                />
                            ))}

                            {/* 已確認回報標記 (顯示為災害回報) */}
                            {showEvents && confirmedReports.filter((r: Report) => r.latitude && r.longitude).map((report: Report) => {
                                const severityMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
                                return (
                                    <MarkerF
                                        key={`report-${report.id}`}
                                        position={{ lat: Number(report.latitude), lng: Number(report.longitude) }}
                                        icon={createMarkerIcon(severityMap[report.severity] || 2)}
                                        onClick={() => {
                                            // 將報告轉換為事件格式顯示
                                            const eventLike = {
                                                ...report,
                                                severity: severityMap[report.severity] || 2,
                                                latitude: Number(report.latitude),
                                                longitude: Number(report.longitude),
                                            } as unknown as Event;
                                            setInfoWindowEvent(eventLike);
                                            setSelectedEvent(null);
                                            setSelectedNcdrAlert(null);
                                        }}
                                        title={report.title}
                                    />
                                );
                            })}

                            {/* NCDR 警報標記 - 按類型過濾 */}
                            {filteredNcdrAlerts.filter(a => a.latitude && a.longitude).map((alert) => (
                                <MarkerF
                                    key={alert.id}
                                    position={{ lat: Number(alert.latitude), lng: Number(alert.longitude) }}
                                    icon={createNcdrMarkerIcon(alert.alertTypeId)}
                                    onClick={() => {
                                        setSelectedNcdrAlert(alert);
                                        setInfoWindowEvent(null);
                                        setSelectedShelter(null);
                                        setSelectedAed(null);
                                        setSelectedAirRaidShelter(null);
                                    }}
                                    title={alert.title}
                                />
                            ))}

                            {/* 避難收容所標記 */}
                            {showShelters && shelters.map((shelter) => (
                                <MarkerF
                                    key={shelter.id}
                                    position={{ lat: shelter.latitude, lng: shelter.longitude }}
                                    icon={createShelterMarkerIcon()}
                                    onClick={() => {
                                        setSelectedShelter(shelter);
                                        setSelectedAed(null);
                                        setSelectedNcdrAlert(null);
                                        setInfoWindowEvent(null);
                                        setSelectedAirRaidShelter(null);
                                    }}
                                    title={shelter.name}
                                />
                            ))}

                            {/* AED 位置標記 - 僅在縮放 ≥ 18 時顯示 */}
                            {shouldShowAed && aedLocations.map((aed) => (
                                <MarkerF
                                    key={aed.id}
                                    position={{ lat: aed.latitude, lng: aed.longitude }}
                                    icon={createAedMarkerIcon()}
                                    onClick={() => {
                                        setSelectedAed(aed);
                                        setSelectedShelter(null);
                                        setSelectedNcdrAlert(null);
                                        setInfoWindowEvent(null);
                                        setSelectedAirRaidShelter(null);
                                    }}
                                    title={aed.name}
                                />
                            ))}

                            {/* 倉庫位置標記 */}
                            {showWarehouses && warehouses.map((warehouse) => (
                                <MarkerF
                                    key={warehouse.id}
                                    position={{ lat: Number(warehouse.latitude), lng: Number(warehouse.longitude) }}
                                    icon={createWarehouseMarkerIcon()}
                                    onClick={() => {
                                        setSelectedWarehouse(warehouse);
                                        setSelectedAed(null);
                                        setSelectedShelter(null);
                                        setSelectedNcdrAlert(null);
                                        setInfoWindowEvent(null);
                                        setSelectedAirRaidShelter(null);
                                    }}
                                    title={warehouse.name}
                                />
                            ))}

                            {/* 防空避難處所標記（與避難收容所使用獨立圖標/顏色區分） */}
                            {showAirRaidShelters && airRaidShelters.map((shelter) => (
                                <MarkerF
                                    key={shelter.id}
                                    position={{ lat: shelter.latitude, lng: shelter.longitude }}
                                    icon={createAirRaidShelterMarkerIcon()}
                                    onClick={() => {
                                        setSelectedAirRaidShelter(shelter);
                                        setSelectedShelter(null);
                                        setSelectedAed(null);
                                        setSelectedWarehouse(null);
                                        setSelectedNcdrAlert(null);
                                        setInfoWindowEvent(null);
                                    }}
                                    title={shelter.name}
                                />
                            ))}

                            {/* Phase 5.2: 熱點分析圖層 */}
                            {showHotspots && heatmapData.length > 0 && (
                                <HeatmapLayerF
                                    data={heatmapData}
                                    options={{
                                        radius: 30,
                                        opacity: 0.7,
                                        gradient: [
                                            'rgba(0, 255, 0, 0)',
                                            'rgba(0, 255, 0, 0.6)',
                                            'rgba(255, 255, 0, 0.8)',
                                            'rgba(255, 165, 0, 0.9)',
                                            'rgba(255, 0, 0, 1)',
                                        ],
                                    }}
                                />
                            )}

                            {/* 事件 InfoWindow */}
                            {infoWindowEvent && infoWindowEvent.latitude && infoWindowEvent.longitude && (
                                <InfoWindowF
                                    position={{
                                        lat: Number(infoWindowEvent.latitude),
                                        lng: Number(infoWindowEvent.longitude),
                                    }}
                                    onCloseClick={() => setInfoWindowEvent(null)}
                                    options={{
                                        pixelOffset: new google.maps.Size(0, -30),
                                    }}
                                >
                                    <div className="gmap-infowindow">
                                        <div className="gmap-infowindow__header">
                                            <span
                                                className="gmap-infowindow__severity"
                                                style={{ background: getSeverityColor(infoWindowEvent.severity || 1) }}
                                            >
                                                {getSeverityLabel(infoWindowEvent.severity || 1)}
                                            </span>
                                            <span className="gmap-infowindow__category">
                                                {infoWindowEvent.category || '其他'}
                                            </span>
                                        </div>
                                        <h4 className="gmap-infowindow__title">{infoWindowEvent.title}</h4>
                                        <p className="gmap-infowindow__desc">
                                            {infoWindowEvent.description || '無描述'}
                                        </p>
                                        {infoWindowEvent.address && (
                                            <p className="gmap-infowindow__address">
                                                📍 {infoWindowEvent.address}
                                            </p>
                                        )}
                                        <div className="gmap-infowindow__actions">
                                            <button
                                                onClick={() => {
                                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${infoWindowEvent.latitude},${infoWindowEvent.longitude}`;
                                                    window.open(url, '_blank');
                                                }}
                                            >
                                                🧭 導航
                                            </button>
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}

                            {/* NCDR 警報 InfoWindow */}
                            {selectedNcdrAlert && selectedNcdrAlert.latitude && selectedNcdrAlert.longitude && (
                                <InfoWindowF
                                    position={{
                                        lat: Number(selectedNcdrAlert.latitude),
                                        lng: Number(selectedNcdrAlert.longitude),
                                    }}
                                    onCloseClick={() => setSelectedNcdrAlert(null)}
                                    options={{
                                        pixelOffset: new google.maps.Size(0, -30),
                                    }}
                                >
                                    <div className="gmap-infowindow">
                                        <div className="gmap-infowindow__header">
                                            <span
                                                className="gmap-infowindow__severity"
                                                style={{ background: selectedNcdrAlert.severity === 'critical' ? '#B85C5C' : selectedNcdrAlert.severity === 'warning' ? '#C9A256' : '#5C7B8E' }}
                                            >
                                                {selectedNcdrAlert.alertTypeName}
                                            </span>
                                            <span className="gmap-infowindow__category">
                                                NCDR 示警
                                            </span>
                                        </div>
                                        <h4 className="gmap-infowindow__title">{selectedNcdrAlert.title}</h4>
                                        <p className="gmap-infowindow__desc">
                                            {selectedNcdrAlert.description || '無描述'}
                                        </p>
                                        <div className="gmap-infowindow__actions">
                                            {selectedNcdrAlert.sourceLink && (
                                                <button
                                                    onClick={() => window.open(selectedNcdrAlert.sourceLink, '_blank')}
                                                >
                                                    📎 查看詳情
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}

                            {/* 避難收容所 InfoWindow */}
                            {selectedShelter && (
                                <InfoWindowF
                                    position={{
                                        lat: selectedShelter.latitude,
                                        lng: selectedShelter.longitude,
                                    }}
                                    onCloseClick={() => setSelectedShelter(null)}
                                    options={{
                                        pixelOffset: new google.maps.Size(0, -25),
                                    }}
                                >
                                    <div className="gmap-infowindow">
                                        <div className="gmap-infowindow__header">
                                            <span
                                                className="gmap-infowindow__severity"
                                                style={{ background: '#4CAF50' }}
                                            >
                                                🏠 避難所
                                            </span>
                                            <span className="gmap-infowindow__category">
                                                {selectedShelter.type}
                                            </span>
                                        </div>
                                        <h4 className="gmap-infowindow__title">{selectedShelter.name}</h4>
                                        <p className="gmap-infowindow__desc">
                                            📍 {selectedShelter.address || `${selectedShelter.city}${selectedShelter.district}`}
                                        </p>
                                        <p className="gmap-infowindow__desc">
                                            👥 可收容人數：{selectedShelter.capacity || '未知'}
                                        </p>
                                        <div className="gmap-infowindow__actions">
                                            <button
                                                onClick={() => {
                                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedShelter.latitude},${selectedShelter.longitude}`;
                                                    window.open(url, '_blank');
                                                }}
                                            >
                                                🧭 導航
                                            </button>
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}

                            {/* AED 位置 InfoWindow */}
                            {selectedAed && (
                                <InfoWindowF
                                    position={{
                                        lat: selectedAed.latitude,
                                        lng: selectedAed.longitude,
                                    }}
                                    onCloseClick={() => setSelectedAed(null)}
                                    options={{
                                        pixelOffset: new google.maps.Size(0, -25),
                                    }}
                                >
                                    <div className="gmap-infowindow">
                                        <div className="gmap-infowindow__header">
                                            <span
                                                className="gmap-infowindow__severity"
                                                style={{ background: '#E53935' }}
                                            >
                                                ❤️ AED
                                            </span>
                                        </div>
                                        <h4 className="gmap-infowindow__title">{selectedAed.name}</h4>
                                        <p className="gmap-infowindow__desc">
                                            📍 {selectedAed.address}
                                        </p>
                                        {selectedAed.placeName && (
                                            <p className="gmap-infowindow__desc">
                                                🏢 {selectedAed.placeName} {selectedAed.floor && `(${selectedAed.floor})`}
                                            </p>
                                        )}
                                        {selectedAed.openHours && (
                                            <p className="gmap-infowindow__desc">
                                                🕐 開放時間：{selectedAed.openHours}
                                            </p>
                                        )}
                                        <div className="gmap-infowindow__actions">
                                            <button
                                                onClick={() => {
                                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedAed.latitude},${selectedAed.longitude}`;
                                                    window.open(url, '_blank');
                                                }}
                                            >
                                                🧭 導航
                                            </button>
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}

                            {/* 倉庫 InfoWindow */}
                            {selectedWarehouse && (
                                <InfoWindowF
                                    position={{
                                        lat: Number(selectedWarehouse.latitude),
                                        lng: Number(selectedWarehouse.longitude),
                                    }}
                                    onCloseClick={() => setSelectedWarehouse(null)}
                                    options={{
                                        pixelOffset: new google.maps.Size(0, -25),
                                    }}
                                >
                                    <div className="gmap-infowindow">
                                        <div className="gmap-infowindow__header">
                                            <span
                                                className="gmap-infowindow__severity"
                                                style={{ background: '#2196F3' }}
                                            >
                                                📦 倉庫
                                            </span>
                                            {selectedWarehouse.isPrimary && (
                                                <span className="gmap-infowindow__category">
                                                    主倉庫
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="gmap-infowindow__title">{selectedWarehouse.name}</h4>
                                        <p className="gmap-infowindow__desc">
                                            📍 {selectedWarehouse.address || '無地址'}
                                        </p>
                                        {selectedWarehouse.contactPerson && (
                                            <p className="gmap-infowindow__desc">
                                                👤 {selectedWarehouse.contactPerson} {selectedWarehouse.contactPhone && `(${selectedWarehouse.contactPhone})`}
                                            </p>
                                        )}
                                        <div className="gmap-infowindow__actions">
                                            <button
                                                onClick={() => {
                                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedWarehouse.latitude},${selectedWarehouse.longitude}`;
                                                    window.open(url, '_blank');
                                                }}
                                            >
                                                🧭 導航
                                            </button>
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}

                            {/* 防空避難處所 InfoWindow */}
                            {selectedAirRaidShelter && (
                                <InfoWindowF
                                    position={{
                                        lat: selectedAirRaidShelter.latitude,
                                        lng: selectedAirRaidShelter.longitude,
                                    }}
                                    onCloseClick={() => setSelectedAirRaidShelter(null)}
                                    options={{
                                        pixelOffset: new google.maps.Size(0, -25),
                                    }}
                                >
                                    <div className="gmap-infowindow">
                                        <div className="gmap-infowindow__header">
                                            <span
                                                className="gmap-infowindow__severity"
                                                style={{ background: '#FF8F00' }}
                                            >
                                                🛡️ 防空避難處所
                                            </span>
                                        </div>
                                        <h4 className="gmap-infowindow__title">{selectedAirRaidShelter.name}</h4>
                                        <p className="gmap-infowindow__desc">
                                            📍 {selectedAirRaidShelter.address || `${selectedAirRaidShelter.city}${selectedAirRaidShelter.district}`}
                                        </p>
                                        <p className="gmap-infowindow__desc">
                                            👥 容納人數：{selectedAirRaidShelter.capacity || '未知'}
                                        </p>
                                        {selectedAirRaidShelter.basementLevels != null && (
                                            <p className="gmap-infowindow__desc">
                                                🏚️ 地下 {selectedAirRaidShelter.basementLevels} 層
                                            </p>
                                        )}
                                        {selectedAirRaidShelter.managingOrg && (
                                            <p className="gmap-infowindow__desc">
                                                🏢 管理單位：{selectedAirRaidShelter.managingOrg}
                                            </p>
                                        )}
                                        <div className="gmap-infowindow__actions">
                                            <button
                                                onClick={() => {
                                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedAirRaidShelter.latitude},${selectedAirRaidShelter.longitude}`;
                                                    window.open(url, '_blank');
                                                }}
                                            >
                                                🧭 導航
                                            </button>
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}

                            {/* 用戶位置標記 - Google Maps 藍點樣式 */}
                            {userLocation && (
                                <>
                                    {/* 外圈脈動光暈 */}
                                    <MarkerF
                                        position={userLocation}
                                        icon={{
                                            path: google.maps.SymbolPath.CIRCLE,
                                            fillColor: '#4285F4',
                                            fillOpacity: 0.2,
                                            strokeColor: '#4285F4',
                                            strokeWeight: 1,
                                            strokeOpacity: 0.5,
                                            scale: 25,
                                        }}
                                        zIndex={999}
                                    />
                                    {/* 中心藍點 */}
                                    <MarkerF
                                        position={userLocation}
                                        icon={{
                                            path: google.maps.SymbolPath.CIRCLE,
                                            fillColor: '#4285F4',
                                            fillOpacity: 1,
                                            strokeColor: '#ffffff',
                                            strokeWeight: 3,
                                            scale: 8,
                                        }}
                                        title="您的位置"
                                        zIndex={1000}
                                    />
                                </>
                            )}
                        </GoogleMap>
                    )}

                    {/* 圖層選擇器 */}
                    <div className="map-layer-selector">
                        <button
                            className="map-layer-btn"
                            onClick={() => setShowLayerMenu(!showLayerMenu)}
                            title="切換圖層"
                        >
                            🗺️ {MAP_TYPES[mapType].name}
                        </button>
                        {showLayerMenu && (
                            <div className="map-layer-menu">
                                {(Object.keys(MAP_TYPES) as MapTypeKey[]).map((key) => (
                                    <button
                                        key={key}
                                        className={`map-layer-option ${mapType === key ? 'active' : ''}`}
                                        onClick={() => {
                                            setMapType(key);
                                            setShowLayerMenu(false);
                                        }}
                                    >
                                        {MAP_TYPES[key].name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 定位目前位置按鈕 - Google Maps 風格 */}
                    <button
                        className={`map-locate-btn ${isLocating ? 'map-locate-btn--loading' : ''}`}
                        onClick={handleLocateMe}
                        disabled={isLocating}
                        title="定位目前位置"
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

                {/* 側邊欄 - Tab切換式列表 */}
                <div className="map-sidebar">
                    <Card padding="sm">
                        {/* Tab 切換器 */}
                        <div className="sidebar-tabs">
                            <button
                                className={`sidebar-tab ${sidebarTab === 'events' ? 'sidebar-tab--active' : ''}`}
                                onClick={() => setSidebarTab('events')}
                            >
                                📍 災害回報 <span className="sidebar-tab__count">{filteredEvents.length}</span>
                            </button>
                            <button
                                className={`sidebar-tab ${sidebarTab === 'ncdr' ? 'sidebar-tab--active' : ''}`}
                                onClick={() => setSidebarTab('ncdr')}
                            >
                                ⚠️ NCDR示警 <span className="sidebar-tab__count">{filteredNcdrAlerts.length}</span>
                            </button>
                        </div>

                        {/* 事件 Tab */}
                        {sidebarTab === 'events' && (
                            <>
                                {/* 篩選器 */}
                                <div className="map-filters">
                                    <div className="map-filter">
                                        <label>分類</label>
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                        >
                                            <option value="all">全部分類</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="map-filter">
                                        <label>程度</label>
                                        <select
                                            value={severityFilter}
                                            onChange={(e) => setSeverityFilter(e.target.value)}
                                        >
                                            <option value="all">全部程度</option>
                                            <option value="5">危機</option>
                                            <option value="4">緊急</option>
                                            <option value="3">警戒</option>
                                            <option value="2">注意</option>
                                            <option value="1">一般</option>
                                        </select>
                                    </div>
                                </div>

                                {isLoading && <div className="loading">載入中...</div>}

                                {!isLoading && filteredEvents.length === 0 && (
                                    <div className="empty-state">
                                        <span>📭</span>
                                        <p>沒有符合條件的事件</p>
                                    </div>
                                )}

                                <div className="map-event-list">
                                    {filteredEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className={`map-event-item ${selectedEvent?.id === event.id ? 'map-event-item--selected' : ''}`}
                                            onClick={() => handleEventSelect(event)}
                                        >
                                            <div className="map-event-item__header">
                                                <Badge
                                                    variant={(event.severity || 0) >= 4 ? 'danger' : (event.severity || 0) >= 3 ? 'warning' : 'default'}
                                                    size="sm"
                                                >
                                                    {event.category || '其他'}
                                                </Badge>
                                                {event.latitude && event.longitude && (
                                                    <span className="map-event-item__location">📍</span>
                                                )}
                                            </div>
                                            <div className="map-event-item__title">{event.title}</div>
                                            <div className="map-event-item__meta">
                                                <span style={{ color: getSeverityColor(event.severity || 1) }}>
                                                    {getSeverityLabel(event.severity || 1)}
                                                </span>
                                                <span>{formatTime(event.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* NCDR 示警 Tab */}
                        {sidebarTab === 'ncdr' && (
                            <>
                                {/* NCDR 篩選器 */}
                                <div className="map-filters">
                                    <div className="map-filter">
                                        <label>類型</label>
                                        <select
                                            value={ncdrSidebarTypeFilter}
                                            onChange={(e) => setNcdrSidebarTypeFilter(e.target.value)}
                                        >
                                            <option value="all">全部類型</option>
                                            {[...NCDR_CORE_TYPES, ...NCDR_EXTENDED_TYPES].map(t => (
                                                <option key={t.id} value={t.id.toString()}>
                                                    {t.icon} {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="map-filter">
                                        <label>程度</label>
                                        <select
                                            value={ncdrSidebarSeverityFilter}
                                            onChange={(e) => setNcdrSidebarSeverityFilter(e.target.value)}
                                        >
                                            <option value="all">全部程度</option>
                                            <option value="critical">危急</option>
                                            <option value="warning">警告</option>
                                            <option value="info">資訊</option>
                                        </select>
                                    </div>
                                </div>

                                {filteredNcdrSidebarAlerts.length === 0 ? (
                                    <div className="empty-state">
                                        <span>📭</span>
                                        <p>沒有符合條件的 NCDR 示警</p>
                                    </div>
                                ) : (
                                    <div className="map-event-list">
                                        {filteredNcdrSidebarAlerts.map((alert) => (
                                            <div
                                                key={alert.id}
                                                className={`map-event-item map-event-item--ncdr ${selectedNcdrAlert?.id === alert.id ? 'map-event-item--selected' : ''}`}
                                                onClick={() => handleNcdrAlertSelect(alert)}
                                            >
                                                <div className="map-event-item__header">
                                                    <Badge
                                                        variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}
                                                        size="sm"
                                                    >
                                                        {alert.alertTypeName}
                                                    </Badge>
                                                    {alert.latitude && alert.longitude && (
                                                        <span className="map-event-item__location">📍</span>
                                                    )}
                                                </div>
                                                <div className="map-event-item__title">{alert.title}</div>
                                                <div className="map-event-item__meta">
                                                    <span className="ncdr-source">{alert.sourceUnit}</span>
                                                    <span>{formatTime(alert.publishedAt)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </Card>

                    {/* 選中事件詳情 */}
                    {selectedEvent && (
                        <Card title="事件詳情" padding="md" className="map-event-detail">
                            <div className="map-event-detail__content">
                                <h4>{selectedEvent.title}</h4>
                                <p className="map-event-detail__desc">
                                    {selectedEvent.description || '無描述'}
                                </p>
                                <div className="map-event-detail__info">
                                    <div>
                                        <strong>類別:</strong> {selectedEvent.category || '其他'}
                                    </div>
                                    <div>
                                        <strong>狀態:</strong> {selectedEvent.status === 'active' ? '進行中' : '已解除'}
                                    </div>
                                    <div>
                                        <strong>嚴重程度:</strong>
                                        <span style={{ color: getSeverityColor(selectedEvent.severity || 1) }}>
                                            {getSeverityLabel(selectedEvent.severity || 1)}
                                        </span>
                                    </div>
                                    {selectedEvent.address && (
                                        <div>
                                            <strong>地址:</strong> {selectedEvent.address}
                                        </div>
                                    )}
                                    {selectedEvent.latitude && selectedEvent.longitude && (
                                        <div className="map-event-detail__gps">
                                            <strong>GPS 座標:</strong>
                                            <code className="gps-coords">
                                                {Number(selectedEvent.latitude).toFixed(6)}, {Number(selectedEvent.longitude).toFixed(6)}
                                            </code>
                                            <button
                                                className="copy-btn"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(
                                                        `${selectedEvent.latitude}, ${selectedEvent.longitude}`
                                                    );
                                                }}
                                                title="複製座標"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="map-event-detail__actions">
                                    {selectedEvent.latitude && selectedEvent.longitude && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => {
                                                const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.latitude},${selectedEvent.longitude}`;
                                                window.open(url, '_blank');
                                            }}
                                        >
                                            🧭 導航
                                        </Button>
                                    )}
                                    {selectedEvent.latitude && selectedEvent.longitude && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                const url = `https://www.google.com/maps?q=${selectedEvent.latitude},${selectedEvent.longitude}`;
                                                window.open(url, '_blank');
                                            }}
                                        >
                                            📍 開啟地圖
                                        </Button>
                                    )}
                                    <Button variant="secondary" size="sm">
                                        📋 建立任務
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    return `${days}天前`;
}
