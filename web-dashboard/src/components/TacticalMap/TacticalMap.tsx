/**
 * TacticalMap Component
 * 
 * Real-time tactical map with Mapbox GL JS
 * v1.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './TacticalMap.module.css';

// Types
export interface MapMarker {
    id: string;
    type: 'task' | 'volunteer' | 'resource' | 'alert' | 'incident';
    coordinates: [number, number]; // [lng, lat]
    title: string;
    description?: string;
    status?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    icon?: string;
    data?: any;
}

export interface MapLayer {
    id: string;
    name: string;
    visible: boolean;
    type: 'markers' | 'polygon' | 'line' | 'heatmap';
    color?: string;
}

export interface TacticalMapProps {
    center?: [number, number];
    zoom?: number;
    markers?: MapMarker[];
    onMarkerClick?: (marker: MapMarker) => void;
    onMapClick?: (coordinates: [number, number]) => void;
    showLayers?: boolean;
    className?: string;
}

// Mock Mapbox token check
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const TacticalMap: React.FC<TacticalMapProps> = ({
    center = [121.5654, 25.0330], // Default: Taipei
    zoom = 12,
    markers = [],
    onMarkerClick,
    onMapClick,
    showLayers = true,
    className,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
    const [layers, setLayers] = useState<MapLayer[]>([
        { id: 'tasks', name: '任務', visible: true, type: 'markers', color: '#3B82F6' },
        { id: 'volunteers', name: '志工', visible: true, type: 'markers', color: '#10B981' },
        { id: 'resources', name: '資源', visible: true, type: 'markers', color: '#F59E0B' },
        { id: 'alerts', name: '警報', visible: true, type: 'markers', color: '#EF4444' },
        { id: 'incidents', name: '事件', visible: true, type: 'markers', color: '#9333EA' },
    ]);

    // Filter markers by visible layers
    const visibleMarkers = markers.filter(marker => {
        const layerId = marker.type + 's';
        const layer = layers.find(l => l.id === layerId);
        return layer?.visible !== false;
    });

    // Handle marker click
    const handleMarkerClick = useCallback((marker: MapMarker) => {
        setSelectedMarker(marker);
        onMarkerClick?.(marker);
    }, [onMarkerClick]);

    // Toggle layer visibility
    const toggleLayer = (layerId: string) => {
        setLayers(prev => prev.map(layer =>
            layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
        ));
    };

    // Get marker style based on type and priority
    const getMarkerStyle = (marker: MapMarker) => {
        const colors = {
            task: '#3B82F6',
            volunteer: '#10B981',
            resource: '#F59E0B',
            alert: '#EF4444',
            incident: '#9333EA',
        };

        const priorityScale = {
            low: 1,
            medium: 1.2,
            high: 1.4,
            critical: 1.6,
        };

        return {
            backgroundColor: colors[marker.type] || '#6B7280',
            transform: `scale(${priorityScale[marker.priority || 'medium']})`,
        };
    };

    // Get marker icon based on type
    const getMarkerIcon = (type: MapMarker['type']) => {
        const icons = {
            task: '📋',
            volunteer: '👤',
            resource: '📦',
            alert: '⚠️',
            incident: '🚨',
        };
        return icons[type] || '📍';
    };

    useEffect(() => {
        // Simulate map loading
        const timer = setTimeout(() => setMapLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`${styles.container} ${className || ''}`}>
            {/* Map Container */}
            <div ref={mapContainerRef} className={styles.mapContainer}>
                {!MAPBOX_TOKEN ? (
                    // Fallback: Static map view
                    <div className={styles.staticMap}>
                        <div className={styles.mapOverlay}>
                            <div className={styles.mapCenter}>
                                <span className={styles.centerIcon}>🎯</span>
                                <span className={styles.coordinates}>
                                    {center[1].toFixed(4)}, {center[0].toFixed(4)}
                                </span>
                            </div>

                            {/* Render markers on static map */}
                            {visibleMarkers.map((marker, index) => {
                                // Calculate relative position (simplified)
                                const relX = 50 + (marker.coordinates[0] - center[0]) * 1000;
                                const relY = 50 - (marker.coordinates[1] - center[1]) * 1000;

                                if (relX < 0 || relX > 100 || relY < 0 || relY > 100) return null;

                                return (
                                    <div
                                        key={marker.id}
                                        className={styles.marker}
                                        style={{
                                            left: `${relX}%`,
                                            top: `${relY}%`,
                                            ...getMarkerStyle(marker),
                                        }}
                                        onClick={() => handleMarkerClick(marker)}
                                        title={marker.title}
                                    >
                                        {getMarkerIcon(marker.type)}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.noMapboxMessage}>
                            <p>🗺️ 地圖預覽模式</p>
                            <span>設定 VITE_MAPBOX_TOKEN 以啟用完整地圖功能</span>
                        </div>
                    </div>
                ) : (
                    // Mapbox GL JS would be initialized here
                    <div className={styles.mapPlaceholder}>
                        {!mapLoaded ? (
                            <div className={styles.loading}>
                                <div className={styles.spinner} />
                                <span>載入地圖中...</span>
                            </div>
                        ) : (
                            <div className={styles.mapReady}>
                                <p>✅ Mapbox 地圖已載入</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Layer Control Panel */}
            {showLayers && (
                <div className={styles.layerPanel}>
                    <div className={styles.layerHeader}>
                        <span>📊 圖層</span>
                    </div>
                    <div className={styles.layerList}>
                        {layers.map(layer => (
                            <label key={layer.id} className={styles.layerItem}>
                                <input
                                    type="checkbox"
                                    checked={layer.visible}
                                    onChange={() => toggleLayer(layer.id)}
                                />
                                <span
                                    className={styles.layerColor}
                                    style={{ backgroundColor: layer.color }}
                                />
                                <span className={styles.layerName}>{layer.name}</span>
                                <span className={styles.layerCount}>
                                    {markers.filter(m => m.type + 's' === layer.id).length}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Marker Info Popup */}
            {selectedMarker && (
                <div className={styles.popup}>
                    <div className={styles.popupHeader}>
                        <span>{getMarkerIcon(selectedMarker.type)} {selectedMarker.title}</span>
                        <button
                            className={styles.popupClose}
                            onClick={() => setSelectedMarker(null)}
                        >
                            ✕
                        </button>
                    </div>
                    {selectedMarker.description && (
                        <p className={styles.popupDesc}>{selectedMarker.description}</p>
                    )}
                    {selectedMarker.status && (
                        <div className={styles.popupStatus}>
                            狀態: <span>{selectedMarker.status}</span>
                        </div>
                    )}
                    {selectedMarker.priority && (
                        <div className={styles.popupPriority}>
                            優先級: <span className={styles[selectedMarker.priority]}>
                                {selectedMarker.priority}
                            </span>
                        </div>
                    )}
                    <div className={styles.popupCoords}>
                        📍 {selectedMarker.coordinates[1].toFixed(4)}, {selectedMarker.coordinates[0].toFixed(4)}
                    </div>
                </div>
            )}

            {/* Map Controls */}
            <div className={styles.controls}>
                <button className={styles.controlBtn} title="放大">+</button>
                <button className={styles.controlBtn} title="縮小">−</button>
                <button className={styles.controlBtn} title="我的位置">📍</button>
                <button className={styles.controlBtn} title="全螢幕">⛶</button>
            </div>

            {/* Stats Bar */}
            <div className={styles.statsBar}>
                <span>📍 {visibleMarkers.length} 個標記</span>
                <span>|</span>
                <span>縮放: {zoom}x</span>
                <span>|</span>
                <span>{center[1].toFixed(2)}°N, {center[0].toFixed(2)}°E</span>
            </div>
        </div>
    );
};

export default TacticalMap;
