/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../../design-system';
import './AssetsTab.css';
import { API_BASE } from '../../api/config';

type AssetStatus = 'in_stock' | 'borrowed' | 'maintenance' | 'disposed' | 'lost';

interface Asset {
    id: string;
    assetNo: string;
    serialNo?: string;
    barcode?: string;
    status: AssetStatus;
    item?: { id: string; name: string; category: string };
    location?: { fullPath: string };
    borrowerName?: string;
    borrowerOrg?: string;
    borrowDate?: string;
    expectedReturnDate?: string;
    borrowPurpose?: string;
}

interface AssetsTabProps {
    canManage: boolean;
    userName: string;
}

const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string; icon: string }> = {
    in_stock: { label: '在庫', color: '#4CAF50', icon: '✅' },
    borrowed: { label: '借出中', color: '#FF9800', icon: '📤' },
    maintenance: { label: '維修中', color: '#2196F3', icon: '🔧' },
    disposed: { label: '已報廢', color: '#9E9E9E', icon: '🗑️' },
    lost: { label: '遺失', color: '#F44336', icon: '⚠️' },
};

export default function AssetsTab({ canManage, userName }: AssetsTabProps) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [showBorrowModal, setShowBorrowModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [borrowForm, setBorrowForm] = useState({
        borrowerName: '', borrowerOrg: '', borrowerContact: '', purpose: '',
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    const [returnForm, setReturnForm] = useState({
        returnCondition: 'normal' as 'normal' | 'damaged' | 'missing_parts' | 'needs_repair',
        conditionNote: '', toLocationId: '',
    });
    const [stats, setStats] = useState({ total: 0, byStatus: {} as Record<string, number>, overdue: 0 });

    const fetchAssets = async () => {
        try {
            const [assetsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/assets${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`).then(r => r.json()),
                fetch(`${API_BASE}/assets/stats`).then(r => r.json()),
            ]);
            setAssets(assetsRes.data || []);
            setStats(statsRes.data || { total: 0, byStatus: {}, overdue: 0 });
        } catch (err) {
            console.error('Failed to fetch assets:', err);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchAssets().finally(() => setIsLoading(false));
    }, [filterStatus]);

    const handleBorrow = async () => {
        if (!selectedAsset) return;
        try {
            const res = await fetch(`${API_BASE}/assets/${selectedAsset.id}/borrow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...borrowForm, operatorName: userName }),
            });
            if (res.ok) {
                await fetchAssets();
                setShowBorrowModal(false);
                setSelectedAsset(null);
                setBorrowForm({ borrowerName: '', borrowerOrg: '', borrowerContact: '', purpose: '', expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] });
            } else {
                const err = await res.json();
                alert(err.message || '借出失敗');
            }
        } catch (err) {
            console.error('Failed to borrow:', err);
        }
    };

    const handleReturn = async () => {
        if (!selectedAsset || !returnForm.toLocationId) return;
        try {
            const res = await fetch(`${API_BASE}/assets/${selectedAsset.id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...returnForm, operatorName: userName }),
            });
            if (res.ok) {
                await fetchAssets();
                setShowReturnModal(false);
                setSelectedAsset(null);
                setReturnForm({ returnCondition: 'normal', conditionNote: '', toLocationId: '' });
            } else {
                const err = await res.json();
                alert(err.message || '歸還失敗');
            }
        } catch (err) {
            console.error('Failed to return:', err);
        }
    };

    const openBorrow = (asset: Asset) => {
        setSelectedAsset(asset);
        setShowBorrowModal(true);
    };

    const openReturn = (asset: Asset) => {
        setSelectedAsset(asset);
        setShowReturnModal(true);
    };

    const isOverdue = (asset: Asset) => {
        if (asset.status !== 'borrowed' || !asset.expectedReturnDate) return false;
        return new Date(asset.expectedReturnDate) < new Date();
    };

    if (isLoading) {
        return <div className="loading-state"><div className="spinner"></div><p>載入中...</p></div>;
    }

    return (
        <div className="assets-tab">
            {/* 統計卡 */}
            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">總資產</span>
                </div>
                <div className="stat-card stat--success">
                    <span className="stat-value">{stats.byStatus['in_stock'] || 0}</span>
                    <span className="stat-label">在庫</span>
                </div>
                <div className="stat-card stat--warning">
                    <span className="stat-value">{stats.byStatus['borrowed'] || 0}</span>
                    <span className="stat-label">借出</span>
                </div>
                <div className="stat-card stat--danger">
                    <span className="stat-value">{stats.overdue}</span>
                    <span className="stat-label">逾期</span>
                </div>
            </div>

            {/* 篩選 */}
            <div className="filter-row">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">全部狀態</option>
                    <option value="in_stock">在庫</option>
                    <option value="borrowed">借出中</option>
                    <option value="maintenance">維修中</option>
                </select>
            </div>

            {/* 資產列表 */}
            <div className="assets-list">
                {assets.map(asset => {
                    const statusConfig = STATUS_CONFIG[asset.status];
                    const overdue = isOverdue(asset);
                    return (
                        <Card key={asset.id} className="asset-card" padding="md">
                            <div className="asset-header">
                                <div className="asset-info">
                                    <span className="asset-no">{asset.assetNo}</span>
                                    <span className="asset-name">{asset.item?.name || '未知器材'}</span>
                                </div>
                                <div className="asset-badges">
                                    <Badge variant={asset.status === 'in_stock' ? 'success' : asset.status === 'borrowed' ? 'warning' : 'default'}>
                                        {statusConfig.icon} {statusConfig.label}
                                    </Badge>
                                    {overdue && <Badge variant="danger">⏰ 逾期</Badge>}
                                </div>
                            </div>

                            {asset.status === 'in_stock' && asset.location && (
                                <div className="asset-location">📍 {asset.location.fullPath}</div>
                            )}

                            {asset.status === 'borrowed' && (
                                <div className="borrow-info">
                                    <span>借用人：{asset.borrowerName}</span>
                                    {asset.borrowerOrg && <span>單位：{asset.borrowerOrg}</span>}
                                    <span>預計歸還：{asset.expectedReturnDate?.split('T')[0]}</span>
                                </div>
                            )}

                            {canManage && (
                                <div className="asset-actions">
                                    {asset.status === 'in_stock' && (
                                        <Button size="sm" onClick={() => openBorrow(asset)}>📤 借出</Button>
                                    )}
                                    {asset.status === 'borrowed' && (
                                        <Button size="sm" variant="secondary" onClick={() => openReturn(asset)}>📥 歸還</Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
                {assets.length === 0 && <div className="empty-state">無符合條件的資產</div>}
            </div>

            {/* 借出 Modal */}
            {showBorrowModal && selectedAsset && (
                <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>📤 借出資產</h3>
                        <p className="modal-subtitle">{selectedAsset.assetNo} - {selectedAsset.item?.name}</p>
                        <div className="form-group">
                            <label>借用人姓名 *</label>
                            <input value={borrowForm.borrowerName} onChange={e => setBorrowForm({ ...borrowForm, borrowerName: e.target.value })} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>借用單位</label>
                                <input value={borrowForm.borrowerOrg} onChange={e => setBorrowForm({ ...borrowForm, borrowerOrg: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>聯絡方式</label>
                                <input value={borrowForm.borrowerContact} onChange={e => setBorrowForm({ ...borrowForm, borrowerContact: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>借用用途</label>
                            <textarea value={borrowForm.purpose} onChange={e => setBorrowForm({ ...borrowForm, purpose: e.target.value })} rows={2} />
                        </div>
                        <div className="form-group">
                            <label>預計歸還日期 *</label>
                            <input type="date" value={borrowForm.expectedReturnDate} onChange={e => setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })} />
                        </div>
                        <div className="modal-actions">
                            <Button variant="ghost" onClick={() => setShowBorrowModal(false)}>取消</Button>
                            <Button onClick={handleBorrow} disabled={!borrowForm.borrowerName || !borrowForm.expectedReturnDate}>確認借出</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 歸還 Modal */}
            {showReturnModal && selectedAsset && (
                <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>📥 歸還資產</h3>
                        <p className="modal-subtitle">{selectedAsset.assetNo} - {selectedAsset.item?.name}</p>
                        <div className="form-group">
                            <label>歸還狀態 *</label>
                            <select value={returnForm.returnCondition} onChange={e => setReturnForm({ ...returnForm, returnCondition: e.target.value as any })}>
                                <option value="normal">正常</option>
                                <option value="damaged">輕微損壞</option>
                                <option value="missing_parts">缺件</option>
                                <option value="needs_repair">需維修</option>
                            </select>
                        </div>
                        {returnForm.returnCondition !== 'normal' && (
                            <div className="form-group">
                                <label>備註說明</label>
                                <textarea value={returnForm.conditionNote} onChange={e => setReturnForm({ ...returnForm, conditionNote: e.target.value })} rows={2} />
                            </div>
                        )}
                        <div className="form-group">
                            <label>放回儲位 ID *</label>
                            <input value={returnForm.toLocationId} onChange={e => setReturnForm({ ...returnForm, toLocationId: e.target.value })} placeholder="輸入儲位 ID 或掃碼" />
                        </div>
                        <div className="modal-actions">
                            <Button variant="ghost" onClick={() => setShowReturnModal(false)}>取消</Button>
                            <Button onClick={handleReturn} disabled={!returnForm.toLocationId}>確認歸還</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
