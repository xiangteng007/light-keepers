/**
 * VolunteerMarker Component
 * Displays volunteer live location markers
 */

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export interface VolunteerMarkerProps {
    map: maplibregl.Map | null;
    id: string;
    coordinates: [number, number]; // [lng, lat]
    userName: string;
    isSharing: boolean;
    accuracy?: number;
    lastUpdate?: string;
    onClick?: () => void;
}

export function VolunteerMarker({
    map,
    id,
    coordinates,
    userName,
    isSharing,
    accuracy,
    lastUpdate,
    onClick,
}: VolunteerMarkerProps) {
    const markerRef = useRef<maplibregl.Marker | null>(null);

    useEffect(() => {
        if (!map) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'volunteer-marker';
        el.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${isSharing ? '#22c55e' : '#6b7280'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        `;
        el.innerHTML = '👤';
        el.dataset.id = id;

        // Add accuracy ring if available
        if (accuracy && accuracy > 10) {
            const ring = document.createElement('div');
            ring.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: ${Math.min(accuracy / 2, 50)}px;
                height: ${Math.min(accuracy / 2, 50)}px;
                border-radius: 50%;
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid rgba(34, 197, 94, 0.4);
                pointer-events: none;
            `;
            el.appendChild(ring);
        }

        // Hover effect
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });

        if (onClick) {
            el.addEventListener('click', onClick);
        }

        // Create popup
        const lastUpdateStr = lastUpdate
            ? new Date(lastUpdate).toLocaleTimeString('zh-TW')
            : '未知';

        const popupContent = `
            <div style="padding: 8px; min-width: 150px;">
                <div style="font-weight: 600; margin-bottom: 4px;">
                    👤 ${userName}
                </div>
                <div style="font-size: 12px; color: ${isSharing ? '#22c55e' : '#6b7280'}; margin-bottom: 4px;">
                    ${isSharing ? '● 分享中' : '○ 未分享'}
                </div>
                ${accuracy ? `<div style="font-size: 11px; color: #666;">精確度: ±${Math.round(accuracy)}m</div>` : ''}
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                    更新: ${lastUpdateStr}
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
            .setHTML(popupContent);

        markerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat(coordinates)
            .setPopup(popup)
            .addTo(map);

        return () => {
            markerRef.current?.remove();
            markerRef.current = null;
        };
    }, [map, id, coordinates, userName, isSharing, accuracy, lastUpdate, onClick]);

    // Smooth position update
    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.setLngLat(coordinates);
        }
    }, [coordinates]);

    return null;
}

export default VolunteerMarker;
