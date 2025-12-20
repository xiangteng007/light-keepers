import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../api';
import type { Event } from '../api';
import { Badge, Card, Button } from '../design-system';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 修復 Leaflet 預設圖示問題
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// 台灣中心座標
const TAIWAN_CENTER: [number, number] = [23.5, 121];
const DEFAULT_ZOOM = 7;

// 嚴重程度對應的顏色
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

// 地圖控制組件
function MapController({ center }: { center?: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.flyTo(center, 12);
        }
    }, [center, map]);

    return null;
}

// 事件標記組件
interface EventMarkerProps {
    event: Event;
    onSelect: (event: Event) => void;
}

function EventMarker({ event, onSelect }: EventMarkerProps) {
    if (!event.latitude || !event.longitude) return null;

    const severity = event.severity || 1;
    const color = getSeverityColor(severity);
    const position: [number, number] = [event.latitude, event.longitude];

    return (
        <CircleMarker
            center={position}
            radius={12 + severity * 2}
            pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: 2,
            }}
            eventHandlers={{
                click: () => onSelect(event),
            }}
        >
            <Popup>
                <div className="map-popup">
                    <h4>{event.title}</h4>
                    <p className="map-popup__category">{event.category || '其他'}</p>
                    <p className="map-popup__severity" style={{ color }}>
                        嚴重程度: {getSeverityLabel(severity)}
                    </p>
                </div>
            </Popup>
        </CircleMarker>
    );
}

export default function MapPage() {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();

    // 獲取所有事件
    const { data: eventsData, isLoading } = useQuery({
        queryKey: ['allEvents'],
        queryFn: () => getEvents({ limit: 100 }).then(res => res.data),
    });

    const events = eventsData?.data || [];
    const eventsWithLocation = events.filter(
        (e): e is Event & { latitude: number; longitude: number } =>
            typeof e.latitude === 'number' && typeof e.longitude === 'number'
    );

    const handleEventSelect = (event: Event) => {
        setSelectedEvent(event);
        if (event.latitude && event.longitude) {
            setMapCenter([event.latitude, event.longitude]);
        }
    };

    // 統計數據
    const stats = {
        total: events.length,
        active: events.filter(e => e.status === 'active').length,
        critical: events.filter(e => (e.severity || 0) >= 4).length,
        withLocation: eventsWithLocation.length,
    };

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
                    <MapContainer
                        center={TAIWAN_CENTER}
                        zoom={DEFAULT_ZOOM}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapController center={mapCenter} />

                        {eventsWithLocation.map((event) => (
                            <EventMarker
                                key={event.id}
                                event={event}
                                onSelect={handleEventSelect}
                            />
                        ))}
                    </MapContainer>

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
                        {isLoading && <div className="loading">載入中...</div>}

                        {!isLoading && events.length === 0 && (
                            <div className="empty-state">
                                <span>📭</span>
                                <p>目前沒有事件</p>
                            </div>
                        )}

                        <div className="map-event-list">
                            {events.map((event) => (
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
                                    {/* GPS 座標顯示 */}
                                    {selectedEvent.latitude && selectedEvent.longitude && (
                                        <div className="map-event-detail__gps">
                                            <strong>GPS 座標:</strong>
                                            <code className="gps-coords">
                                                {selectedEvent.latitude.toFixed(6)}, {selectedEvent.longitude.toFixed(6)}
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
                                    {/* Google Maps 導航按鈕 */}
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
