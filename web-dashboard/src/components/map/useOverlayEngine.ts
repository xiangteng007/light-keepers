import { useEffect, useRef, useCallback } from 'react';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import {
    Map,
    GeoJSONSource,
} from 'maplibre-gl';

// Overlay types matching backend enums
export type OverlayType = 'aoi' | 'hazard' | 'poi' | 'line' | 'polygon';
export type OverlayState = 'draft' | 'published' | 'removed';
export type HazardStatus = 'active' | 'watch' | 'cleared';

export interface OverlayFeature {
    id: string;
    type: OverlayType;
    geometry: GeoJSON.Geometry;
    properties: {
        name?: string;
        code?: string;
        state: OverlayState;
        // Hazard specific
        hazardType?: string;
        severity?: number;
        hazardStatus?: HazardStatus;
        confidence?: number;
        // POI specific
        poiType?: string;
        capacity?: number;
        // Lock info
        lockedBy?: string;
        // Selection state
        selected?: boolean;
    };
}

// Severity color mapping
const SEVERITY_COLORS: Record<number, string> = {
    0: 'rgba(156, 163, 175, 0.4)', // Gray
    1: 'rgba(34, 197, 94, 0.4)',   // Green
    2: 'rgba(234, 179, 8, 0.4)',   // Yellow
    3: 'rgba(249, 115, 22, 0.4)',  // Orange
    4: 'rgba(239, 68, 68, 0.4)',   // Red
};

// POI icon mapping
const POI_ICONS: Record<string, string> = {
    shelter: '🏠',
    aed: '💚',
    rally_point: '🚩',
    supply: '📦',
    hospital: '🏥',
    fire_station: '🚒',
    police: '👮',
};

interface UseOverlayEngineOptions {
    map: Map | null;
    overlays: OverlayFeature[];
    onSelect?: (overlay: OverlayFeature | null) => void;
    showDrafts?: boolean; // Command Post shows drafts, field view doesn't
}

const SOURCE_ID = 'overlays';
const LAYER_AOI_FILL = 'overlay-aoi-fill';
const LAYER_AOI_OUTLINE = 'overlay-aoi-outline';
const LAYER_HAZARD_FILL = 'overlay-hazard-fill';
const LAYER_HAZARD_OUTLINE = 'overlay-hazard-outline';
const LAYER_POI_SYMBOL = 'overlay-poi-symbol';

