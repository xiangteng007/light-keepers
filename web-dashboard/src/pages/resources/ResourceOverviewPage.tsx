/**
 * ResourceOverviewPage.tsx
 *
 * B4: 後勤資源總覽儀表板
 * 展示物資庫存、裝備狀態 — 真實 API 整合
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Package, AlertCircle, Truck, Shield, Search, Download,
} from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import './ResourceOverviewPage.css';

interface Resource {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minQuantity: number;
    location: string;
    status: 'available' | 'low' | 'depleted';
}

interface ResourceStats {
    total: number;
    byCategory: Record<string, number>;
    lowStock: number;
    expiringSoon: number;
}

interface EquipmentStats {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    lowBattery: number;
    maintenanceDue: number;
}

export default function ResourceOverviewPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [resourceStats, setResourceStats] = useState<ResourceStats | null>(null);
    const [eqStats, setEqStats] = useState<EquipmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [resRes, statsRes, eqStatsRes] = await Promise.all([
                api.get('/resources'),
                api.get('/resources/stats'),
                api.get('/equipment/stats'),
            ]);
            setResources(resRes.data?.data || []);
            setResourceStats(statsRes.data?.data || null);
            setEqStats(eqStatsRes.data || null);
        } catch (err: any) {
            console.error('Failed to fetch overview:', err);
            setError(getApiErrorMessage(err, '無法載入資料'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredResources = resources.filter(res => {
        if (categoryFilter !== 'all' && res.category !== categoryFilter) return false;
        if (searchQuery && !res.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const categories = ['all', ...new Set(resources.map(r => r.category))];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available': return <span className="status-badge normal">充足</span>;
            case 'low': return <span className="status-badge low">偏低</span>;
            case 'depleted': return <span className="status-badge critical">耗盡</span>;
            default: return null;
        }
    };

    if (loading) {
        return (
            <PageTemplate title="資源總覽" subtitle="載入中..." icon={Package} domain="Log 後勤資源">
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                </div>
            </PageTemplate>
        );
    }

    if (error) {
        return (
            <PageTemplate title="資源總覽" subtitle="載入失敗" icon={Package} domain="Log 後勤資源">
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                    <p className="font-medium">載入失敗</p>
                    <p className="text-sm mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">重試</button>
                </div>
            </PageTemplate>
        );
    }

    return (
        <PageTemplate
            title="資源總覽"
            subtitle="物資庫存管理與調度追蹤"
            icon={Package}
            domain="Log 後勤資源"
        >
            <div className="resource-overview">
                {/* Summary Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <Package className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{resourceStats?.total ?? resources.length}</span>
                            <span className="stat-label">物資品項</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Truck className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{eqStats?.total ?? 0}</span>
                            <span className="stat-label">裝備總數</span>
                        </div>
                    </div>
                    <div className="stat-card warning">
                        <AlertCircle className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{resourceStats?.lowStock ?? 0}</span>
                            <span className="stat-label">低庫存項目</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Shield className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{Object.keys(resourceStats?.byCategory ?? {}).length}</span>
                            <span className="stat-label">物資類別</span>
                        </div>
                    </div>
                </div>

                {/* Equipment Quick Stats */}
                {eqStats && (
                    <div className="warehouses-section">
                        <h3>⚙️ 裝備概況</h3>
                        <div className="warehouse-cards">
                            <div className="warehouse-card">
                                <div className="wh-header">
                                    <span className="wh-name">可用設備</span>
                                </div>
                                <div className="wh-items" style={{ color: '#4ade80' }}>{eqStats.available} 件</div>
                            </div>
                            <div className="warehouse-card">
                                <div className="wh-header">
                                    <span className="wh-name">使用中</span>
                                </div>
                                <div className="wh-items" style={{ color: '#60a5fa' }}>{eqStats.inUse} 件</div>
                            </div>
                            <div className="warehouse-card">
                                <div className="wh-header">
                                    <span className="wh-name">維護/低電量</span>
                                </div>
                                <div className="wh-items" style={{ color: '#fbbf24' }}>{eqStats.maintenance + eqStats.lowBattery} 件</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Filter & Search */}
                <div className="resource-toolbar">
                    <div className="category-tabs">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`tab ${categoryFilter === cat ? 'active' : ''}`}
                                onClick={() => setCategoryFilter(cat)}
                            >
                                {cat === 'all' ? '全部' : cat}
                            </button>
                        ))}
                    </div>
                    <div className="toolbar-right">
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                placeholder="搜尋物資..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn-export" onClick={fetchData}>
                            <Download size={16} />
                            重新整理
                        </button>
                    </div>
                </div>

                {/* Resource Table */}
                <div className="resource-table">
                    <table>
                        <thead>
                            <tr>
                                <th>物資名稱</th>
                                <th>類別</th>
                                <th>現有庫存</th>
                                <th>安全庫存</th>
                                <th>存放位置</th>
                                <th>狀態</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResources.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                                        {searchQuery ? '查無結果' : '尚無物資資料'}
                                    </td>
                                </tr>
                            ) : (
                                filteredResources.map(res => (
                                    <tr key={res.id}>
                                        <td className="name-cell">{res.name}</td>
                                        <td><span className="category-tag">{res.category}</span></td>
                                        <td>{res.quantity.toLocaleString()} {res.unit || '個'}</td>
                                        <td>{res.minQuantity.toLocaleString()} {res.unit || '個'}</td>
                                        <td>{res.location || '—'}</td>
                                        <td>{getStatusBadge(res.status)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageTemplate>
    );
}
