/**
 * Floor Plan Overlay Component - 樓層平面圖覆蓋
 * Indoor BFT 功能
 */

import React, { useState, useRef } from 'react';
import { LocationIcon, LayersIcon, TeamsIcon } from '../../design-system/icons';
import './FloorPlanOverlay.css';

// Types
interface BeaconPosition {
    id: string;
    name: string;
    x: number; // Percentage 0-100
    y: number;
    rssi: number;
}

interface TrackedPerson {
    id: string;
    name: string;
    role: string;
    x: number;
    y: number;
    accuracy: number;
    lastUpdate: Date;
}

interface FloorPlanOverlayProps {
    floorPlanUrl: string;
    floorName: string;
    beacons?: BeaconPosition[];
    trackedPersons?: TrackedPerson[];
    onPersonClick?: (person: TrackedPerson) => void;
    width?: number;
    height?: number;
}

export const FloorPlanOverlay: React.FC<FloorPlanOverlayProps> = ({
    floorPlanUrl,
    floorName,
    beacons = [],
    trackedPersons = [],
    onPersonClick,
    width = 800,
    height = 600,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedPerson, setSelectedPerson] = useState<TrackedPerson | null>(null);
    const [scale, setScale] = useState(1);

    // Handle zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.max(0.5, Math.min(2, prev + delta)));
    };

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            commander: '#dc2626',
            medic: '#22c55e',
            rescue: '#3b82f6',
            volunteer: '#f59e0b',
        };
        return colors[role.toLowerCase()] || '#888';
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
        if (diff < 60) return `${diff}秒前`;
        if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`;
        return new Date(date).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="floor-plan-overlay">
            <div className="overlay-header">
                <h3><LocationIcon size={16} aria-hidden="true" /> {floorName}</h3>
                <div className="stats">
                    <span className="beacon-count"><LayersIcon size={16} aria-hidden="true" /> {beacons.length} Beacons</span>
                    <span className="person-count"><TeamsIcon size={16} aria-hidden="true" /> {trackedPersons.length} 人員</span>
                </div>
            </div>

            <div
                className="plan-container"
                ref={containerRef}
                onWheel={handleWheel}
                style={{ width, height }}
            >
                <div
                    className="plan-content"
                    style={{ transform: `scale(${scale})` }}
                >
                    <img
                        src={floorPlanUrl}
                        alt={floorName}
                        className="floor-plan-image"
                    />

                    {/* Beacons */}
                    {beacons.map(beacon => (
                        <div
                            key={beacon.id}
                            className="beacon-marker"
                            style={{
                                left: `${beacon.x}%`,
                                top: `${beacon.y}%`,
                            }}
                            title={`${beacon.name} (RSSI: ${beacon.rssi})`}
                        >
                            <div className="beacon-pulse" />
                            <span className="beacon-icon" aria-hidden="true"><LayersIcon size={16} /></span>
                        </div>
                    ))}

                    {/* Tracked Persons */}
                    {trackedPersons.map(person => (
                        <div
                            key={person.id}
                            className={`person-marker ${selectedPerson?.id === person.id ? 'selected' : ''}`}
                            style={{
                                left: `${person.x}%`,
                                top: `${person.y}%`,
                            }}
                            onClick={() => {
                                setSelectedPerson(person);
                                onPersonClick?.(person);
                            }}
                        >
                            <div
                                className="accuracy-ring"
                                style={{
                                    width: person.accuracy * 2,
                                    height: person.accuracy * 2,
                                }}
                            />
                            <div
                                className="person-dot"
                                style={{ backgroundColor: getRoleColor(person.role) }}
                            />
                            <span className="person-name">{person.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="overlay-legend">
                <div className="legend-item">
                    <span className="dot" style={{ backgroundColor: '#dc2626' }} />
                    指揮官
                </div>
                <div className="legend-item">
                    <span className="dot" style={{ backgroundColor: '#22c55e' }} />
                    醫療
                </div>
                <div className="legend-item">
                    <span className="dot" style={{ backgroundColor: '#3b82f6' }} />
                    搜救
                </div>
                <div className="legend-item">
                    <span className="dot" style={{ backgroundColor: '#f59e0b' }} />
                    志工
                </div>
            </div>

            {/* Selected Person Info */}
            {selectedPerson && (
                <div className="person-info-panel">
                    <button className="close-btn" onClick={() => setSelectedPerson(null)}>×</button>
                    <h4>{selectedPerson.name}</h4>
                    <p className="role" style={{ color: getRoleColor(selectedPerson.role) }}>
                        {selectedPerson.role}
                    </p>
                    <p className="accuracy">精度: ±{selectedPerson.accuracy.toFixed(1)}m</p>
                    <p className="update-time">更新: {formatTime(selectedPerson.lastUpdate)}</p>
                </div>
            )}
        </div>
    );
};

export default FloorPlanOverlay;
