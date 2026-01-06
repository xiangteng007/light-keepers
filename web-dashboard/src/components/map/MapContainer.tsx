import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { FieldReport, SosSignal, LiveLocation } from '../../services/fieldReportsApi';
import './MapContainer.css';

// Taiwan center coordinates
const TAIWAN_CENTER: [number, number] = [120.9605, 23.6978];
const DEFAULT_ZOOM = 7;

// Register PMTiles protocol
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

interface MapContainerProps {
    reports?: FieldReport[];
    activeSos?: SosSignal[];
    liveLocations?: LiveLocation[];
    center?: [number, number];
    zoom?: number;
    onReportClick?: (report: FieldReport) => void;
    onSosClick?: (sos: SosSignal) => void;
    onLocationClick?: (location: LiveLocation) => void;
}

// Helper to extract coordinates from GeoJSON.Point
function getCoords(geom: GeoJSON.Point | undefined): [number, number] | null {
    if (!geom || !geom.coordinates) return null;
    return [geom.coordinates[0], geom.coordinates[1]];
}

/**
 * Map Container Component using MapLibre GL JS
 * Displays field reports, SOS signals, and volunteer locations
 */
export function MapContainer({
    reports = [],
    activeSos = [],
    liveLocations = [],
    center = TAIWAN_CENTER,
    zoom = DEFAULT_ZOOM,
    onReportClick,
    onSosClick,
    onLocationClick,
}: MapContainerProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                name: 'Emergency Response Map',
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: [
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    },
                },
                layers: [
                    {
                        id: 'osm-tiles',
                        type: 'raster',
                        source: 'osm',
                        minzoom: 0,
                        maxzoom: 19,
                    },
                ],
            },
            center: center,
            zoom: zoom,
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
        map.current.addControl(
            new maplibregl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
            }),
            'top-right'
        );

        map.current.on('load', () => {
            setIsLoaded(true);
        });

        return () => {
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current.clear();
            map.current?.remove();
            map.current = null;
        };
    }, [center, zoom]);

    // Create marker element
    const createMarkerElement = useCallback((type: 'report' | 'sos' | 'location', data: unknown) => {
        const el = document.createElement('div');
        el.className = `map-marker marker-${type}`;

        if (type === 'sos') {
            el.innerHTML = `
                <div class="marker-pulse"></div>
                <div class="marker-icon">🆘</div>
            `;
        } else if (type === 'report') {
            const report = data as FieldReport;
            const icon = report.type === 'medical' ? '🏥' :
                report.type === 'incident' ? '🔥' :
                    report.type === 'traffic' ? '🚗' :
                        report.type === 'sos' ? '🆘' : '📋';
            el.innerHTML = `<div class="marker-icon">${icon}</div>`;
        } else if (type === 'location') {
            el.innerHTML = `<div class="marker-icon">👤</div>`;
        }

        return el;
    }, []);

    // Update report markers
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // Remove old report markers
        markersRef.current.forEach((marker, id) => {
            if (id.startsWith('report-') && !reports.find(r => `report-${r.id}` === id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // Add/update report markers
        reports.forEach(report => {
            const coords = getCoords(report.geom);
            if (!coords) return;
            const id = `report-${report.id}`;

            if (markersRef.current.has(id)) return;

            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="marker-popup">
                    <strong>${report.type}: ${report.reporterName}</strong>
                    <p>${report.message?.substring(0, 100) || ''}</p>
                    <span class="popup-time">${new Date(report.createdAt).toLocaleString('zh-TW')}</span>
                </div>
            `);

            const el = createMarkerElement('report', report);
            el.addEventListener('click', () => onReportClick?.(report));

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat(coords)
                .setPopup(popup)
                .addTo(map.current!);

            markersRef.current.set(id, marker);
        });
    }, [reports, isLoaded, createMarkerElement, onReportClick]);

    // Update SOS markers
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // Remove old SOS markers
        markersRef.current.forEach((marker, id) => {
            if (id.startsWith('sos-') && !activeSos.find(s => `sos-${s.id}` === id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // Add/update SOS markers
        activeSos.forEach(sos => {
            const coords = getCoords(sos.triggerGeom);
            if (!coords) return;
            const id = `sos-${sos.id}`;

            if (markersRef.current.has(id)) return;

            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="marker-popup sos-popup">
                    <strong>🆘 SOS 緊急求救</strong>
                    <p class="popup-user">${sos.userName || '未知'}</p>
                    <span class="popup-time">${new Date(sos.createdAt).toLocaleString('zh-TW')}</span>
                </div>
            `);

            const el = createMarkerElement('sos', sos);
            el.addEventListener('click', () => onSosClick?.(sos));

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat(coords)
                .setPopup(popup)
                .addTo(map.current!);

            markersRef.current.set(id, marker);
        });
    }, [activeSos, isLoaded, createMarkerElement, onSosClick]);

    // Update location markers
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // Remove old location markers
        markersRef.current.forEach((marker, id) => {
            if (id.startsWith('loc-') && !liveLocations.find(l => `loc-${l.userId}` === id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // Add/update location markers
        liveLocations.forEach(loc => {
            const id = `loc-${loc.userId}`;
            const existingMarker = markersRef.current.get(id);

            if (existingMarker) {
                // Update position
                existingMarker.setLngLat([loc.lng, loc.lat]);
                return;
            }

            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="marker-popup location-popup">
                    <strong>👤 ${loc.displayName || '志工'}</strong>
                    <p>${loc.callsign || ''}</p>
                    <span class="popup-time">更新: ${new Date(loc.lastAt).toLocaleTimeString('zh-TW')}</span>
                </div>
            `);

            const el = createMarkerElement('location', loc);
            el.addEventListener('click', () => onLocationClick?.(loc));

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([loc.lng, loc.lat])
                .setPopup(popup)
                .addTo(map.current!);

            markersRef.current.set(id, marker);
        });
    }, [liveLocations, isLoaded, createMarkerElement, onLocationClick]);

    // Fly to SOS when new one appears
    useEffect(() => {
        if (!map.current || !isLoaded || activeSos.length === 0) return;

        const latestSos = activeSos[0];
        const coords = getCoords(latestSos.triggerGeom);
        if (!coords) return;

        map.current.flyTo({
            center: coords,
            zoom: 15,
            duration: 2000,
        });
    }, [activeSos.length, isLoaded]);

    return (
        <div className="map-container">
            <div ref={mapContainer} className="map-view" />
            {!isLoaded && (
                <div className="map-loading">
                    <div className="loading-spinner" />
                    <span>載入地圖中...</span>
                </div>
            )}
        </div>
    );
}

export default MapContainer;
