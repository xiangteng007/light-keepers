/**
 * Tactical Map Page
 * 使用 MapLibre GL JS 的高效能戰術地圖頁面
 * 用於大量點位顯示 (志工、任務、物資等)
 */

import React, { useState, useCallback } from 'react';
import { MapLibreTacticalMap, TacticalMarker, TacticalSector } from '../components/maps/MapLibreTacticalMap';
import './TacticalMapPage.css';

// Mock data for demonstration
const MOCK_MARKERS: TacticalMarker[] = [
    { id: 'v1', position: [120.301, 22.627], type: 'volunteer', label: '志工 Alpha-1' },
    { id: 'v2', position: [120.305, 22.630], type: 'volunteer', label: '志工 Alpha-2' },
    { id: 't1', position: [120.295, 22.625], type: 'task', label: '任務: 物資配送' },
    { id: 'r1', position: [120.310, 22.620], type: 'resource', label: '物資站 A' },
    { id: 's1', position: [120.298, 22.632], type: 'sos', label: 'SOS 訊號' },
    { id: 'h1', position: [120.290, 22.628], type: 'hazard', label: '危險區域: 落石' },
    { id: 'rp1', position: [120.302, 22.635], type: 'rally', label: '集結點 Alpha' },
];

const MOCK_SECTORS: TacticalSector[] = [
    {
        id: 'sector-a',
        name: 'Sector Alpha',
        coordinates: [
            [120.290, 22.620],
            [120.310, 22.620],
            [120.310, 22.640],
            [120.290, 22.640],
            [120.290, 22.620],
        ],
        color: '#3b82f6',
        opacity: 0.2,
    },
];

export const TacticalMapPage: React.FC = () => {
    const [selectedMarker, setSelectedMarker] = useState<TacticalMarker | null>(null);
    const [markers] = useState<TacticalMarker[]>(MOCK_MARKERS);
    const [sectors] = useState<TacticalSector[]>(MOCK_SECTORS);

    const handleMarkerClick = useCallback((marker: TacticalMarker) => {
        setSelectedMarker(marker);
    }, []);

    const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
        console.log('Map clicked:', lngLat);
        setSelectedMarker(null);
    }, []);

    return (
        <div className="tactical-map-page">
            <header className="tactical-map-header">
                <h1>🗺️ 戰術地圖 (MapLibre GL JS)</h1>
                <div className="header-info">
                    <span className="marker-count">📍 {markers.length} 標記</span>
                    <span className="sector-count">🔲 {sectors.length} 分區</span>
                </div>
            </header>

            <div className="tactical-map-content">
                <div className="map-container">
                    <MapLibreTacticalMap
                        config={{
                            center: [120.301, 22.627],
                            zoom: 13,
                        }}
                        markers={markers}
                        sectors={sectors}
                        onMarkerClick={handleMarkerClick}
                        onMapClick={handleMapClick}
                        showControls={true}
                    />
                </div>

                {selectedMarker && (
                    <div className="marker-detail-panel">
                        <h3>{selectedMarker.label || selectedMarker.id}</h3>
                        <p><strong>類型:</strong> {selectedMarker.type}</p>
                        <p><strong>位置:</strong> {selectedMarker.position.join(', ')}</p>
                        <button onClick={() => setSelectedMarker(null)}>關閉</button>
                    </div>
                )}
            </div>

            <div className="legend">
                <h4>圖例</h4>
                <div className="legend-item"><span className="dot volunteer"></span> 志工</div>
                <div className="legend-item"><span className="dot task"></span> 任務</div>
                <div className="legend-item"><span className="dot resource"></span> 物資</div>
                <div className="legend-item"><span className="dot sos"></span> SOS</div>
                <div className="legend-item"><span className="dot hazard"></span> 危險</div>
                <div className="legend-item"><span className="dot rally"></span> 集結點</div>
            </div>
        </div>
    );
};

export default TacticalMapPage;
