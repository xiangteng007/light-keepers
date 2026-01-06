import { useEffect, useRef } from 'react';
import type { Map as MapInstance } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import type { CursorPosition, LockInfo } from '../../hooks/useOverlayCollaboration';

const CURSORS_SOURCE_ID = 'collaboration-cursors';
const CURSORS_LAYER_ID = 'collaboration-cursors-layer';

interface UseCollaborationLayerOptions {
    map: MapInstance | null;
    cursors: Map<string, CursorPosition>;
    locks: Map<string, LockInfo>;
    currentUserId?: string;
}

/**
 * Hook to render collaboration cursors and lock indicators on the map
 */
export function useCollaborationLayer(options: UseCollaborationLayerOptions) {
    const { map, cursors, locks, currentUserId } = options;
    const markersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());

    // Setup cursor source and layer
    useEffect(() => {
        if (!map) return;

        const setup = () => {
            // Add source for cursor points
            if (!map.getSource(CURSORS_SOURCE_ID)) {
                map.addSource(CURSORS_SOURCE_ID, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                });
            }

            // Add cursor labels layer
            if (!map.getLayer(CURSORS_LAYER_ID)) {
                map.addLayer({
                    id: CURSORS_LAYER_ID,
                    type: 'symbol',
                    source: CURSORS_SOURCE_ID,
                    layout: {
                        'text-field': ['get', 'userName'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                    },
                    paint: {
                        'text-color': ['get', 'color'],
                        'text-halo-color': '#0f172a',
                        'text-halo-width': 1,
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
            // Cleanup markers
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current.clear();

            if (map.getLayer(CURSORS_LAYER_ID)) map.removeLayer(CURSORS_LAYER_ID);
            if (map.getSource(CURSORS_SOURCE_ID)) map.removeSource(CURSORS_SOURCE_ID);
        };
    }, [map]);

    // Update cursor markers
    useEffect(() => {
        if (!map) return;

        const existingIds = new Set(markersRef.current.keys());
        const newIds = new Set<string>();

        cursors.forEach((cursor, oderId) => {
            // Skip current user's cursor
            if (oderId === currentUserId) return;

            newIds.add(oderId);

            let marker = markersRef.current.get(oderId);

            if (!marker) {
                // Create new cursor marker
                const el = document.createElement('div');
                el.className = 'collab-cursor';
                el.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="${cursor.color}">
                        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z"/>
                    </svg>
                    <span class="collab-cursor-name" style="background:${cursor.color}">${cursor.userName}</span>
                `;

                marker = new maplibregl.Marker({ element: el })
                    .setLngLat([cursor.lng, cursor.lat])
                    .addTo(map);

                markersRef.current.set(oderId, marker);
            } else {
                // Update existing marker position
                marker.setLngLat([cursor.lng, cursor.lat]);
            }
        });

        // Remove markers for users who left
        existingIds.forEach(id => {
            if (!newIds.has(id)) {
                markersRef.current.get(id)?.remove();
                markersRef.current.delete(id);
            }
        });
    }, [map, cursors, currentUserId]);

    return {
        locks,
    };
}

export default useCollaborationLayer;
