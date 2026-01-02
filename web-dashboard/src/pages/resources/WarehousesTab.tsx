import { useState, useEffect } from 'react';
import { Card, Button } from '../../design-system';
import './WarehousesTab.css';

// VITE_API_URL 不含 /api/v1，需要手動加上
const API_BASE = `${import.meta.env.VITE_API_URL || 'https://light-keepers-api-bsf4y44tja-de.a.run.app'}/api/v1`;

interface Warehouse {
    id: string;
    name: string;
    code: string;
    address?: string;
    contactPerson?: string;
    contactPhone?: string;
    isPrimary: boolean;
    isActive: boolean;
    notes?: string;
}

interface StorageLocation {
    id: string;
    warehouseId: string;
    zone: string;
    rack: string;
    level: string;
    position?: string;
    fullPath: string;
    barcode?: string;
    capacity?: number;
    warehouse?: Warehouse;
}

interface WarehousesTabProps {
    canManage: boolean;
}

export default function WarehousesTab({ canManage }: WarehousesTabProps) {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<StorageLocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
    const [showAddWarehouse, setShowAddWarehouse] = useState(false);
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [warehouseForm, setWarehouseForm] = useState({
        name: '', code: '', address: '', contactPerson: '', contactPhone: '', notes: '', isPrimary: false,
    });
    const [locationForm, setLocationForm] = useState({
        zone: '', rack: '', level: '', position: '', capacity: 0,
    });

    const fetchWarehouses = async () => {
        try {
            const res = await fetch(`${API_BASE}/warehouses`);
            const data = await res.json();
            setWarehouses(data.data || []);
            if (data.data?.length > 0 && !selectedWarehouse) {
                setSelectedWarehouse(data.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch warehouses:', err);
        }
    };

    const fetchLocations = async (warehouseId: string) => {
        try {
            const res = await fetch(`${API_BASE}/warehouses/${warehouseId}/locations`);
            const data = await res.json();
            setLocations(data.data || []);
        } catch (err) {
            console.error('Failed to fetch locations:', err);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchWarehouses().finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (selectedWarehouse) {
            fetchLocations(selectedWarehouse);
        }
    }, [selectedWarehouse]);

    const handleAddWarehouse = async () => {
        try {
            const res = await fetch(`${API_BASE}/warehouses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(warehouseForm),
            });
            if (res.ok) {
                await fetchWarehouses();
                setShowAddWarehouse(false);
                setWarehouseForm({ name: '', code: '', address: '', contactPerson: '', contactPhone: '', notes: '', isPrimary: false });
            }
        } catch (err) {
            console.error('Failed to create warehouse:', err);
        }
    };

    const handleAddLocation = async () => {
        if (!selectedWarehouse) return;
        try {
            const res = await fetch(`${API_BASE}/warehouses/${selectedWarehouse}/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(locationForm),
            });
            if (res.ok) {
                await fetchLocations(selectedWarehouse);
                setShowAddLocation(false);
                setLocationForm({ zone: '', rack: '', level: '', position: '', capacity: 0 });
            }
        } catch (err) {
            console.error('Failed to create location:', err);
        }
    };

    if (isLoading) {
        return <div className="loading-state"><div className="spinner"></div><p>載入中...</p></div>;
    }

    return (
        <div className="warehouses-tab">
            {/* 倉庫列表 */}
            <div className="section">
                <div className="section-header">
                    <h3>🏭 倉庫/據點</h3>
                    {canManage && (
                        <Button size="sm" onClick={() => setShowAddWarehouse(true)}>
                            + 新增倉庫
                        </Button>
                    )}
                </div>
                <div className="warehouse-chips">
                    {warehouses.map(wh => (
                        <button
                            key={wh.id}
                            className={`warehouse-chip ${selectedWarehouse === wh.id ? 'active' : ''}`}
                            onClick={() => setSelectedWarehouse(wh.id)}
                        >
                            {wh.isPrimary && <span className="primary-badge">⭐</span>}
                            {wh.name}
                            <span className="code">({wh.code})</span>
                        </button>
                    ))}
                    {warehouses.length === 0 && <p className="empty-hint">尚無倉庫，請先新增</p>}
                </div>
            </div>

            {/* 儲位列表 */}
            {selectedWarehouse && (
                <div className="section">
                    <div className="section-header">
                        <h3>📍 儲位管理</h3>
                        {canManage && (
                            <Button size="sm" onClick={() => setShowAddLocation(true)}>
                                + 新增儲位
                            </Button>
                        )}
                    </div>
                    <div className="locations-grid">
                        {locations.map(loc => (
                            <Card key={loc.id} className="location-card" padding="sm">
                                <div className="location-path">{loc.fullPath}</div>
                                {loc.barcode && <div className="location-barcode">🏷️ {loc.barcode}</div>}
                                {loc.capacity && <div className="location-capacity">容量: {loc.capacity}</div>}
                            </Card>
                        ))}
                        {locations.length === 0 && <p className="empty-hint">此倉庫尚無儲位</p>}
                    </div>
                </div>
            )}

            {/* 新增倉庫 Modal */}
            {showAddWarehouse && (
                <div className="modal-overlay" onClick={() => setShowAddWarehouse(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>新增倉庫</h3>
                        <div className="form-group">
                            <label>倉庫名稱 *</label>
                            <input value={warehouseForm.name} onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>代碼 *</label>
                            <input value={warehouseForm.code} onChange={e => setWarehouseForm({ ...warehouseForm, code: e.target.value })} placeholder="如: HQ, WH01" />
                        </div>
                        <div className="form-group">
                            <label>地址</label>
                            <input value={warehouseForm.address} onChange={e => setWarehouseForm({ ...warehouseForm, address: e.target.value })} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>聯絡人</label>
                                <input value={warehouseForm.contactPerson} onChange={e => setWarehouseForm({ ...warehouseForm, contactPerson: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>電話</label>
                                <input value={warehouseForm.contactPhone} onChange={e => setWarehouseForm({ ...warehouseForm, contactPhone: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input type="checkbox" checked={warehouseForm.isPrimary} onChange={e => setWarehouseForm({ ...warehouseForm, isPrimary: e.target.checked })} />
                                設為主倉庫
                            </label>
                        </div>
                        <div className="modal-actions">
                            <Button variant="ghost" onClick={() => setShowAddWarehouse(false)}>取消</Button>
                            <Button onClick={handleAddWarehouse} disabled={!warehouseForm.name || !warehouseForm.code}>新增</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 新增儲位 Modal */}
            {showAddLocation && (
                <div className="modal-overlay" onClick={() => setShowAddLocation(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>新增儲位</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>區域 *</label>
                                <input value={locationForm.zone} onChange={e => setLocationForm({ ...locationForm, zone: e.target.value })} placeholder="如: A, B" />
                            </div>
                            <div className="form-group">
                                <label>架號 *</label>
                                <input value={locationForm.rack} onChange={e => setLocationForm({ ...locationForm, rack: e.target.value })} placeholder="如: 01, 02" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>層號 *</label>
                                <input value={locationForm.level} onChange={e => setLocationForm({ ...locationForm, level: e.target.value })} placeholder="如: 1, 2" />
                            </div>
                            <div className="form-group">
                                <label>格位</label>
                                <input value={locationForm.position} onChange={e => setLocationForm({ ...locationForm, position: e.target.value })} placeholder="如: 左, 中, 右" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>容量</label>
                            <input type="number" value={locationForm.capacity} onChange={e => setLocationForm({ ...locationForm, capacity: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="modal-actions">
                            <Button variant="ghost" onClick={() => setShowAddLocation(false)}>取消</Button>
                            <Button onClick={handleAddLocation} disabled={!locationForm.zone || !locationForm.rack || !locationForm.level}>新增</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
