import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl, { Map, NavigationControl, ScaleControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface UseMapRuntimeOptions {
    containerId: string;
    center?: [number, number]; // [lng, lat]
    zoom?: number;
    style?: string | maplibregl.StyleSpecification;
    onLoad?: (map: Map) => void;
    onMoveEnd?: (map: Map) => void;
}

// Default Taiwan center
const DEFAULT_CENTER: [number, number] = [121.0, 23.5];
const DEFAULT_ZOOM = 7;

// Emergency Response tactical map style (placeholder - will use PMTiles)
const DEFAULT_STYLE: maplibregl.StyleSpecification = {
    version: 8,
    name: 'Emergency Response Tactical Map',
    sources: {
        // Fallback to OSM raster for development
        'osm-raster': {
            type: 'raster',
            tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
        },
    },
    layers: [
        {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-raster',
            minzoom: 0,
            maxzoom: 19,
        },
    ],
};

export function useMapRuntime(options: UseMapRuntimeOptions) {
    const mapRef = useRef<Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const container = document.getElementById(options.containerId);
        if (!container) {
            setError(`Container element #${options.containerId} not found`);
            return;
        }

        // Initialize map
        try {
            const map = new maplibregl.Map({
                container: options.containerId,
                style: options.style || DEFAULT_STYLE,
                center: options.center || DEFAULT_CENTER,
                zoom: options.zoom ?? DEFAULT_ZOOM,
            });

            // Add navigation controls
            map.addControl(new NavigationControl(), 'top-right');
            map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');

            // Handle map load
            map.on('load', () => {
                setIsLoaded(true);
                options.onLoad?.(map);
            });

            // Handle move end for bbox filtering
            map.on('moveend', () => {
                options.onMoveEnd?.(map);
            });

            // Handle errors
            map.on('error', (e) => {
                console.error('MapLibre error:', e);
                setError(e.error?.message || 'Unknown map error');
            });

            mapRef.current = map;

            // Cleanup
            return () => {
                map.remove();
                mapRef.current = null;
                setIsLoaded(false);
            };
        } catch (err: any) {
            console.error('Failed to initialize map:', err);
            setError(err.message || 'Failed to initialize map');
        }
    }, [options.containerId]);

    // Helper: Get current bounding box
    const getBounds = useCallback((): [number, number, number, number] | null => {
        if (!mapRef.current) return null;
        const bounds = mapRef.current.getBounds();
        return [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
        ];
    }, []);

    // Helper: Fly to location
    const flyTo = useCallback((lng: number, lat: number, zoom?: number) => {
        mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: zoom ?? mapRef.current.getZoom(),
            duration: 1000,
        });
    }, []);

    // Helper: Fit bounds
    const fitBounds = useCallback((bounds: [number, number, number, number], padding = 50) => {
        mapRef.current?.fitBounds(
            [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
            { padding }
        );
    }, []);

    return {
        map: mapRef.current,
        isLoaded,
        error,
        getBounds,
        flyTo,
        fitBounds,
    };
}

export default useMapRuntime;
