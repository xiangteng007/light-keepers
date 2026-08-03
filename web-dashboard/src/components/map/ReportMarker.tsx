/**
 * ReportMarker Component
 * Displays field report markers on the map with type-based styling
 */

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import {
    aedToDataUri,
    hazardAoiToDataUri,
    reportIncidentToDataUri,
    sosToDataUri,
    warehouseToDataUri,
} from '../../design-system/icons/map-symbols';

export interface ReportMarkerProps {
    map: maplibregl.Map | null;
    id: string;
    coordinates: [number, number]; // [lng, lat]
    type: 'incident' | 'resource' | 'medical' | 'traffic' | 'sos' | 'other';
    severity: number; // 1-5
    status: string;
    reporterName?: string;
    message?: string;
    createdAt?: string;
    onClick?: () => void;
}

/**
 * 通報類型 → B3c 地圖符號 data URI（design-system/icons/map-symbols）。
 * traffic 無專屬符號，取最接近語意 hazard-aoi（路線上的危害）；
 * other 落回 report-incident（一般通報，菱＋驚嘆）。
 */
const TYPE_SYMBOL_URIS: Record<string, (color: string) => string> = {
    incident: reportIncidentToDataUri,
    resource: warehouseToDataUri,
    medical: aedToDataUri,
    traffic: hazardAoiToDataUri,
    sos: sosToDataUri,
    other: reportIncidentToDataUri,
};

const SEVERITY_COLORS: Record<number, string> = {
    1: '#22c55e', // green
    2: '#84cc16', // lime
    3: '#eab308', // yellow
    4: '#f97316', // orange
    5: '#dc2626', // red
};

export function ReportMarker({
    map,
    id,
    coordinates,
    type,
    severity,
    status,
    reporterName,
    message,
    createdAt,
    onClick,
}: ReportMarkerProps) {
    const markerRef = useRef<maplibregl.Marker | null>(null);

    useEffect(() => {
        if (!map) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'report-marker';
        el.style.cssText = `
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${SEVERITY_COLORS[severity] || SEVERITY_COLORS[3]};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            transition: transform 0.2s;
        `;
        const toSymbolUri = TYPE_SYMBOL_URIS[type] || TYPE_SYMBOL_URIS.other;
        const symbolImg = document.createElement('img');
        symbolImg.src = toSymbolUri('#ffffff');
        symbolImg.width = 20;
        symbolImg.height = 20;
        symbolImg.alt = '';
        symbolImg.draggable = false;
        symbolImg.style.display = 'block';
        el.appendChild(symbolImg);
        el.dataset.id = id;

        // Hover effect
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });

        // Click handler
        if (onClick) {
            el.addEventListener('click', onClick);
        }

        // Create popup
        const popupContent = `
            <div style="padding: 8px; min-width: 180px;">
                <div style="font-weight: 600; margin-bottom: 4px;">
                    ${type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                    嚴重程度: ${'●'.repeat(severity)}${'○'.repeat(5 - severity)}
                </div>
                ${reporterName ? `<div style="font-size: 12px;">回報人: ${reporterName}</div>` : ''}
                ${message ? `<div style="font-size: 12px; margin-top: 4px; color: #333;">${message.substring(0, 100)}${message.length > 100 ? '...' : ''}</div>` : ''}
                ${createdAt ? `<div style="font-size: 11px; color: #999; margin-top: 4px;">${new Date(createdAt).toLocaleString('zh-TW')}</div>` : ''}
                <div style="font-size: 11px; margin-top: 4px; padding: 2px 6px; background: ${status === 'new' ? '#fef3c7' : '#d1fae5'}; border-radius: 4px; display: inline-block;">
                    ${status}
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
            .setHTML(popupContent);

        // Create marker
        markerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat(coordinates)
            .setPopup(popup)
            .addTo(map);

        return () => {
            markerRef.current?.remove();
            markerRef.current = null;
        };
    }, [map, id, coordinates, type, severity, status, reporterName, message, createdAt, onClick]);

    // Update position if coordinates change
    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.setLngLat(coordinates);
        }
    }, [coordinates]);

    return null;
}

export default ReportMarker;
