/**
 * SOSMarker Component
 * Displays SOS signal markers with pulsing animation
 */

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import './SOSMarker.css';

export interface SOSMarkerProps {
    map: maplibregl.Map | null;
    id: string;
    coordinates: [number, number]; // [lng, lat]
    userName: string;
    status: 'active' | 'acknowledged' | 'resolved' | 'cancelled';
    createdAt: string;
    ackedAt?: string;
    ackedBy?: string;
    onClick?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
    active: '#dc2626',
    acknowledged: '#f97316',
    resolved: '#22c55e',
    cancelled: '#6b7280',
};

export function SOSMarker({
    map,
    id,
    coordinates,
    userName,
    status,
    createdAt,
    ackedAt,
    ackedBy,
    onClick,
}: SOSMarkerProps) {
    const markerRef = useRef<maplibregl.Marker | null>(null);

    useEffect(() => {
        if (!map) return;

        // Create marker element with pulse animation
        const el = document.createElement('div');
        el.className = `sos-marker sos-marker--${status}`;
        el.dataset.id = id;

        // Outer pulse ring (only for active)
        if (status === 'active') {
            const pulse = document.createElement('div');
            pulse.className = 'sos-marker__pulse';
            el.appendChild(pulse);
        }

        // Inner circle
        const inner = document.createElement('div');
        inner.className = 'sos-marker__inner';
        inner.innerHTML = '🆘';
        inner.style.backgroundColor = STATUS_COLORS[status];
        el.appendChild(inner);

        // Click handler
        if (onClick) {
            el.addEventListener('click', onClick);
        }

        // Create popup
        const elapsedMinutes = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
        const popupContent = `
            <div style="padding: 12px; min-width: 200px;">
                <div style="font-weight: 600; color: ${STATUS_COLORS[status]}; font-size: 16px; margin-bottom: 8px;">
                    🆘 SOS 求救信號
                </div>
                <div style="font-size: 14px; margin-bottom: 4px;">
                    <strong>求助者:</strong> ${userName}
                </div>
                <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                    <strong>發送時間:</strong> ${new Date(createdAt).toLocaleString('zh-TW')}
                </div>
                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                    <strong>已過:</strong> ${elapsedMinutes} 分鐘
                </div>
                ${ackedAt ? `
                    <div style="font-size: 12px; color: #22c55e;">
                        ✓ 已確認 by ${ackedBy || '指揮官'} (${new Date(ackedAt).toLocaleTimeString('zh-TW')})
                    </div>
                ` : ''}
                <div style="margin-top: 8px; padding: 4px 8px; background: ${STATUS_COLORS[status]}20; border-radius: 4px; display: inline-block; font-size: 12px; color: ${STATUS_COLORS[status]}; font-weight: 600;">
                    ${status.toUpperCase()}
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 30, closeButton: false })
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
    }, [map, id, coordinates, userName, status, createdAt, ackedAt, ackedBy, onClick]);

    return null;
}

export default SOSMarker;
