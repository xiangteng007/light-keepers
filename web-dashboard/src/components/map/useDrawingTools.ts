import { useEffect, useRef, useCallback, useState } from 'react';
import type { Map, MapMouseEvent, LngLat } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';

export type DrawingMode = 'select' | 'pan' | 'aoi_polygon' | 'hazard_polygon' | 'poi';

interface UseDrawingToolsOptions {
    map: Map | null;
    mode: DrawingMode;
    onComplete: (geometry: GeoJSON.Geometry, type: 'aoi' | 'hazard' | 'poi') => void;
    onCancel?: () => void;
}

const DRAWING_SOURCE_ID = 'drawing-preview';
const DRAWING_LAYER_POLYGON = 'drawing-preview-polygon';
const DRAWING_LAYER_LINE = 'drawing-preview-line';
const DRAWING_LAYER_POINTS = 'drawing-preview-points';
const DRAWING_LAYER_CURSOR = 'drawing-cursor';

export function useDrawingTools(options: UseDrawingToolsOptions) {
    const { map, mode, onComplete, onCancel } = options;
    const [isDrawing, setIsDrawing] = useState(false);
    const verticesRef = useRef<LngLat[]>([]);
    const cursorMarkerRef = useRef<maplibregl.Marker | null>(null);

    // Initialize drawing source and layers
    useEffect(() => {
        if (!map) return;

        const setup = () => {
            // Add drawing preview source
            if (!map.getSource(DRAWING_SOURCE_ID)) {
                map.addSource(DRAWING_SOURCE_ID, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                });
            }

            // Add polygon fill layer
            if (!map.getLayer(DRAWING_LAYER_POLYGON)) {
                map.addLayer({
                    id: DRAWING_LAYER_POLYGON,
                    type: 'fill',
                    source: DRAWING_SOURCE_ID,
                    filter: ['==', ['geometry-type'], 'Polygon'],
                    paint: {
                        'fill-color': 'rgba(59, 130, 246, 0.2)',
                        'fill-outline-color': '#3B82F6',
                    },
                });
            }

            // Add line layer for polygon edges
            if (!map.getLayer(DRAWING_LAYER_LINE)) {
                map.addLayer({
                    id: DRAWING_LAYER_LINE,
                    type: 'line',
                    source: DRAWING_SOURCE_ID,
                    filter: ['any',
                        ['==', ['geometry-type'], 'LineString'],
                        ['==', ['geometry-type'], 'Polygon']
                    ],
                    paint: {
                        'line-color': '#3B82F6',
                        'line-width': 2,
                        'line-dasharray': [2, 2],
                    },
                });
            }

            // Add points layer for vertices
            if (!map.getLayer(DRAWING_LAYER_POINTS)) {
                map.addLayer({
                    id: DRAWING_LAYER_POINTS,
                    type: 'circle',
                    source: DRAWING_SOURCE_ID,
                    filter: ['==', ['geometry-type'], 'Point'],
                    paint: {
                        'circle-radius': 6,
                        'circle-color': '#3B82F6',
                        'circle-stroke-color': '#fff',
                        'circle-stroke-width': 2,
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
            if (map.getLayer(DRAWING_LAYER_CURSOR)) map.removeLayer(DRAWING_LAYER_CURSOR);
            if (map.getLayer(DRAWING_LAYER_POINTS)) map.removeLayer(DRAWING_LAYER_POINTS);
            if (map.getLayer(DRAWING_LAYER_LINE)) map.removeLayer(DRAWING_LAYER_LINE);
            if (map.getLayer(DRAWING_LAYER_POLYGON)) map.removeLayer(DRAWING_LAYER_POLYGON);
            if (map.getSource(DRAWING_SOURCE_ID)) map.removeSource(DRAWING_SOURCE_ID);
        };
    }, [map]);

    // Update preview geometry
    const updatePreview = useCallback((vertices: LngLat[], cursorPos?: LngLat) => {
        if (!map) return;

        const source = map.getSource(DRAWING_SOURCE_ID) as maplibregl.GeoJSONSource;
        if (!source) return;

        const features: GeoJSON.Feature[] = [];

        // Add vertex points
        vertices.forEach((v, i) => {
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
                properties: { index: i },
            });
        });

        // For polygon modes, show preview polygon/line
        if (mode === 'aoi_polygon' || mode === 'hazard_polygon') {
            const coords = vertices.map(v => [v.lng, v.lat]);

            if (cursorPos) {
                coords.push([cursorPos.lng, cursorPos.lat]);
            }

            if (coords.length >= 3) {
                // Show as polygon
                const polygonCoords = [...coords, coords[0]];
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [polygonCoords] },
                    properties: {},
                });
            } else if (coords.length >= 2) {
                // Show as line
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: coords },
                    properties: {},
                });
            }
        }

        source.setData({ type: 'FeatureCollection', features });
    }, [map, mode]);

    // Clear drawing state
    const clearDrawing = useCallback(() => {
        verticesRef.current = [];
        setIsDrawing(false);
        if (map) {
            const source = map.getSource(DRAWING_SOURCE_ID) as maplibregl.GeoJSONSource;
            source?.setData({ type: 'FeatureCollection', features: [] });
        }
        if (cursorMarkerRef.current) {
            cursorMarkerRef.current.remove();
            cursorMarkerRef.current = null;
        }
    }, [map]);

    // Complete the current drawing
    const completeDrawing = useCallback(() => {
        const vertices = verticesRef.current;

        if (mode === 'poi' && vertices.length === 1) {
            const geometry: GeoJSON.Point = {
                type: 'Point',
                coordinates: [vertices[0].lng, vertices[0].lat],
            };
            onComplete(geometry, 'poi');
            clearDrawing();
        } else if ((mode === 'aoi_polygon' || mode === 'hazard_polygon') && vertices.length >= 3) {
            const coords = vertices.map(v => [v.lng, v.lat]);
            coords.push(coords[0]); // Close the polygon
            const geometry: GeoJSON.Polygon = {
                type: 'Polygon',
                coordinates: [coords],
            };
            const overlayType = mode === 'aoi_polygon' ? 'aoi' : 'hazard';
            onComplete(geometry, overlayType);
            clearDrawing();
        }
    }, [mode, onComplete, clearDrawing]);

    // Handle map click for drawing
    useEffect(() => {
        if (!map) return;

        const handleClick = (e: MapMouseEvent) => {
            if (mode === 'select' || mode === 'pan') return;

            const lngLat = e.lngLat;

            if (mode === 'poi') {
                // POI is single click
                verticesRef.current = [lngLat];
                setIsDrawing(true);
                completeDrawing();
            } else if (mode === 'aoi_polygon' || mode === 'hazard_polygon') {
                verticesRef.current.push(lngLat);
                setIsDrawing(true);
                updatePreview(verticesRef.current);
            }
        };

        const handleDoubleClick = (e: MapMouseEvent) => {
            if (mode === 'aoi_polygon' || mode === 'hazard_polygon') {
                e.preventDefault();
                if (verticesRef.current.length >= 3) {
                    completeDrawing();
                }
            }
        };

        const handleMouseMove = (e: MapMouseEvent) => {
            if (mode === 'aoi_polygon' || mode === 'hazard_polygon') {
                if (verticesRef.current.length > 0) {
                    updatePreview(verticesRef.current, e.lngLat);
                }
            }

            // Update cursor style
            if (mode === 'poi') {
                map.getCanvas().style.cursor = 'crosshair';
            } else if (mode === 'aoi_polygon' || mode === 'hazard_polygon') {
                map.getCanvas().style.cursor = isDrawing ? 'crosshair' : 'crosshair';
            } else {
                map.getCanvas().style.cursor = '';
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearDrawing();
                onCancel?.();
            } else if (e.key === 'Enter') {
                if (verticesRef.current.length >= 3) {
                    completeDrawing();
                }
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                // Remove last vertex
                if (verticesRef.current.length > 0) {
                    verticesRef.current.pop();
                    updatePreview(verticesRef.current);
                }
            }
        };

        map.on('click', handleClick);
        map.on('dblclick', handleDoubleClick);
        map.on('mousemove', handleMouseMove);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            map.off('click', handleClick);
            map.off('dblclick', handleDoubleClick);
            map.off('mousemove', handleMouseMove);
            document.removeEventListener('keydown', handleKeyDown);
            map.getCanvas().style.cursor = '';
        };
    }, [map, mode, isDrawing, updatePreview, completeDrawing, clearDrawing, onCancel]);

    // Reset drawing when mode changes
    useEffect(() => {
        clearDrawing();
    }, [mode, clearDrawing]);

    return {
        isDrawing,
        vertexCount: verticesRef.current.length,
        clearDrawing,
        completeDrawing,
    };
}

export default useDrawingTools;
