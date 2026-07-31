/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../../design-system';
import './AuditTab.css';
import { API_BASE } from '../../api/config';

type AuditStatus = 'in_progress' | 'completed' | 'cancelled';

interface AuditItem {
    itemId: string;
    itemName: string;
    systemQty: number;
    actualQty: number;
    difference: number;
    notes?: string;
}

interface AuditAsset {
    assetId: string;
    assetNo: string;
    scanned: boolean;
    missingNote?: string;
}

interface InventoryAudit {
    id: string;
    type: 'consumable' | 'asset';
    status: AuditStatus;
    items?: string;
    assets?: string;
    auditorName: string;
    reviewerName?: string;
    gainCount?: number;
    lossCount?: number;
    notes?: string;
    createdAt: string;
    completedAt?: string;
}

interface AuditTabProps {
    canManage: boolean;
    userName: string;
}

const STATUS_CONFIG: Record<AuditStatus, { label: string; color: string }> = {
    in_progress: { label: '進行中', color: '#2196F3' },
    completed: { label: '已完成', color: '#4CAF50' },
    cancelled: { label: '已取消', color: '#9E9E9E' },
};

export default function AuditTab({ canManage, userName }: AuditTabProps) {
    const [audits, setAudits] = useState<InventoryAudit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedAudit, setSelectedAudit] = useState<InventoryAudit | null>(null);

    const fetchAudits = async () => {
        try {
            const res = await fetch(`${API_BASE}/audits${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`);
            const data = await res.json();
            setAudits(data.data || []);
        } catch (err) {
            console.error('Failed to fetch audits:', err);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchAudits().finally(() => setIsLoading(false));
    }, [filterStatus]);

    const parseItems = (itemsJson?: string): AuditItem[] => {
        try {
            return JSON.parse(itemsJson || '[]');
        } catch {
            return [];
        }
    };

    const parseAssets = (assetsJson?: string): AuditAsset[] => {
        try {
            return JSON.parse(assetsJson || '[]');
        } catch {
            return [];
        }
    };

    const handleStartConsumableAudit = async () => {
        try {
            await fetch(`${API_BASE}/audits/consumable`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auditorName: userName }),
            });
            await fetchAudits();
        } catch (err) {
            console.error('Failed to start audit:', err);
        }
    };

    const handleStartAssetAudit = async () => {
        try {
            await fetch(`${API_BASE}/audits/asset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auditorName: userName }),
            });
            await fetchAudits();
        } catch (err) {
            console.error('Failed to start audit:', err);
        }
    };

    const handleCompleteAudit = async (audit: InventoryAudit) => {
        const apply = window.confirm('是否套用差異調整庫存？');
        try {
            await fetch(`${API_BASE}/audits/${audit.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewerName: userName, applyDifference: apply }),
            });
            await fetchAudits();
            setSelectedAudit(null);
        } catch (err) {
            console.error('Failed to complete audit:', err);
        }
    };

    const handleCancelAudit = async (audit: InventoryAudit) => {
        if (!window.confirm('確定取消此盤點？')) return;
        try {
            await fetch(`${API_BASE}/audits/${audit.id}/cancel`, {
                method: 'PATCH',
            });
            await fetchAudits();
        } catch (err) {
            console.error('Failed to cancel audit:', err);
        }
    };

    if (isLoading) {
        return <div className="loading-state"><div className="spinner"></div><p>載入中...</p></div>;
    }

    return (
        <div className="audit-tab">
            {/* 操作列 */}
            <div className="action-row">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">全部狀態</option>
                    <option value="in_progress">進行中</option>
                    <option value="completed">已完成</option>
                </select>
                {canManage && (
                    <div className="action-buttons">
                        <Button size="sm" onClick={handleStartConsumableAudit}>📦 耗材盤點</Button>
                        <Button size="sm" variant="secondary" onClick={handleStartAssetAudit}>🔧 器材盤點</Button>
                    </div>
                )}
            </div>

            {/* 盤點列表 */}
            <div className="audits-list">
                {audits.map(audit => {
                    const statusConfig = STATUS_CONFIG[audit.status];
                    const items = parseItems(audit.items);
                    const assets = parseAssets(audit.assets);

                    return (
                        <Card key={audit.id} className="audit-card" padding="md" onClick={() => setSelectedAudit(audit)}>
                            <div className="audit-header">
                                <div className="audit-info">
                                    <span className="audit-type">{audit.type === 'consumable' ? '📦 耗材盤點' : '🔧 器材盤點'}</span>
                                    <span className="audit-date">{new Date(audit.createdAt).toLocaleString('zh-TW')}</span>
                                </div>
                                <Badge variant={audit.status === 'completed' ? 'success' : audit.status === 'in_progress' ? 'info' : 'default'}>
                                    {statusConfig.label}
                                </Badge>
                            </div>

                            <div className="audit-meta">
                                <span>盤點人：{audit.auditorName}</span>
                                {audit.reviewerName && <span>複核人：{audit.reviewerName}</span>}
                            </div>

                            {audit.status === 'completed' && (
                                <div className="audit-result">
                                    {audit.gainCount !== undefined && audit.gainCount > 0 && <span className="result-gain">+{audit.gainCount} 盤盈</span>}
                                    {audit.lossCount !== undefined && audit.lossCount > 0 && <span className="result-loss">-{audit.lossCount} 盤虧</span>}
                                    {(!audit.gainCount && !audit.lossCount) && <span className="result-ok">✅ 無差異</span>}
                                </div>
                            )}

                            {audit.status === 'in_progress' && (
                                <div className="audit-progress">
                                    {audit.type === 'consumable'
                                        ? `${items.filter(i => i.actualQty > 0).length}/${items.length} 項已盤`
                                        : `${assets.filter(a => a.scanned).length}/${assets.length} 件已掃`}
                                </div>
                            )}

                            {canManage && audit.status === 'in_progress' && (
                                <div className="audit-actions" onClick={e => e.stopPropagation()}>
                                    <Button size="sm" onClick={() => handleCompleteAudit(audit)}>✅ 完成盤點</Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleCancelAudit(audit)}>❌ 取消</Button>
                                </div>
                            )}
                        </Card>
                    );
                })}
                {audits.length === 0 && <div className="empty-state">暫無盤點紀錄</div>}
            </div>

            {/* 盤點詳情 Modal */}
            {selectedAudit && (
                <div className="modal-overlay" onClick={() => setSelectedAudit(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{selectedAudit.type === 'consumable' ? '📦 耗材盤點詳情' : '🔧 器材盤點詳情'}</h3>

                        {selectedAudit.type === 'consumable' ? (
                            <div className="items-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>品項</th>
                                            <th>系統</th>
                                            <th>實際</th>
                                            <th>差異</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parseItems(selectedAudit.items).map(item => (
                                            <tr key={item.itemId} className={item.difference !== 0 ? 'diff-row' : ''}>
                                                <td>{item.itemName}</td>
                                                <td>{item.systemQty}</td>
                                                <td>{item.actualQty || '-'}</td>
                                                <td className={item.difference > 0 ? 'diff-gain' : item.difference < 0 ? 'diff-loss' : ''}>
                                                    {item.difference > 0 ? '+' : ''}{item.difference || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="assets-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>資產編號</th>
                                            <th>狀態</th>
                                            <th>備註</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parseAssets(selectedAudit.assets).map(asset => (
                                            <tr key={asset.assetId} className={!asset.scanned ? 'missing-row' : ''}>
                                                <td>{asset.assetNo}</td>
                                                <td>{asset.scanned ? '✅ 已掃' : '❓ 未掃'}</td>
                                                <td>{asset.missingNote || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="modal-actions">
                            <Button variant="ghost" onClick={() => setSelectedAudit(null)}>關閉</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
