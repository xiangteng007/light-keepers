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
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// ============ Types ============

export interface TacticalMarker {
    id: string;
    position: [number, number]; // [lng, lat]
    type: 'volunteer' | 'task' | 'resource' | 'sos' | 'hazard' | 'rally' | 'sector';
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

// ============ Marker Colors ============

const MARKER_COLORS: Record<string, string> = {
    volunteer: '#3b82f6',  // Blue
    task: '#f59e0b',       // Amber
    resource: '#10b981',   // Green
    sos: '#ef4444',        // Red
    hazard: '#dc2626',     // Dark Red
    rally: '#8b5cf6',      // Purple
    sector: '#6366f1',     // Indigo
};

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

        // Add/update markers
        markers.forEach((markerData) => {
            const existingMarker = markersRef.current.get(markerData.id);

            if (existingMarker) {
                // Update position
                existingMarker.setLngLat(markerData.position);
            } else {
                // Create new marker
                const el = document.createElement('div');
                el.className = 'tactical-marker';
                el.style.cssText = `
                    width: 24px;
                    height: 24px;
                    background-color: ${MARKER_COLORS[markerData.type] || '#888'};
                    border: 2px solid white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    color: white;
                    font-weight: bold;
                `;

                // Add icon based on type
                const icons: Record<string, string> = {
                    volunteer: '👤',
                    task: '📋',
                    resource: '📦',
                    sos: '🚨',
                    hazard: '⚠️',
                    rally: '🎯',
                    sector: '📍',
                };
                el.textContent = icons[markerData.type] || '•';

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
                        'fill-color': sector.color || '#6366f1',
                        'fill-opacity': sector.opacity || 0.3,
                    },
                });

                // Outline layer
                map.current!.addLayer({
                    id: outlineLayerId,
                    type: 'line',
                    source: sourceId,
                    paint: {
                        'line-color': sector.color || '#6366f1',
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
                    color: '#666',
                    fontSize: '14px',
                }}>
                    地圖載入中...
                </div>
            )}
        </div>
    );
};

export default MapLibreTacticalMap;
