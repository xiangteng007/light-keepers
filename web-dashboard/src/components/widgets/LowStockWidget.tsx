/**
 * 低庫存告警 Widget
 * 顯示需要補貨的物資清單
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Badge } from '../../design-system';

// VITE_API_URL 不含 /api/v1，需要手動加上
const API_BASE = `${import.meta.env.VITE_API_URL || 'https://light-keepers-api-bsf4y44tja-de.a.run.app'}/api/v1`;

interface LowStockResource {
    id: string;
    name: string;
    category: string;
    quantity: number;
    minQuantity: number;
    unit: string;
    status: 'low' | 'depleted';
    location?: string;
}

interface ExpiringResource {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    expiresAt: string;
    location?: string;
}

async function getLowStockResources(): Promise<LowStockResource[]> {
    try {
        const response = await fetch(`${API_BASE}/resources/low-stock`);
        const data = await response.json();
        return data.data || [];
    } catch {
        return [];
    }
}

async function getExpiringResources(days: number = 30): Promise<ExpiringResource[]> {
    try {
        const response = await fetch(`${API_BASE}/resources/expiring?days=${days}`);
        const data = await response.json();
        return data.data || [];
    } catch {
        return [];
    }
}

function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
        food: '🍚',
        water: '💧',
        medical: '💊',
        shelter: '🏠',
        clothing: '👕',
        equipment: '🔧',
        other: '📦',
    };
    return icons[category] || '📦';
}


function formatDaysRemaining(expiresAt: string): { text: string; urgent: boolean } {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: `已過期 ${Math.abs(diffDays)} 天`, urgent: true };
    } else if (diffDays === 0) {
        return { text: '今日到期', urgent: true };
    } else if (diffDays <= 7) {
        return { text: `${diffDays} 天後到期`, urgent: true };
    } else {
        return { text: `${diffDays} 天後到期`, urgent: false };
    }
}

export function LowStockWidget() {
    const { data: lowStockItems, isLoading: loadingLow } = useQuery({
        queryKey: ['lowStockResources'],
        queryFn: getLowStockResources,
        refetchInterval: 300000, // 5 分鐘刷新一次
    });

    const { data: expiringItems, isLoading: loadingExpiring } = useQuery({
        queryKey: ['expiringResources'],
        queryFn: () => getExpiringResources(30),
        refetchInterval: 300000,
    });

    const isLoading = loadingLow || loadingExpiring;

    // 合併並排序告警
    const allAlerts: {
        id: string;
        type: 'low' | 'depleted' | 'expiring';
        name: string;
        category: string;
        detail: string;
        priority: number;
    }[] = [];

    // 低庫存告警
    lowStockItems?.forEach((item) => {
        allAlerts.push({
            id: `low-${item.id}`,
            type: item.status === 'depleted' ? 'depleted' : 'low',
            name: item.name,
            category: item.category,
            detail: item.status === 'depleted'
                ? '已耗盡'
                : `剩餘 ${item.quantity} ${item.unit} (安全庫存: ${item.minQuantity})`,
            priority: item.status === 'depleted' ? 3 : 2,
        });
    });

    // 即期品告警
    expiringItems?.forEach((item) => {
        const { text, urgent } = formatDaysRemaining(item.expiresAt);
        allAlerts.push({
            id: `exp-${item.id}`,
            type: 'expiring',
            name: item.name,
            category: item.category,
            detail: `${text} (${item.quantity} ${item.unit})`,
            priority: urgent ? 2 : 1,
        });
    });

    // 按優先級排序
    allAlerts.sort((a, b) => b.priority - a.priority);

    // 限制顯示數量
    const displayAlerts = allAlerts.slice(0, 8);

    return (
        <Card title="庫存告警" icon="⚠️" padding="md">
            <div className="stock-alert-list">
                {isLoading && <div className="loading">載入中...</div>}

                {!isLoading && displayAlerts.length === 0 && (
                    <div className="empty-state-mini">
                        <span className="empty-icon">✅</span>
                        <span>物資庫存充足</span>
                    </div>
                )}

                {!isLoading && displayAlerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`stock-alert-item stock-alert-item--${alert.type}`}
                    >
                        <div className="stock-alert-item__header">
                            <span className="stock-alert-item__icon">
                                {getCategoryIcon(alert.category)}
                            </span>
                            <span className="stock-alert-item__name">{alert.name}</span>
                            <Badge
                                variant={alert.type === 'depleted' ? 'danger' : alert.type === 'low' ? 'warning' : 'info'}
                                size="sm"
                            >
                                {alert.type === 'depleted' ? '已耗盡' : alert.type === 'low' ? '低庫存' : '即期'}
                            </Badge>
                        </div>
                        <div className="stock-alert-item__detail">{alert.detail}</div>
                    </div>
                ))}
            </div>

            {allAlerts.length > 8 && (
                <div className="more-alerts-hint">
                    還有 {allAlerts.length - 8} 個告警
                </div>
            )}

            <Link to="/resources" className="view-more-link">
                前往物資管理 →
            </Link>

            <style>{`
                .stock-alert-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .stock-alert-item {
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    background: var(--color-surface-2);
                    border-left: 3px solid transparent;
                }

                .stock-alert-item--depleted {
                    border-left-color: var(--color-danger);
                    background: rgba(239, 68, 68, 0.08);
                }

                .stock-alert-item--low {
                    border-left-color: var(--color-warning);
                    background: rgba(245, 158, 11, 0.08);
                }

                .stock-alert-item--expiring {
                    border-left-color: var(--color-info);
                    background: rgba(59, 130, 246, 0.08);
                }

                .stock-alert-item__header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.25rem;
                }

                .stock-alert-item__icon {
                    font-size: 1.1rem;
                }

                .stock-alert-item__name {
                    flex: 1;
                    font-weight: 500;
                    color: var(--color-text-primary);
                }

                .stock-alert-item__detail {
                    font-size: 0.85rem;
                    color: var(--color-text-secondary);
                    padding-left: 1.6rem;
                }

                .more-alerts-hint {
                    text-align: center;
                    font-size: 0.85rem;
                    color: var(--color-text-tertiary);
                    padding: 0.5rem;
                    border-top: 1px solid var(--color-border);
                }
            `}</style>
        </Card>
    );
}

export default LowStockWidget;
