/**
 * ClusterLayer Component
 * Handles clustering of map markers for better performance and visualization
 */

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

export interface ClusterableMarker {
    id: string;
    type: 'report' | 'sos' | 'location';
    coordinates: [number, number]; // [lng, lat]
    properties: Record<string, any>;
}

export interface ClusterLayerProps {
    map: maplibregl.Map | null;
    markers: ClusterableMarker[];
    sourceId?: string;
    clusterRadius?: number;
    clusterMaxZoom?: number;
    onClusterClick?: (clusterId: number, coordinates: [number, number]) => void;
    onMarkerClick?: (marker: ClusterableMarker) => void;
}

const DEFAULT_CLUSTER_COLORS: Record<string, string> = {
    small: '#51bbd6',   // < 10
    medium: '#f1c40f',  // 10-50
    large: '#e74c3c',   // > 50
};

const TYPE_COLORS: Record<string, string> = {
    report: '#3b82f6',
    sos: '#dc2626',
    location: '#22c55e',
};

export function ClusterLayer({
    map,
    markers,
    sourceId = 'cluster-source',
    clusterRadius = 50,
    clusterMaxZoom = 14,
    onClusterClick,
    onMarkerClick,
}: ClusterLayerProps) {
    const sourceAdded = useRef(false);

    // Convert markers to GeoJSON
    const toGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
        return {
            type: 'FeatureCollection',
            features: markers.map(m => ({
                type: 'Feature',
                id: m.id,
                geometry: {
                    type: 'Point',
                    coordinates: m.coordinates,
                },
                properties: {
                    id: m.id,
                    type: m.type,
                    ...m.properties,
                },
            })),
        };
    }, [markers]);

    // Setup cluster source and layers
    useEffect(() => {
        if (!map) return;

        const setupCluster = () => {
            // Remove existing layers and source
            if (map.getLayer(`${sourceId}-clusters`)) map.removeLayer(`${sourceId}-clusters`);
            if (map.getLayer(`${sourceId}-cluster-count`)) map.removeLayer(`${sourceId}-cluster-count`);
            if (map.getLayer(`${sourceId}-unclustered`)) map.removeLayer(`${sourceId}-unclustered`);
            if (map.getSource(sourceId)) map.removeSource(sourceId);

            // Add source with clustering enabled
            map.addSource(sourceId, {
                type: 'geojson',
                data: toGeoJSON(),
                cluster: true,
                clusterMaxZoom,
                clusterRadius,
            });

            // Cluster circles
            map.addLayer({
                id: `${sourceId}-clusters`,
                type: 'circle',
                source: sourceId,
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        DEFAULT_CLUSTER_COLORS.small,
                        10,
                        DEFAULT_CLUSTER_COLORS.medium,
                        50,
                        DEFAULT_CLUSTER_COLORS.large,
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,
                        10,
                        30,
                        50,
                        40,
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff',
                },
            });

            // Cluster count labels
            map.addLayer({
                id: `${sourceId}-cluster-count`,
                type: 'symbol',
                source: sourceId,
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Open Sans Semibold'],
                    'text-size': 12,
                },
                paint: {
                    'text-color': '#ffffff',
                },
            });

            // Unclustered points
            map.addLayer({
                id: `${sourceId}-unclustered`,
                type: 'circle',
                source: sourceId,
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': [
                        'match',
                        ['get', 'type'],
                        'report', TYPE_COLORS.report,
                        'sos', TYPE_COLORS.sos,
                        'location', TYPE_COLORS.location,
                        '#888888',
                    ],
                    'circle-radius': 8,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff',
                },
            });

            sourceAdded.current = true;
        };

        if (map.isStyleLoaded()) {
            setupCluster();
        } else {
            map.on('load', setupCluster);
        }

        return () => {
            if (map && sourceAdded.current) {
                if (map.getLayer(`${sourceId}-clusters`)) map.removeLayer(`${sourceId}-clusters`);
                if (map.getLayer(`${sourceId}-cluster-count`)) map.removeLayer(`${sourceId}-cluster-count`);
                if (map.getLayer(`${sourceId}-unclustered`)) map.removeLayer(`${sourceId}-unclustered`);
                if (map.getSource(sourceId)) map.removeSource(sourceId);
                sourceAdded.current = false;
            }
        };
    }, [map, sourceId, clusterMaxZoom, clusterRadius, toGeoJSON]);

    // Update data when markers change
    useEffect(() => {
        if (!map || !sourceAdded.current) return;

        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        if (source) {
            source.setData(toGeoJSON());
        }
    }, [map, markers, sourceId, toGeoJSON]);

    // Click handlers
    useEffect(() => {
        if (!map) return;

        const handleClusterClick = (e: maplibregl.MapMouseEvent) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [`${sourceId}-clusters`],
            });

            if (features.length === 0) return;

            const clusterId = features[0].properties?.cluster_id;
            if (clusterId && onClusterClick) {
                const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
                onClusterClick(clusterId, coords);
            }

            // Zoom into cluster
            const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
            const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
            source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
                map.easeTo({ center: coords, zoom: zoom || 14 });
            }).catch(() => {
                // Ignore errors
            });
        };

        const handleMarkerClick = (e: maplibregl.MapMouseEvent) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [`${sourceId}-unclustered`],
            });

            if (features.length === 0 || !onMarkerClick) return;

            const props = features[0].properties;
            const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];

            onMarkerClick({
                id: props?.id || '',
                type: props?.type || 'report',
                coordinates: coords,
                properties: props || {},
            });
        };

        map.on('click', `${sourceId}-clusters`, handleClusterClick);
        map.on('click', `${sourceId}-unclustered`, handleMarkerClick);

        // Cursor style
        map.on('mouseenter', `${sourceId}-clusters`, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', `${sourceId}-clusters`, () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', `${sourceId}-unclustered`, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', `${sourceId}-unclustered`, () => { map.getCanvas().style.cursor = ''; });

        return () => {
            map.off('click', `${sourceId}-clusters`, handleClusterClick);
            map.off('click', `${sourceId}-unclustered`, handleMarkerClick);
        };
    }, [map, sourceId, onClusterClick, onMarkerClick]);

    return null; // This component manages map layers, no DOM output
}

export default ClusterLayer;