export function useOverlayEngine(options: UseOverlayEngineOptions) {
    const { map, overlays, onSelect, showDrafts = true } = options;
    const sourceRef = useRef<GeoJSONSource | null>(null);

    // Initialize overlay source and layers
    useEffect(() => {
        if (!map) return;

        // Wait for map to be loaded
        const setup = () => {
            // Add GeoJSON source
            if (!map.getSource(SOURCE_ID)) {
                map.addSource(SOURCE_ID, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                });
            }
            sourceRef.current = map.getSource(SOURCE_ID) as GeoJSONSource;

            // Add AOI layers
            if (!map.getLayer(LAYER_AOI_FILL)) {
                map.addLayer({
                    id: LAYER_AOI_FILL,
                    type: 'fill',
                    source: SOURCE_ID,
                    filter: ['==', ['get', 'type'], 'aoi'],
                    paint: {
                        'fill-color': [
                            'case',
                            ['==', ['get', 'state'], 'draft'],
                            'rgba(59, 130, 246, 0.1)',
                            'rgba(59, 130, 246, 0.2)',
                        ],
                        'fill-outline-color': '#3B82F6',
                    },
                });

                map.addLayer({
                    id: LAYER_AOI_OUTLINE,
                    type: 'line',
                    source: SOURCE_ID,
                    filter: ['==', ['get', 'type'], 'aoi'],
                    paint: {
                        'line-color': '#3B82F6',
                        'line-width': [
                            'case',
                            ['==', ['get', 'selected'], true],
                            3,
                            2,
                        ],
                        'line-dasharray': [
                            'case',
                            ['==', ['get', 'state'], 'draft'],
                            ['literal', [2, 2]],
                            ['literal', [1]],
                        ],
                    },
                });
            }

            // Add Hazard layers
            if (!map.getLayer(LAYER_HAZARD_FILL)) {
                map.addLayer({
                    id: LAYER_HAZARD_FILL,
                    type: 'fill',
                    source: SOURCE_ID,
                    filter: ['==', ['get', 'type'], 'hazard'],
                    paint: {
                        'fill-color': [
                            'match',
                            ['get', 'severity'],
                            4, 'rgba(239, 68, 68, 0.4)',
                            3, 'rgba(249, 115, 22, 0.4)',
                            2, 'rgba(234, 179, 8, 0.4)',
                            1, 'rgba(34, 197, 94, 0.3)',
                            'rgba(156, 163, 175, 0.3)',
                        ],
                    },
                });

                map.addLayer({
                    id: LAYER_HAZARD_OUTLINE,
                    type: 'line',
                    source: SOURCE_ID,
                    filter: ['==', ['get', 'type'], 'hazard'],
                    paint: {
                        'line-color': [
                            'match',
                            ['get', 'severity'],
                            4, '#EF4444',
                            3, '#F97316',
                            2, '#EAB308',
                            1, '#22C55E',
                            '#9CA3AF',
                        ],
                        'line-width': [
                            'case',
                            ['==', ['get', 'selected'], true],
                            3,
                            2,
                        ],
                    },
                });
            }

            // Add POI layer (using text symbols for now - icon sprites later)
            if (!map.getLayer(LAYER_POI_SYMBOL)) {
                map.addLayer({
                    id: LAYER_POI_SYMBOL,
                    type: 'symbol',
                    source: SOURCE_ID,
                    filter: ['==', ['get', 'type'], 'poi'],
                    layout: {
                        'text-field': [
                            'match',
                            ['get', 'poiType'],
                            'shelter', '🏠',
                            'aed', '💚',
                            'rally_point', '🚩',
                            'supply', '📦',
                            'hospital', '🏥',
                            '📍',
                        ],
                        'text-size': 24,
                        'text-anchor': 'center',
                        'text-allow-overlap': true,
                    },
                    paint: {
                        'text-opacity': [
                            'case',
                            ['==', ['get', 'state'], 'draft'],
                            0.6,
                            1,
                        ],
                    },
                });
            }
        };

        if (map.isStyleLoaded()) {
            setup();
        } else {
            map.once('load', setup);
        }

        return () => {
            // Cleanup layers
            if (map.getLayer(LAYER_POI_SYMBOL)) map.removeLayer(LAYER_POI_SYMBOL);
            if (map.getLayer(LAYER_HAZARD_OUTLINE)) map.removeLayer(LAYER_HAZARD_OUTLINE);
            if (map.getLayer(LAYER_HAZARD_FILL)) map.removeLayer(LAYER_HAZARD_FILL);
            if (map.getLayer(LAYER_AOI_OUTLINE)) map.removeLayer(LAYER_AOI_OUTLINE);
            if (map.getLayer(LAYER_AOI_FILL)) map.removeLayer(LAYER_AOI_FILL);
            if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        };
    }, [map]);

    // Update overlay data
    useEffect(() => {
        if (!sourceRef.current || !map) return;

        // Filter overlays based on state
        const filteredOverlays = overlays.filter(o => {
            if (o.properties.state === 'removed') return false;
            if (!showDrafts && o.properties.state === 'draft') return false;
            return true;
        });

        // Convert to GeoJSON FeatureCollection
        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: filteredOverlays.map(o => ({
                type: 'Feature',
                id: o.id,
                geometry: o.geometry,
                properties: {
                    ...o.properties,
                    type: o.type,
                },
            })),
        };

        sourceRef.current.setData(geojson);
    }, [overlays, showDrafts, map]);

    // Handle click selection
    useEffect(() => {
        if (!map || !onSelect) return;

        const handleClick = (e: MapLayerMouseEvent) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [LAYER_AOI_FILL, LAYER_HAZARD_FILL, LAYER_POI_SYMBOL],
            });

            if (features.length > 0) {
                const feature = features[0];
                const overlay = overlays.find(o => o.id === feature.id);
                onSelect(overlay || null);
            } else {
                onSelect(null);
            }
        };

        map.on('click', handleClick);

        // Change cursor on hover
        const handleMouseEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };
        const handleMouseLeave = () => {
            map.getCanvas().style.cursor = '';
        };

        [LAYER_AOI_FILL, LAYER_HAZARD_FILL, LAYER_POI_SYMBOL].forEach(layer => {
            if (map.getLayer(layer)) {
                map.on('mouseenter', layer, handleMouseEnter);
                map.on('mouseleave', layer, handleMouseLeave);
            }
        });

        return () => {
            map.off('click', handleClick);
            [LAYER_AOI_FILL, LAYER_HAZARD_FILL, LAYER_POI_SYMBOL].forEach(layer => {
                if (map.getLayer(layer)) {
                    map.off('mouseenter', layer, handleMouseEnter);
                    map.off('mouseleave', layer, handleMouseLeave);
                }
            });
        };
    }, [map, overlays, onSelect]);

    // Helper to highlight an overlay
    const highlightOverlay = useCallback((_overlayId: string | null) => {
        // Update selected state in overlays - this would trigger a rerender
        // In a real implementation, we'd update a local selection state
    }, []);

    return {
        highlightOverlay,
        SEVERITY_COLORS,
        POI_ICONS,
    };
}

export default useOverlayEngine;
