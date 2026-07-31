/**
 * Drone Control Panel - 無人機控制面板
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api'; // eslint-disable-line no-restricted-imports -- FE-4 遷移待辦（工作項 3.2）：改用 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md
import './DroneControlPage.css';

// Types
interface Drone {
    id: string;
    name: string;
    model: string;
    status: string;
    position?: { lat: number; lng: number; altitude: number; heading: number; speed: number };
    telemetry?: { batteryPercent: number; signalStrength: number; gpsCount: number; flightTime: number };
}

interface Mission {
    id: string;
    droneId: string;
    type: string;
    status: string;
    waypoints: { lat: number; lng: number; altitude: number }[];
}

export const DroneControlPage: React.FC = () => {
    const [drones, setDrones] = useState<Drone[]>([]);
    const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDrones = useCallback(async () => {
        try {
            const response = await api.get('/drone-ops/drones');
            setDrones(response.data);
        } catch (error) {
            console.error('Failed to fetch drones:', error);
        }
    }, []);

    const fetchMissions = useCallback(async (droneId: string) => {
        try {
            const response = await api.get(`/drone-ops/drones/${droneId}/missions`);
            setMissions(response.data);
        } catch (error) {
            console.error('Failed to fetch missions:', error);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchDrones();
            setLoading(false);
        };
        loadData();

        // Poll for updates
        const interval = setInterval(fetchDrones, 5000);
        return () => clearInterval(interval);
    }, [fetchDrones]);

    useEffect(() => {
        if (selectedDrone) {
            fetchMissions(selectedDrone.id);
        }
    }, [selectedDrone, fetchMissions]);

    const handleRTH = async (droneId: string) => {
        if (!confirm('確認返航？')) return;
        try {
            await api.post(`/drone-ops/drones/${droneId}/rth`);
            await fetchDrones();
        } catch (error) {
            console.error('RTH failed:', error);
        }
    };

    const handleEmergencyLand = async (droneId: string) => {
        if (!confirm('⚠️ 緊急降落？這將立即著陸！')) return;
        try {
            await api.post(`/drone-ops/drones/${droneId}/emergency-land`);
            await fetchDrones();
        } catch (error) {
            console.error('Emergency land failed:', error);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            IDLE: '#6b7280',
            PREFLIGHT: '#f59e0b',
            TAKEOFF: '#3b82f6',
            IN_FLIGHT: '#22c55e',
            HOVERING: '#8b5cf6',
            LANDING: '#f59e0b',
            RETURNING: '#3b82f6',
            EMERGENCY: '#ef4444',
            OFFLINE: '#374151',
        };
        return colors[status] || '#888';
    };

    if (loading) {
        return <div className="drone-page loading">載入中...</div>;
    }

    return (
        <div className="drone-page">
            <header className="drone-header">
                <h1>🛸 無人機控制</h1>
                <span className="drone-count">{drones.length} 架已連接</span>
            </header>

            <div className="drone-layout">
                {/* Drone List */}
                <aside className="drone-list">
                    {drones.map(drone => (
                        <div
                            key={drone.id}
                            className={`drone-card ${selectedDrone?.id === drone.id ? 'selected' : ''}`}
                            onClick={() => setSelectedDrone(drone)}
                        >
                            <div className="drone-status-dot" style={{ backgroundColor: getStatusColor(drone.status) }} />
                            <div className="drone-info">
                                <h3>{drone.name}</h3>
                                <p>{drone.model}</p>
                            </div>
                            <span className="drone-status">{drone.status}</span>
                        </div>
                    ))}
                </aside>

                {/* Drone Details */}
                {selectedDrone ? (
                    <main className="drone-details">
                        <section className="detail-header">
                            <h2>{selectedDrone.name}</h2>
                            <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedDrone.status) }}>
                                {selectedDrone.status}
                            </span>
                        </section>

                        {/* Telemetry */}
                        {selectedDrone.telemetry && (
                            <section className="telemetry-grid">
                                <div className="telemetry-item">
                                    <span className="label">🔋 電量</span>
                                    <span className="value" style={{ color: selectedDrone.telemetry.batteryPercent < 20 ? '#ef4444' : '#22c55e' }}>
                                        {selectedDrone.telemetry.batteryPercent}%
                                    </span>
                                </div>
                                <div className="telemetry-item">
                                    <span className="label">📡 信號</span>
                                    <span className="value">{selectedDrone.telemetry.signalStrength}%</span>
                                </div>
                                <div className="telemetry-item">
                                    <span className="label">🛰️ GPS</span>
                                    <span className="value">{selectedDrone.telemetry.gpsCount} 衛星</span>
                                </div>
                                <div className="telemetry-item">
                                    <span className="label">⏱️ 飛行時間</span>
                                    <span className="value">{Math.floor(selectedDrone.telemetry.flightTime / 60)} 分鐘</span>
                                </div>
                            </section>
                        )}

                        {/* Position */}
                        {selectedDrone.position && (
                            <section className="position-section">
                                <h3>📍 目前位置</h3>
                                <div className="position-grid">
                                    <span>緯度: {selectedDrone.position.lat.toFixed(6)}</span>
                                    <span>經度: {selectedDrone.position.lng.toFixed(6)}</span>
                                    <span>高度: {selectedDrone.position.altitude.toFixed(1)} m</span>
                                    <span>速度: {selectedDrone.position.speed.toFixed(1)} m/s</span>
                                </div>
                            </section>
                        )}

                        {/* Control Buttons */}
                        <section className="control-section">
                            <button className="control-btn rth" onClick={() => handleRTH(selectedDrone.id)}>
                                🏠 返航
                            </button>
                            <button className="control-btn emergency" onClick={() => handleEmergencyLand(selectedDrone.id)}>
                                ⚠️ 緊急降落
                            </button>
                        </section>

                        {/* Missions */}
                        <section className="missions-section">
                            <h3>📋 任務紀錄</h3>
                            {missions.length === 0 ? (
                                <p className="no-missions">尚無任務</p>
                            ) : (
                                <div className="mission-list">
                                    {missions.slice(0, 5).map(mission => (
                                        <div key={mission.id} className="mission-item">
                                            <span className="mission-type">{mission.type}</span>
                                            <span className="mission-status">{mission.status}</span>
                                            <span className="mission-waypoints">{mission.waypoints.length} 航點</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </main>
                ) : (
                    <main className="drone-details empty">
                        <p>請選擇一架無人機</p>
                    </main>
                )}
            </div>
        </div>
    );
};

export default DroneControlPage;
