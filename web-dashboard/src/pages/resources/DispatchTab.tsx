import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../../design-system';
import './DispatchTab.css';

// VITE_API_URL 不含 /api/v1，需要手動加上
const API_BASE = `${import.meta.env.VITE_API_URL || 'https://light-keepers-api-bsf4y44tja-de.a.run.app'}/api/v1`;

type DispatchStatus = 'pending' | 'approved' | 'rejected' | 'picking' | 'delivering' | 'completed' | 'cancelled';

interface DispatchItem {
    itemId: string;
    itemName: string;
    quantity: number;
    pickedQuantity?: number;
}

interface DispatchOrder {
    id: string;
    orderNo: string;
    status: DispatchStatus;
    priority: string;
    destination: string;
    contactName?: string;
    contactPhone?: string;
    items: string;
    requesterName: string;
    approverName?: string;
    pickerName?: string;
    notes?: string;
    rejectReason?: string;
    createdAt: string;
    approvedAt?: string;
    pickedAt?: string;
    deliveredAt?: string;
}

interface DispatchTabProps {
    canManage: boolean;
    userName: string;
}

const STATUS_CONFIG: Record<DispatchStatus, { label: string; color: string }> = {
    pending: { label: '待審核', color: '#FF9800' },
    approved: { label: '已審核', color: '#2196F3' },
    rejected: { label: '已駁回', color: '#F44336' },
    picking: { label: '配貨中', color: '#9C27B0' },
    delivering: { label: '配送中', color: '#00BCD4' },
    completed: { label: '已完成', color: '#4CAF50' },
    cancelled: { label: '已取消', color: '#9E9E9E' },
};

export default function DispatchTab({ canManage, userName }: DispatchTabProps) {
    const [orders, setOrders] = useState<DispatchOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });

    const fetchOrders = async () => {
        try {
            const [ordersRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/dispatch${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`).then(r => r.json()),
                fetch(`${API_BASE}/dispatch/stats`).then(r => r.json()),
            ]);
            setOrders(ordersRes.data || []);
            setStats(statsRes.data || { pending: 0, inProgress: 0, completed: 0 });
        } catch (err) {
            console.error('Failed to fetch dispatch orders:', err);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchOrders().finally(() => setIsLoading(false));
    }, [filterStatus]);

    const parseItems = (itemsJson: string): DispatchItem[] => {
        try {
            return JSON.parse(itemsJson || '[]');
        } catch {
            return [];
        }
    };

    const handleApprove = async (order: DispatchOrder) => {
        try {
            await fetch(`${API_BASE}/dispatch/${order.id}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approverName: userName }),
            });
            await fetchOrders();
        } catch (err) {
            console.error('Failed to approve:', err);
        }
    };

    const handleReject = async (order: DispatchOrder) => {
        const reason = window.prompt('請輸入駁回原因');
        if (!reason) return;
        try {
            await fetch(`${API_BASE}/dispatch/${order.id}/reject`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, approverName: userName }),
            });
            await fetchOrders();
        } catch (err) {
            console.error('Failed to reject:', err);
        }
    };

    const handleStartPicking = async (order: DispatchOrder) => {
        try {
            await fetch(`${API_BASE}/dispatch/${order.id}/start-picking`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickerName: userName }),
            });
            await fetchOrders();
        } catch (err) {
            console.error('Failed to start picking:', err);
        }
    };

    const handleComplete = async (order: DispatchOrder) => {
        try {
            await fetch(`${API_BASE}/dispatch/${order.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
            });
            await fetchOrders();
        } catch (err) {
            console.error('Failed to complete:', err);
        }
    };

    if (isLoading) {
        return <div className="loading-state"><div className="spinner"></div><p>載入中...</p></div>;
    }

    return (
        <div className="dispatch-tab">
            {/* 統計卡 */}
            <div className="stats-row">
                <div className="stat-card stat--warning">
                    <span className="stat-value">{stats.pending}</span>
                    <span className="stat-label">待審核</span>
                </div>
                <div className="stat-card stat--info">
                    <span className="stat-value">{stats.inProgress}</span>
                    <span className="stat-label">進行中</span>
                </div>
                <div className="stat-card stat--success">
                    <span className="stat-value">{stats.completed}</span>
                    <span className="stat-label">已完成</span>
                </div>
            </div>

            {/* 篩選 */}
            <div className="filter-row">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">全部狀態</option>
                    <option value="pending">待審核</option>
                    <option value="approved">已審核</option>
                    <option value="picking">配貨中</option>
                    <option value="delivering">配送中</option>
                    <option value="completed">已完成</option>
                </select>
                {canManage && (
                    <Button size="sm" onClick={() => alert('建立調度單功能開發中')}>+ 建立調度單</Button>
                )}
            </div>

            {/* 調度單列表 */}
            <div className="orders-list">
                {orders.map(order => {
                    const statusConfig = STATUS_CONFIG[order.status];
                    const items = parseItems(order.items);
                    return (
                        <Card key={order.id} className="order-card" padding="md">
                            <div className="order-header">
                                <div className="order-info">
                                    <span className="order-no">{order.orderNo}</span>
                                    <span className="order-date">{new Date(order.createdAt).toLocaleString('zh-TW')}</span>
                                </div>
                                <Badge variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'default'}>
                                    {statusConfig.label}
                                </Badge>
                            </div>

                            <div className="order-destination">
                                📍 {order.destination}
                                {order.contactName && <span> ({order.contactName})</span>}
                            </div>

                            <div className="order-items">
                                {items.slice(0, 3).map((item, idx) => (
                                    <span key={idx} className="item-badge">{item.itemName} x{item.quantity}</span>
                                ))}
                                {items.length > 3 && <span className="item-more">+{items.length - 3} 項</span>}
                            </div>

                            <div className="order-meta">
                                <span>需求人：{order.requesterName}</span>
                                {order.approverName && <span>審核人：{order.approverName}</span>}
                            </div>

                            {canManage && (
                                <div className="order-actions">
                                    {order.status === 'pending' && (
                                        <>
                                            <Button size="sm" onClick={() => handleApprove(order)}>✅ 審核通過</Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleReject(order)}>❌ 駁回</Button>
                                        </>
                                    )}
                                    {order.status === 'approved' && (
                                        <Button size="sm" onClick={() => handleStartPicking(order)}>📦 開始配貨</Button>
                                    )}
                                    {order.status === 'delivering' && (
                                        <Button size="sm" onClick={() => handleComplete(order)}>🎉 確認送達</Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
                {orders.length === 0 && <div className="empty-state">暫無調度單</div>}
            </div>
        </div>
    );
}
