/**
 * Equipment Page - 設備生命週期管理
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './EquipmentPage.css';

// ============ Types ============

interface Equipment {
    id: string;
    name: string;
    serialNumber: string;
    qrCode?: string;
    category: string;
    status: string;
    batteryLevel?: number;
    batteryHealth?: number;
    lastCharged?: string;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    currentHolderName?: string;
    checkedOutAt?: string;
}

interface EquipmentStats {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    lowBattery: number;
    maintenanceDue: number;
}

// ============ Component ============

export const EquipmentPage: React.FC = () => {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [stats, setStats] = useState<EquipmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ category: '', status: '' });
    const [showNewModal, setShowNewModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        serialNumber: '',
        qrCode: '',
        category: 'OTHER',
    });

    // ============ Data Fetching ============

    const fetchEquipment = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filter.category) params.append('category', filter.category);
            if (filter.status) params.append('status', filter.status);

            const response = await api.get(`/equipment?${params}`);
            setEquipment(response.data);
        } catch (error) {
            console.error('Failed to fetch equipment:', error);
        }
    }, [filter]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await api.get('/equipment/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchEquipment(), fetchStats()]);
            setLoading(false);
        };
        loadData();
    }, [fetchEquipment, fetchStats]);

    // ============ Handlers ============

    const handleCreate = async () => {
        try {
            await api.post('/equipment', formData);
            setShowNewModal(false);
            setFormData({ name: '', serialNumber: '', qrCode: '', category: 'OTHER' });
            await Promise.all([fetchEquipment(), fetchStats()]);
        } catch (error) {
            console.error('Failed to create equipment:', error);
        }
    };

    const handleCheckout = async (id: string) => {
        const holderName = prompt('請輸入借用者姓�?');
        if (!holderName) return;

        try {
            await api.post(`/equipment/${id}/checkout`, {
                holderId: 'manual',
                holderName,
            });
            await fetchEquipment();
        } catch (error) {
            console.error('Failed to checkout:', error);
        }
    };

    const handleReturn = async (id: string) => {
        const batteryStr = prompt('目前電量 (0-100,可留�?:');
        const batteryLevel = batteryStr ? parseInt(batteryStr) : undefined;

        try {
            await api.post(`/equipment/${id}/return`, {
                returnerId: 'manual',
                returnerName: '系統',
                batteryLevel,
            });
            await fetchEquipment();
        } catch (error) {
            console.error('Failed to return:', error);
        }
    };

    const handleStartMaintenance = async (id: string) => {
        const reason = prompt('維護原因:');
        if (!reason) return;

        try {
            await api.post(`/equipment/${id}/maintenance/start`, { reason });
            await fetchEquipment();
        } catch (error) {
            console.error('Failed to start maintenance:', error);
        }
    };

    const handleEndMaintenance = async (id: string) => {
        try {
            await api.post(`/equipment/${id}/maintenance/end`, { notes: '維護完成' });
            await fetchEquipment();
        } catch (error) {
            console.error('Failed to end maintenance:', error);
        }
    };

    // ============ Render Helpers ============

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            RADIO: '📻 無線�?,
            GPS: '📍 GPS',
            TABLET: '📱 平板',
            DRONE: '🛸 無人�?,
            FIRST_AID: '🏥 急救�?,
            LIGHT: '🔦 照明',
            POWER_BANK: '🔋 行動電源',
            OTHER: '📦 其他',
        };
        return labels[cat] || cat;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string; label: string }> = {
            AVAILABLE: { bg: '#22c55e', color: '#fff', label: '可用' },
            IN_USE: { bg: '#3b82f6', color: '#fff', label: '使用�? },
            MAINTENANCE: { bg: '#f59e0b', color: '#000', label: '維護�? },
            CHARGING: { bg: '#8b5cf6', color: '#fff', label: '充電�? },
            DAMAGED: { bg: '#ef4444', color: '#fff', label: '損壞' },
            RETIRED: { bg: '#6b7280', color: '#fff', label: '報廢' },
        };
        const style = styles[status] || { bg: '#888', color: '#fff', label: status };
        return <span className="status-badge" style={{ background: style.bg, color: style.color }}>{style.label}</span>;
    };

    // ============ Render ============

    if (loading) {
        return <div className="equipment-page loading">載入�?..</div>;
    }

    return (
        <div className="equipment-page">
            <header className="equipment-header">
                <h1>📦 設備管理</h1>
                <button className="btn-new" onClick={() => setShowNewModal(true)}>
                    + 新增設備
                </button>
            </header>

            {/* Stats */}
            {stats && (
                <div className="stats-panel">
                    <div className="stat-card"><span className="label">總數</span><span className="value">{stats.total}</span></div>
                    <div className="stat-card available"><span className="label">可用</span><span className="value">{stats.available}</span></div>
                    <div className="stat-card in-use"><span className="label">使用�?/span><span className="value">{stats.inUse}</span></div>
                    <div className="stat-card maintenance"><span className="label">維護</span><span className="value">{stats.maintenance}</span></div>
                    <div className="stat-card low-battery"><span className="label">低電�?/span><span className="value">{stats.lowBattery}</span></div>
                    <div className="stat-card due"><span className="label">待保�?/span><span className="value">{stats.maintenanceDue}</span></div>
                </div>
            )}

            {/* Filters */}
            <div className="filter-bar">
                <select title="篩選設備類別" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
                    <option value="">全部類別</option>
                    <option value="RADIO">無線�?/option>
                    <option value="GPS">GPS</option>
                    <option value="TABLET">平板</option>
                    <option value="DRONE">無人�?/option>
                    <option value="FIRST_AID">急救�?/option>
                    <option value="LIGHT">照明</option>
                    <option value="POWER_BANK">行動電源</option>
                </select>
                <select title="篩選設備狀�? value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                    <option value="">全部狀�?/option>
                    <option value="AVAILABLE">可用</option>
                    <option value="IN_USE">使用�?/option>
                    <option value="MAINTENANCE">維護�?/option>
                    <option value="CHARGING">充電�?/option>
                </select>
            </div>

            {/* Equipment Grid */}
            <div className="equipment-grid">
                {equipment.map(item => (
                    <div key={item.id} className="equipment-card">
                        <div className="card-header">
                            <span className="category">{getCategoryLabel(item.category)}</span>
                            {getStatusBadge(item.status)}
                        </div>
                        <h3>{item.name}</h3>
                        <p className="serial">SN: {item.serialNumber}</p>

                        {item.batteryLevel !== undefined && (
                            <div className="battery-bar">
                                <div
                                    className="battery-fill"
                                    style={{
                                        width: `${item.batteryLevel}%`,
                                        background: item.batteryLevel < 20 ? '#ef4444' : item.batteryLevel < 50 ? '#f59e0b' : '#22c55e'
                                    }}
                                />
                                <span className="battery-text">{item.batteryLevel}%</span>
                            </div>
                        )}

                        {item.currentHolderName && (
                            <p className="holder">👤 {item.currentHolderName}</p>
                        )}

                        <div className="card-actions">
                            {item.status === 'AVAILABLE' && (
                                <button onClick={e => { e.stopPropagation(); handleCheckout(item.id); }}>借出</button>
                            )}
                            {item.status === 'IN_USE' && (
                                <button onClick={e => { e.stopPropagation(); handleReturn(item.id); }}>歸還</button>
                            )}
                            {item.status === 'AVAILABLE' && (
                                <button className="secondary" onClick={e => { e.stopPropagation(); handleStartMaintenance(item.id); }}>維護</button>
                            )}
                            {item.status === 'MAINTENANCE' && (
                                <button onClick={e => { e.stopPropagation(); handleEndMaintenance(item.id); }}>完成維護</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* New Equipment Modal */}
            {showNewModal && (
                <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>新增設備</h2>

                        <div className="form-section">
                            <label>設備名稱</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="�? Motorola T82 對講�?
                            />
                        </div>

                        <div className="form-section">
                            <label>序號</label>
                            <input
                                type="text"
                                value={formData.serialNumber}
                                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                placeholder="唯一識別�?
                            />
                        </div>

                        <div className="form-section">
                            <label>QR Code (選填)</label>
                            <input
                                type="text"
                                value={formData.qrCode}
                                onChange={e => setFormData({ ...formData, qrCode: e.target.value })}
                                placeholder="QR Code 識別�?
                            />
                        </div>

                        <div className="form-section">
                            <label>類別</label>
                            <select
                                title="設備類別"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="RADIO">無線�?/option>
                                <option value="GPS">GPS</option>
                                <option value="TABLET">平板</option>
                                <option value="DRONE">無人�?/option>
                                <option value="FIRST_AID">急救�?/option>
                                <option value="LIGHT">照明</option>
                                <option value="POWER_BANK">行動電源</option>
                                <option value="OTHER">其他</option>
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowNewModal(false)}>取消</button>
                            <button className="btn-save" onClick={handleCreate}>新增</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentPage;
