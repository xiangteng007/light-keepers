/**
 * TacticalMapPage.tsx
 * 
 * 戰術地圖頁面 - Geo Intelligence Domain
 * 功能：事件位置、志工部署、資源分布、即時追蹤
 */
import { useState, useEffect } from 'react';
import {
    MapPin, Users, Package, AlertTriangle, Layers, Navigation,
    Filter, RefreshCw, Maximize2, Download, Radio, Crosshair
} from 'lucide-react';
import './TacticalMapPage.css';

// Mock data for demonstration
const MOCK_INCIDENTS = [
    { id: 1, type: 'fire', lat: 25.0330, lng: 121.5654, title: '火災事件', status: 'active', severity: 'high' },
    { id: 2, type: 'flood', lat: 25.0420, lng: 121.5140, title: '淹水通報', status: 'active', severity: 'medium' },
    { id: 3, type: 'rescue', lat: 25.0280, lng: 121.5420, title: '救援請求', status: 'responding', severity: 'critical' },
];

const MOCK_VOLUNTEERS = [
    { id: 1, name: '張志工', lat: 25.0350, lng: 121.5600, status: 'available', team: 'A組' },
    { id: 2, name: '李志工', lat: 25.0400, lng: 121.5200, status: 'deployed', team: 'B組' },
    { id: 3, name: '王志工', lat: 25.0300, lng: 121.5500, status: 'available', team: 'A組' },
];

const MOCK_RESOURCES = [
    { id: 1, type: 'shelter', lat: 25.0380, lng: 121.5450, name: '臨時避難所', capacity: 200 },
    { id: 2, type: 'medical', lat: 25.0290, lng: 121.5350, name: '醫療站', capacity: 50 },
    { id: 3, type: 'supply', lat: 25.0360, lng: 121.5550, name: '物資集散點', capacity: 1000 },
];

type LayerType = 'incidents' | 'volunteers' | 'resources' | 'routes';

