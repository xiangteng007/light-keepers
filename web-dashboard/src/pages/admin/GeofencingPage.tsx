/**
 * Geofencing Editor Page
 * Admin page for managing geofence zones
 */

import React, { useState, useEffect } from 'react';
import './GeofencingPage.css';

interface GeoZone {
    id: string;
    name: string;
    type: 'circle' | 'polygon';
    center?: { lat: number; lng: number };
    radiusKm?: number;
    points?: Array<{ lat: number; lng: number }>;
    alertType?: 'enter' | 'exit' | 'both';
    enabled: boolean;
    description?: string;
    createdAt: string;
}

const GeofencingPage: React.FC = () => {
    const [zones, setZones] = useState<GeoZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'circle' as 'circle' | 'polygon',
        centerLat: '',
        centerLng: '',
        radiusKm: '1',
        alertType: 'both' as 'enter' | 'exit' | 'both',
        description: '',
    });

    useEffect(() => {
        loadZones();
    }, []);

    const loadZones = async () => {
        try {
            const response = await fetch('/api/geofence/zones');
            if (response.ok) {
                const data = await response.json();
                setZones(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load zones:', error);
        } finally {
            setLoading(false);
        }
    };

    const createZone = async () => {
        const payload = {
            name: formData.name,
            type: formData.type,
            center: {
                lat: parseFloat(formData.centerLat),
                lng: parseFloat(formData.centerLng),
            },
            radiusKm: parseFloat(formData.radiusKm),
            alertType: formData.alertType,
            description: formData.description,
            enabled: true,
        };

        try {
            const response = await fetch('/api/geofence/zones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                setShowModal(false);
                loadZones();
                resetForm();
            }
        } catch (error) {
            console.error('Failed to create zone:', error);
        }
    };

    const deleteZone = async (id: string) => {
        if (!confirm('確定要刪除此區域？')) return;

        try {
            await fetch(`/api/geofence/zones/${id}`, { method: 'DELETE' });
            loadZones();
        } catch (error) {
            console.error('Failed to delete zone:', error);
        }
    };

    const toggleZone = async (zone: GeoZone) => {
        try {
            await fetch(`/api/geofence/zones/${zone.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...zone, enabled: !zone.enabled }),
            });
            loadZones();
        } catch (error) {
            console.error('Failed to toggle zone:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'circle',
            centerLat: '',
            centerLng: '',
            radiusKm: '1',
            alertType: 'both',
            description: '',
        });
    };

    const useCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    setFormData(prev => ({
                        ...prev,
                        centerLat: pos.coords.latitude.toFixed(6),
                        centerLng: pos.coords.longitude.toFixed(6),
                    }));
                },
                err => {
                    alert('無法取得位置: ' + err.message);
                }
            );
        }
    };

    if (loading) {
        return <div className="geo-loading">載入中...</div>;
    }

    return (
        <div className="geofencing-page">
            <header className="geo-header">
                <div>
                    <h1>📍 地理圍欄編輯器</h1>
                    <p>設定位置監控區域與警報觸發條件</p>
                </div>
                <button className="create-btn" onClick={() => setShowModal(true)}>
                    ➕ 新增區域
                </button>
            </header>

            <div className="zones-grid">
                {zones.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🗺️</div>
                        <p>尚未設定任何地理圍欄</p>
                        <button onClick={() => setShowModal(true)}>建立第一個區域</button>
                    </div>
                ) : (
                    zones.map(zone => (
                        <div key={zone.id} className={`zone-card ${zone.enabled ? '' : 'disabled'}`}>
                            <div className="zone-header">
                                <span className={`zone-type ${zone.type}`}>
                                    {zone.type === 'circle' ? '⭕' : '🔷'}
                                </span>
                                <h3>{zone.name}</h3>
                                <button
                                    className={`toggle-btn ${zone.enabled ? 'on' : 'off'}`}
                                    onClick={() => toggleZone(zone)}
                                >
                                    {zone.enabled ? '啟用' : '停用'}
                                </button>
                            </div>

                            {zone.description && (
                                <p className="zone-description">{zone.description}</p>
                            )}

                            <div className="zone-details">
                                {zone.type === 'circle' && zone.center && (
                                    <>
                                        <span>📍 {zone.center.lat.toFixed(4)}, {zone.center.lng.toFixed(4)}</span>
                                        <span>📏 半徑 {zone.radiusKm} km</span>
                                    </>
                                )}
                                {zone.type === 'polygon' && zone.points && (
                                    <span>📐 {zone.points.length} 個頂點</span>
                                )}
                                <span className="alert-type">
                                    {zone.alertType === 'enter' ? '🔔 進入時警報' :
                                        zone.alertType === 'exit' ? '🔔 離開時警報' : '🔔 進出都警報'}
                                </span>
                            </div>

                            <div className="zone-actions">
                                <button className="action-btn delete" onClick={() => deleteZone(zone.id)}>
                                    🗑️ 刪除
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>新增地理圍欄</h2>

                        <div className="form-group">
                            <label>區域名稱</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="例如：指揮中心"
                            />
                        </div>

                        <div className="form-group">
                            <label>區域類型</label>
                            <div className="type-selector">
                                <button
                                    type="button"
                                    className={formData.type === 'circle' ? 'active' : ''}
                                    onClick={() => setFormData(prev => ({ ...prev, type: 'circle' }))}
                                >
                                    ⭕ 圓形
                                </button>
                                <button
                                    type="button"
                                    className={formData.type === 'polygon' ? 'active' : ''}
                                    onClick={() => setFormData(prev => ({ ...prev, type: 'polygon' }))}
                                    disabled
                                >
                                    🔷 多邊形 (即將推出)
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>中心點座標</label>
                            <div className="coord-inputs">
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={formData.centerLat}
                                    onChange={e => setFormData(prev => ({ ...prev, centerLat: e.target.value }))}
                                    placeholder="緯度"
                                />
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={formData.centerLng}
                                    onChange={e => setFormData(prev => ({ ...prev, centerLng: e.target.value }))}
                                    placeholder="經度"
                                />
                                <button type="button" className="location-btn" onClick={useCurrentLocation}>
                                    📍
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>半徑 (公里)</label>
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={formData.radiusKm}
                                onChange={e => setFormData(prev => ({ ...prev, radiusKm: e.target.value }))}
                            />
                        </div>

                        <div className="form-group">
                            <label>警報類型</label>
                            <select
                                value={formData.alertType}
                                onChange={e => setFormData(prev => ({ ...prev, alertType: e.target.value as any }))}
                            >
                                <option value="enter">進入時警報</option>
                                <option value="exit">離開時警報</option>
                                <option value="both">進出都警報</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>描述 (選填)</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="區域用途說明"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>
                                取消
                            </button>
                            <button className="save-btn" onClick={createZone}>
                                建立區域
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeofencingPage;
