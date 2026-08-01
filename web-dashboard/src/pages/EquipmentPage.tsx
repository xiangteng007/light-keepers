/**
 * Equipment Page - 設備生命週期管理
 *
 * List archetype（DESIGN_LANGUAGE §7.1）：header → stats-panel → filter-bar
 * toolbar → equipment-grid content。狀態一律 Badge（§3 語意），操作一律
 * design-system Button，新增設備用 design-system Modal。
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Button, Badge, Modal } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
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

// ============ Loading skeleton（DESIGN_LANGUAGE §7.1，≥3 列）============

const EquipmentSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
    <div className="equipment-skeleton" role="status" aria-label="載入中">
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="equipment-skeleton__row" />
        ))}
    </div>
);

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
        const holderName = prompt('請輸入借用者姓名:');
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
        const batteryStr = prompt('目前電量 (0-100,可留空):');
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
            RADIO: '📻 無線電',
            GPS: '📍 GPS',
            TABLET: '📱 平板',
            DRONE: '🛸 無人機',
            FIRST_AID: '🏥 急救包',
            LIGHT: '🔦 照明',
            POWER_BANK: '🔋 行動電源',
            OTHER: '📦 其他',
        };
        return labels[cat] || cat;
    };

    // 狀態 → Badge variant 對照（DESIGN_LANGUAGE §3，嚴格語意，不可誤用）
    const getStatusBadge = (status: string) => {
        const config: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
            AVAILABLE: { variant: 'success', label: '可用' },
            IN_USE: { variant: 'info', label: '使用中' },
            MAINTENANCE: { variant: 'warning', label: '維護中' },
            CHARGING: { variant: 'info', label: '充電中' },
            DAMAGED: { variant: 'danger', label: '損壞' },
            RETIRED: { variant: 'default', label: '報廢' },
        };
        const cfg = config[status] || { variant: 'default' as const, label: status };
        return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
    };

    // ============ Render ============

    return (
        <div className="equipment-page">
            <header className="equipment-header">
                <h1>📦 設備管理</h1>
                <Button variant="primary" onClick={() => setShowNewModal(true)}>
                    + 新增設備
                </Button>
            </header>

            {loading ? (
                <EquipmentSkeleton rows={4} />
            ) : (
                <>
                    {/* Stats */}
                    {stats && (
                        <div className="stats-panel">
                            <div className="stat-card"><span className="label">總數</span><span className="value">{stats.total}</span></div>
                            <div className="stat-card available"><span className="label">可用</span><span className="value">{stats.available}</span></div>
                            <div className="stat-card in-use"><span className="label">使用中</span><span className="value">{stats.inUse}</span></div>
                            <div className="stat-card maintenance"><span className="label">維護</span><span className="value">{stats.maintenance}</span></div>
                            <div className="stat-card low-battery"><span className="label">低電量</span><span className="value">{stats.lowBattery}</span></div>
                            <div className="stat-card due"><span className="label">待保養</span><span className="value">{stats.maintenanceDue}</span></div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="filter-bar">
                        <select title="篩選設備類別" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
                            <option value="">全部類別</option>
                            <option value="RADIO">無線電</option>
                            <option value="GPS">GPS</option>
                            <option value="TABLET">平板</option>
                            <option value="DRONE">無人機</option>
                            <option value="FIRST_AID">急救包</option>
                            <option value="LIGHT">照明</option>
                            <option value="POWER_BANK">行動電源</option>
                        </select>
                        <select title="篩選設備狀態" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                            <option value="">全部狀態</option>
                            <option value="AVAILABLE">可用</option>
                            <option value="IN_USE">使用中</option>
                            <option value="MAINTENANCE">維護中</option>
                            <option value="CHARGING">充電中</option>
                        </select>
                    </div>

                    {/* Equipment Grid */}
                    {equipment.length === 0 ? (
                        <EmptyState
                            variant="default"
                            title="尚無設備資料"
                            description="還沒有任何設備登記，新增第一項設備以開始追蹤。"
                            action={{ label: '+ 新增設備', onClick: () => setShowNewModal(true) }}
                        />
                    ) : (
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
                                                className={`battery-fill ${item.batteryLevel < 20 ? 'battery-fill--low' : item.batteryLevel < 50 ? 'battery-fill--medium' : 'battery-fill--high'}`}
                                                style={{ width: `${item.batteryLevel}%` }}
                                            />
                                            <span className="battery-text">{item.batteryLevel}%</span>
                                        </div>
                                    )}

                                    {item.currentHolderName && (
                                        <p className="holder">👤 {item.currentHolderName}</p>
                                    )}

                                    <div className="card-actions">
                                        {item.status === 'AVAILABLE' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={e => { e.stopPropagation(); handleCheckout(item.id); }}
                                            >
                                                借出
                                            </Button>
                                        )}
                                        {item.status === 'IN_USE' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={e => { e.stopPropagation(); handleReturn(item.id); }}
                                            >
                                                歸還
                                            </Button>
                                        )}
                                        {item.status === 'AVAILABLE' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={e => { e.stopPropagation(); handleStartMaintenance(item.id); }}
                                            >
                                                維護
                                            </Button>
                                        )}
                                        {item.status === 'MAINTENANCE' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={e => { e.stopPropagation(); handleEndMaintenance(item.id); }}
                                            >
                                                完成維護
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* New Equipment Modal */}
            <Modal
                isOpen={showNewModal}
                onClose={() => setShowNewModal(false)}
                title="新增設備"
            >
                <div className="form-section">
                    <label>設備名稱</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="例: Motorola T82 對講機"
                    />
                </div>

                <div className="form-section">
                    <label>序號</label>
                    <input
                        type="text"
                        value={formData.serialNumber}
                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                        placeholder="唯一識別碼"
                    />
                </div>

                <div className="form-section">
                    <label>QR Code (選填)</label>
                    <input
                        type="text"
                        value={formData.qrCode}
                        onChange={e => setFormData({ ...formData, qrCode: e.target.value })}
                        placeholder="QR Code 識別碼"
                    />
                </div>

                <div className="form-section">
                    <label>類別</label>
                    <select
                        title="設備類別"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                        <option value="RADIO">無線電</option>
                        <option value="GPS">GPS</option>
                        <option value="TABLET">平板</option>
                        <option value="DRONE">無人機</option>
                        <option value="FIRST_AID">急救包</option>
                        <option value="LIGHT">照明</option>
                        <option value="POWER_BANK">行動電源</option>
                        <option value="OTHER">其他</option>
                    </select>
                </div>

                <div className="form-actions">
                    <Button variant="secondary" onClick={() => setShowNewModal(false)}>取消</Button>
                    <Button variant="primary" onClick={handleCreate}>新增</Button>
                </div>
            </Modal>
        </div>
    );
};

export default EquipmentPage;
