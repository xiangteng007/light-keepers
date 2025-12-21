import { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../api';
import type { Event } from '../api';
import { Badge, Card, Button } from '../design-system';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDP3KEDizgPPNwXvS6LpcxsrF9_Lyt1bgA';

// 台灣中心座標
const TAIWAN_CENTER = { lat: 23.5, lng: 121 };
const DEFAULT_ZOOM = 7;
const EVENT_ZOOM_LEVEL = 16;

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

// 自訂標記圖標 (SVG)
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

export default function MapPage() {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [mapCenter, setMapCenter] = useState(TAIWAN_CENTER);
    const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [mapType, setMapType] = useState<MapTypeKey>('roadmap');
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [infoWindowEvent, setInfoWindowEvent] = useState<Event | null>(null);

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

    const events = eventsData?.data || [];

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
        const lat = parseCoord(event.latitude);
        const lng = parseCoord(event.longitude);
        if (lat && lng) {
            setMapCenter({ lat, lng });
            setMapZoom(EVENT_ZOOM_LEVEL);
            setInfoWindowEvent(event);
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
                            {eventsWithLocation.map((event) => (
                                <MarkerF
                                    key={event.id}
                                    position={{ lat: event.latitude, lng: event.longitude }}
                                    icon={createMarkerIcon(event.severity || 1)}
                                    onClick={() => {
                                        setInfoWindowEvent(event);
                                        setSelectedEvent(event);
                                    }}
                                    title={event.title}
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

                    {/* 圖例 */}
                    <div className="map-legend">
                        <div className="map-legend__title">嚴重程度</div>
                        {[5, 4, 3, 2, 1].map((level) => (
                            <div key={level} className="map-legend__item">
                                <span
                                    className="map-legend__color"
                                    style={{ background: getSeverityColor(level) }}
                                />
                                <span>{getSeverityLabel(level)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 側邊欄 - 事件列表 */}
                <div className="map-sidebar">
                    <Card title="事件列表" padding="sm">
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
