import { useState, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { getEvents, getNcdrAlertsForMap, type NcdrAlert } from '../api';
import type { Event } from '../api';
import { Badge, Card, Button } from '../design-system';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDP3KEDizgPPNwXvS6LpcxsrF9_Lyt1bgA';

// 台灣中心座標
const TAIWAN_CENTER = { lat: 23.5, lng: 121 };
const DEFAULT_ZOOM = 7;
const EVENT_ZOOM_LEVEL = 16;

// NCDR 核心示警類型定義（含圖標與顏色）
const NCDR_CORE_TYPES = [
    { id: 33, name: '地震', icon: '🌍', color: '#5BA3C0' },      // 藍綠色
    { id: 34, name: '海嘯', icon: '🌊', color: '#4DA6E8' },      // 海洋藍
    { id: 5, name: '颱風', icon: '🌀', color: '#7B6FA6' },       // 紫色
    { id: 6, name: '雷雨', icon: '⛈️', color: '#A67B5B' },       // 棕色
    { id: 37, name: '降雨', icon: '🌧️', color: '#6B8EC9' },      // 淺藍
    { id: 38, name: '土石流', icon: '⛰️', color: '#8B6B5A' },    // 土棕色
    { id: 53, name: '火災', icon: '🔥', color: '#E85A5A' },      // 紅色
];

// NCDR 擴展示警類型
const NCDR_EXTENDED_TYPES = [
    { id: 14, name: '低溫', icon: '❄️', color: '#88CCEE' },      // 冰藍
    { id: 15, name: '濃霧', icon: '🌫️', color: '#9AA5B1' },      // 灰色
    { id: 32, name: '強風', icon: '💨', color: '#7EC8E3' },      // 天藍
    { id: 56, name: '高溫', icon: '🌡️', color: '#E8A65A' },      // 橙色
    { id: 7, name: '淹水', icon: '🌊', color: '#5AB3E8' },       // 水藍
    { id: 43, name: '水庫放流', icon: '💧', color: '#5AAAE8' },  // 深藍
    { id: 36, name: '河川高水位', icon: '🏞️', color: '#6BB3C9' }, // 河藍
    { id: 3, name: '道路封閉', icon: '🚧', color: '#F5A623' },   // 警告橙
    { id: 35, name: '鐵路事故', icon: '🚃', color: '#607D8B' },  // 灰藍 - 臺鐵公司
    { id: 51, name: '鐵路事故(高鐵)', icon: '🚄', color: '#FF5722' }, // 橘紅 - 台灣高鐵
    { id: 55, name: '傳染病', icon: '🦠', color: '#8BC34A' },    // 綠色
    { id: 12, name: '空氣品質', icon: '😷', color: '#9E9E9E' },  // 灰色
    { id: 52, name: '林火', icon: '🌲', color: '#4CAF50' },      // 森林綠
    { id: 61, name: '電力', icon: '⚡', color: '#FFC107' },      // 黃色
    { id: 44, name: '停水', icon: '🚰', color: '#2196F3' },      // 藍色
    { id: 65, name: '捷運營運', icon: '🚇', color: '#9C27B0' },  // 紫色
];

// 圖層類型配置
const MAP_TYPES = {
    roadmap: { name: '預設', id: 'roadmap' as google.maps.MapTypeId },
    satellite: { name: '衛星', id: 'satellite' as google.maps.MapTypeId },
    terrain: { name: '地形', id: 'terrain' as google.maps.MapTypeId },
    hybrid: { name: '衛星+標籤', id: 'hybrid' as google.maps.MapTypeId },
} as const;

type MapTypeKey = keyof typeof MAP_TYPES;

// 嚴重程度對應的顏色和標記圖標
const getSeverityColor = (severity: number) => {
    if (severity >= 5) return '#B85C5C'; // 危機 - 紅色
    if (severity >= 4) return '#C9A256'; // 緊急 - 橙色
    if (severity >= 3) return '#B8976F'; // 警戒 - 金棕
    if (severity >= 2) return '#5C7B8E'; // 注意 - 藍灰
    return '#6B8E5C'; // 一般 - 綠色
};

const getSeverityLabel = (severity: number) => {
    if (severity >= 5) return '危機';
    if (severity >= 4) return '緊急';
    if (severity >= 3) return '警戒';
    if (severity >= 2) return '注意';
    return '一般';
};

// 自訂標記圖標 - 災情事件 (PIN 形狀)
const createMarkerIcon = (severity: number) => {
    const color = getSeverityColor(severity);
    return {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 1.8,
        anchor: new google.maps.Point(12, 22),
    };
};

// NCDR 警報圖標 - 圓形圖標（根據類型顯示不同顏色）
const getNcdrTypeColor = (alertTypeId: number): string => {
    const allTypes = [...NCDR_CORE_TYPES, ...NCDR_EXTENDED_TYPES];
    const typeInfo = allTypes.find(t => t.id === alertTypeId);
    return typeInfo?.color || '#C9A256';
};

const createNcdrMarkerIcon = (alertTypeId: number) => {
    const color = getNcdrTypeColor(alertTypeId);
    // 使用圓形帶圖標的設計
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
        scale: 12,
    };
};