export default function TacticalMapPage() {
    const [activeLayers, setActiveLayers] = useState<LayerType[]>(['incidents', 'volunteers', 'resources']);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isLiveTracking, setIsLiveTracking] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Simulate live updates
    useEffect(() => {
        if (!isLiveTracking) return;
        const interval = setInterval(() => {
            setLastUpdate(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, [isLiveTracking]);

    const toggleLayer = (layer: LayerType) => {
        setActiveLayers(prev =>
            prev.includes(layer)
                ? prev.filter(l => l !== layer)
                : [...prev, layer]
        );
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#eab308';
            default: return '#22c55e';
        }
    };

    return (
        <div className="tactical-map-page">
            {/* Header Controls */}
            <div className="tactical-header">
                <div className="tactical-title">
                    <MapPin className="title-icon" size={20} />
                    <h1>戰術地圖</h1>
                    <span className="live-indicator">
                        <Radio size={12} className={isLiveTracking ? 'pulse' : ''} />
                        {isLiveTracking ? 'LIVE' : 'PAUSED'}
                    </span>
                </div>
                <div className="tactical-actions">
                    <button className="action-btn" title="重新整理">
                        <RefreshCw size={16} />
                    </button>
                    <button className="action-btn" title="全螢幕">
                        <Maximize2 size={16} />
                    </button>
                    <button className="action-btn" title="匯出">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="tactical-content">
                {/* Sidebar - Layer Controls */}
                <aside className="tactical-sidebar">
                    <div className="sidebar-section">
                        <h3><Layers size={14} /> 圖層控制</h3>
                        <div className="layer-toggles">
                            <label className={`layer-toggle ${activeLayers.includes('incidents') ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={activeLayers.includes('incidents')}
                                    onChange={() => toggleLayer('incidents')}
                                />
                                <AlertTriangle size={14} />
                                <span>事件 ({MOCK_INCIDENTS.length})</span>
                            </label>
                            <label className={`layer-toggle ${activeLayers.includes('volunteers') ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={activeLayers.includes('volunteers')}
                                    onChange={() => toggleLayer('volunteers')}
                                />
                                <Users size={14} />
                                <span>志工 ({MOCK_VOLUNTEERS.length})</span>
                            </label>
                            <label className={`layer-toggle ${activeLayers.includes('resources') ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={activeLayers.includes('resources')}
                                    onChange={() => toggleLayer('resources')}
                                />
                                <Package size={14} />
                                <span>資源 ({MOCK_RESOURCES.length})</span>
                            </label>
                            <label className={`layer-toggle ${activeLayers.includes('routes') ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={activeLayers.includes('routes')}
                                    onChange={() => toggleLayer('routes')}
                                />
                                <Navigation size={14} />
                                <span>路線</span>
                            </label>
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h3><Filter size={14} /> 篩選</h3>
                        <select className="filter-select">
                            <option value="all">所有事件</option>
                            <option value="critical">緊急事件</option>
                            <option value="active">進行中</option>
                            <option value="resolved">已解決</option>
                        </select>
                    </div>

                    <div className="sidebar-section legend">
                        <h3>圖例</h3>
                        <div className="legend-items">
                            <div className="legend-item">
                                <span className="legend-dot" style={{ background: '#ef4444' }}></span>
                                <span>緊急</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot" style={{ background: '#f97316' }}></span>
                                <span>高優先</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot" style={{ background: '#eab308' }}></span>
                                <span>中優先</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot" style={{ background: '#22c55e' }}></span>
                                <span>一般</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Map Container */}
                <div className="map-container">
                    {/* Placeholder for Leaflet Map */}
                    <div className="map-placeholder">
                        <div className="map-grid">
                            {/* Simulated map markers */}
                            {activeLayers.includes('incidents') && MOCK_INCIDENTS.map(incident => (
                                <div
                                    key={`incident-${incident.id}`}
                                    className="map-marker incident-marker"
                                    style={{
                                        left: `${(incident.lng - 121.5) * 1000 + 50}%`,
                                        top: `${(25.05 - incident.lat) * 1000 + 50}%`,
                                        borderColor: getSeverityColor(incident.severity)
                                    }}
                                    onClick={() => setSelectedItem({ ...incident, type: 'incident' })}
                                    title={incident.title}
                                >
                                    <AlertTriangle size={16} color={getSeverityColor(incident.severity)} />
                                </div>
                            ))}
                            {activeLayers.includes('volunteers') && MOCK_VOLUNTEERS.map(vol => (
                                <div
                                    key={`vol-${vol.id}`}
                                    className={`map-marker volunteer-marker ${vol.status}`}
                                    style={{
                                        left: `${(vol.lng - 121.5) * 1000 + 50}%`,
                                        top: `${(25.05 - vol.lat) * 1000 + 50}%`
                                    }}
                                    onClick={() => setSelectedItem({ ...vol, type: 'volunteer' })}
                                    title={vol.name}
                                >
                                    <Users size={14} />
                                </div>
                            ))}
                            {activeLayers.includes('resources') && MOCK_RESOURCES.map(res => (
                                <div
                                    key={`res-${res.id}`}
                                    className="map-marker resource-marker"
                                    style={{
                                        left: `${(res.lng - 121.5) * 1000 + 50}%`,
                                        top: `${(25.05 - res.lat) * 1000 + 50}%`
                                    }}
                                    onClick={() => setSelectedItem({ ...res, type: 'resource' })}
                                    title={res.name}
                                >
                                    <Package size={14} />
                                </div>
                            ))}
                        </div>
                        <div className="map-center-indicator">
                            <Crosshair size={24} />
                        </div>
                        <div className="map-coords">
                            25.0330°N, 121.5654°E
                        </div>
                    </div>
                </div>

                {/* Detail Panel */}
                {selectedItem && (
                    <div className="detail-panel">
                        <div className="detail-header">
                            <h3>
                                {selectedItem.type === 'incident' && <AlertTriangle size={16} />}
                                {selectedItem.type === 'volunteer' && <Users size={16} />}
                                {selectedItem.type === 'resource' && <Package size={16} />}
                                {selectedItem.title || selectedItem.name}
                            </h3>
                            <button onClick={() => setSelectedItem(null)}>×</button>
                        </div>
                        <div className="detail-content">
                            {selectedItem.type === 'incident' && (
                                <>
                                    <p><strong>狀態：</strong>{selectedItem.status}</p>
                                    <p><strong>嚴重程度：</strong>{selectedItem.severity}</p>
                                    <p><strong>座標：</strong>{selectedItem.lat}, {selectedItem.lng}</p>
                                </>
                            )}
                            {selectedItem.type === 'volunteer' && (
                                <>
                                    <p><strong>狀態：</strong>{selectedItem.status}</p>
                                    <p><strong>小組：</strong>{selectedItem.team}</p>
                                    <p><strong>座標：</strong>{selectedItem.lat}, {selectedItem.lng}</p>
                                </>
                            )}
                            {selectedItem.type === 'resource' && (
                                <>
                                    <p><strong>類型：</strong>{selectedItem.type}</p>
                                    <p><strong>容量：</strong>{selectedItem.capacity}</p>
                                    <p><strong>座標：</strong>{selectedItem.lat}, {selectedItem.lng}</p>
                                </>
                            )}
                        </div>
                        <div className="detail-actions">
                            <button className="btn-primary">導航前往</button>
                            <button className="btn-secondary">指派任務</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="tactical-status-bar">
                <span>最後更新：{lastUpdate.toLocaleTimeString()}</span>
                <span>事件：{MOCK_INCIDENTS.length} | 志工：{MOCK_VOLUNTEERS.length} | 資源點：{MOCK_RESOURCES.length}</span>
                <button
                    className={`tracking-toggle ${isLiveTracking ? 'active' : ''}`}
                    onClick={() => setIsLiveTracking(!isLiveTracking)}
                >
                    {isLiveTracking ? '暫停追蹤' : '開始追蹤'}
                </button>
            </div>
        </div>
    );
}
