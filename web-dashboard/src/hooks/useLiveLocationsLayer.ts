import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapInstance, Marker, LngLatLike } from 'maplibre-gl';
import type { LiveLocation } from '../services/fieldReportsApi';

interface UseLiveLocationsLayerOptions {
    map: MapInstance | null;
    locations: LiveLocation[];
    enabled: boolean;
    onLocationClick?: (location: LiveLocation) => void;
}

/**
 * Hook to render live volunteer locations on a MapLibre map
 */
export function useLiveLocationsLayer({
    map,
    locations,
    enabled,
    onLocationClick,
}: UseLiveLocationsLayerOptions) {
    const markersRef = useRef<Map<string, Marker>>(new Map());

    // Create marker element
    const createMarkerElement = useCallback((location: LiveLocation) => {
        const el = document.createElement('div');
        el.className = `live-location-marker ${location.isStale ? 'stale' : ''} ${location.mode === 'sos' ? 'sos-mode' : ''}`;
        el.innerHTML = `
            <div class="marker-avatar">
                ${location.displayName.charAt(0).toUpperCase()}
            </div>
            <div class="marker-label">${location.callsign || location.displayName}</div>
            ${location.isStale ? '<div class="stale-badge">⚠</div>' : ''}
        `;
        el.title = `${location.displayName}${location.callsign ? ` (${location.callsign})` : ''}\n最後更新: ${new Date(location.lastAt).toLocaleTimeString()}`;

        if (onLocationClick) {
            el.style.cursor = 'pointer';
            el.onclick = () => onLocationClick(location);
        }

        return el;
    }, [onLocationClick]);

    // Update markers when locations change
    useEffect(() => {
        if (!map || !enabled) {
            // Remove all markers if disabled
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current.clear();
            return;
        }

        const currentIds = new Set(locations.map(l => l.userId));

        // Remove markers for users no longer in list
        markersRef.current.forEach((marker, userId) => {
            if (!currentIds.has(userId)) {
                marker.remove();
                markersRef.current.delete(userId);
            }
        });

        // Add/update markers for current locations
        locations.forEach(location => {
            const coords: LngLatLike = [location.lng, location.lat];
            const existing = markersRef.current.get(location.userId);

            if (existing) {
                // Update position
                existing.setLngLat(coords);
                // Update element classes (stale state)
                const el = existing.getElement();
                el.className = `live-location-marker ${location.isStale ? 'stale' : ''} ${location.mode === 'sos' ? 'sos-mode' : ''}`;
            } else {
                // Create new marker
                const el = createMarkerElement(location);
                // Dynamic import to avoid SSR issues
                import('maplibre-gl').then(({ Marker }) => {
                    const marker = new Marker({ element: el })
                        .setLngLat(coords)
                        .addTo(map);
                    markersRef.current.set(location.userId, marker);
                });
            }
        });
    }, [map, locations, enabled, createMarkerElement]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current.clear();
        };
    }, []);

    // Follow a specific user
    const followUser = useCallback((userId: string) => {
        if (!map) return;
        const location = locations.find(l => l.userId === userId);
        if (location) {
            map.flyTo({
                center: [location.lng, location.lat],
                zoom: 16,
                duration: 1000,
            });
        }
    }, [map, locations]);

    return { followUser };
}

// CSS for live location markers (inject into page)
const styles = `
.live-location-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
}

.live-location-marker .marker-avatar {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border: 2px solid #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.live-location-marker.sos-mode .marker-avatar {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    animation: sos-pulse 1s ease-in-out infinite;
}

.live-location-marker.stale .marker-avatar {
    background: #6b7280;
    opacity: 0.7;
}

.live-location-marker .marker-label {
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    margin-top: 2px;
    white-space: nowrap;
}

.live-location-marker .stale-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 10px;
}

@keyframes sos-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
}

export default useLiveLocationsLayer;