// Map container style
const containerStyle = {
    width: '100%',
    height: '100%',
};

// Map options for POI click
const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false, // We'll create our own
    scaleControl: true,
    streetViewControl: true,
    rotateControl: false,
    fullscreenControl: true,
    clickableIcons: true, // Enable POI clicking
    styles: [
        // 可選：自訂地圖樣式
    ],
};

// 初始化核心類型為全選
const initNcdrFilters = (): Record<number, boolean> => {
    const filters: Record<number, boolean> = {};
    NCDR_CORE_TYPES.forEach(t => { filters[t.id] = true; });
    NCDR_EXTENDED_TYPES.forEach(t => { filters[t.id] = false; });
    return filters;
};

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
    const [ncdrTypeFilters, setNcdrTypeFilters] = useState<Record<number, boolean>>(initNcdrFilters);
    const [showExtendedTypes, setShowExtendedTypes] = useState(false);
    const [selectedNcdrAlert, setSelectedNcdrAlert] = useState<NcdrAlert | null>(null);

    // 側邊欄 Tab 切換
    const [sidebarTab, setSidebarTab] = useState<'events' | 'ncdr'>('events');

    // NCDR 側邊欄篩選器
    const [ncdrSidebarTypeFilter, setNcdrSidebarTypeFilter] = useState<string>('all');
    const [ncdrSidebarSeverityFilter, setNcdrSidebarSeverityFilter] = useState<string>('all');

    const mapRef = useRef<google.maps.Map | null>(null);

    // 載入 Google Maps API
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places'],
    });

    // 獲取所有事件
    const { data: eventsData, isLoading } = useQuery({
        queryKey: ['allEvents'],
        queryFn: () => getEvents().then(res => res.data),
    });

    // 獲取 NCDR 警報 (有座標的)
    const { data: ncdrData } = useQuery({
        queryKey: ['ncdrAlertsMap'],
        queryFn: () => getNcdrAlertsForMap().then(res => res.data),
        enabled: showNcdrAlerts,
    });

    const events = eventsData?.data || [];
    const ncdrAlerts = ncdrData?.data || [];

    // 根據類型過濾 NCDR 警報 (地圖用)
    const filteredNcdrAlerts = useMemo(() => {
        if (!showNcdrAlerts) return [];
        return ncdrAlerts.filter(alert => {
            const typeId = alert.alertTypeId;
            return ncdrTypeFilters[typeId] === true;
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

    // 計算每個類型的警報數量
    const ncdrTypeCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        NCDR_CORE_TYPES.forEach(t => { counts[t.id] = 0; });
        NCDR_EXTENDED_TYPES.forEach(t => { counts[t.id] = 0; });
        ncdrAlerts.forEach(alert => {
            if (counts[alert.alertTypeId] !== undefined) {
                counts[alert.alertTypeId]++;
            }
        });
        return counts;
    }, [ncdrAlerts]);

    // NCDR 類型過濾切換
    const toggleNcdrType = useCallback((typeId: number) => {
        setNcdrTypeFilters(prev => ({
            ...prev,
            [typeId]: !prev[typeId]
        }));
    }, []);

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

    // 統計數據
    const stats = {
        total: events.length,
        active: events.filter(e => e.status === 'active').length,
        critical: events.filter(e => (e.severity || 0) >= 4).length,
        withLocation: eventsWithLocation.length,
    };

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
                    <Badge variant="info">{stats.withLocation} 個有定位事件</Badge>
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
                            options={{
                                ...mapOptions,
                                mapTypeId: MAP_TYPES[mapType].id,
                            }}
                        >
                            {/* 災情事件標記 */}
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

                            {/* NCDR 警報標記 - 按類型過濾 */}
                            {filteredNcdrAlerts.filter(a => a.latitude && a.longitude).map((alert) => (
                                <MarkerF
                                    key={alert.id}
                                    position={{ lat: Number(alert.latitude), lng: Number(alert.longitude) }}
                                    icon={createNcdrMarkerIcon(alert.alertTypeId)}
                                    onClick={() => {
                                        setSelectedNcdrAlert(alert);
                                        setInfoWindowEvent(null);
                                    }}
                                    title={alert.title}
                                />
                            ))}

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

                    {/* 圖例及篩選器 */}
                    <div className="map-legend">
                        <div className="map-legend__title">圖層顯示</div>
                        <label className="map-legend__toggle">
                            <input
                                type="checkbox"
                                checked={showEvents}
                                onChange={(e) => setShowEvents(e.target.checked)}
                            />
                            <span>📍 災情事件 ({eventsWithLocation.length})</span>
                        </label>
                        <label className="map-legend__toggle">
                            <input
                                type="checkbox"
                                checked={showNcdrAlerts}
                                onChange={(e) => setShowNcdrAlerts(e.target.checked)}
                            />
                            <span>⚠️ NCDR示警 ({filteredNcdrAlerts.length}/{ncdrAlerts.length})</span>
                        </label>

                        {/* NCDR 類型細分篩選 */}
                        {showNcdrAlerts && (
                            <div className="ncdr-type-filters">
                                {NCDR_CORE_TYPES.map(type => (
                                    <label key={type.id} className="ncdr-type-filter">
                                        <input
                                            type="checkbox"
                                            checked={ncdrTypeFilters[type.id] || false}
                                            onChange={() => toggleNcdrType(type.id)}
                                        />
                                        <span className="ncdr-type-icon">{type.icon}</span>
                                        <span className="ncdr-type-name">{type.name}</span>
                                        <span className="ncdr-type-count">({ncdrTypeCounts[type.id] || 0})</span>
                                    </label>
                                ))}

                                <button
                                    className="ncdr-type-expand"
                                    onClick={() => setShowExtendedTypes(!showExtendedTypes)}
                                >
                                    {showExtendedTypes ? '▲ 收起' : '▼ 更多類型'}
                                </button>

                                {showExtendedTypes && (
                                    <div className="ncdr-extended-types">
                                        {NCDR_EXTENDED_TYPES.map(type => (
                                            <label key={type.id} className="ncdr-type-filter ncdr-type-filter--extended">
                                                <input
                                                    type="checkbox"
                                                    checked={ncdrTypeFilters[type.id] || false}
                                                    onChange={() => toggleNcdrType(type.id)}
                                                />
                                                <span className="ncdr-type-icon">{type.icon}</span>
                                                <span className="ncdr-type-name">{type.name}</span>
                                                <span className="ncdr-type-count">({ncdrTypeCounts[type.id] || 0})</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                                📍 災情事件 <span className="sidebar-tab__count">{filteredEvents.length}</span>
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
