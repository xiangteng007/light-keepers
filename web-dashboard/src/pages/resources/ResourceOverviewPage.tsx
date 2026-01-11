/**
 * ResourceOverviewPage.tsx
 * 
 * Log Domain - 資源總覽頁面
 * 展示物資庫存、裝備狀態、分配追蹤
 */
import React, { useState } from 'react';
import {
    Package, AlertCircle, TrendingUp, TrendingDown, Warehouse,
    Truck, Shield, Search, Filter, Download
} from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import './ResourceOverviewPage.css';

const MOCK_RESOURCES = [
    { id: '1', name: '緊急醫療包', category: '醫療', stock: 450, allocated: 120, minStock: 100, unit: '箱', status: 'normal' },
    { id: '2', name: '飲用水 (20L)', category: '民生', stock: 2400, allocated: 800, minStock: 500, unit: '桶', status: 'normal' },
    { id: '3', name: '救難帳篷', category: '避難', stock: 35, allocated: 28, minStock: 50, unit: '頂', status: 'low' },
    { id: '4', name: '發電機 (5kW)', category: '裝備', stock: 12, allocated: 10, minStock: 15, unit: '台', status: 'critical' },
    { id: '5', name: '無線電設備', category: '通訊', stock: 85, allocated: 45, minStock: 30, unit: '台', status: 'normal' },
    { id: '6', name: '急救毛毯', category: '民生', stock: 1200, allocated: 600, minStock: 300, unit: '條', status: 'normal' },
];

const WAREHOUSES = [
    { id: 'w1', name: '中央物資中心', location: '台北市中正區', capacity: 85, items: 12500 },
    { id: 'w2', name: '北區救災站', location: '台北市士林區', capacity: 62, items: 4800 },
    { id: 'w3', name: '南區備援點', location: '台北市大安區', capacity: 45, items: 3200 },
];

type CategoryFilter = 'all' | '醫療' | '民生' | '避難' | '裝備' | '通訊';

export default function ResourceOverviewPage() {
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredResources = MOCK_RESOURCES.filter(res => {
        if (categoryFilter !== 'all' && res.category !== categoryFilter) return false;
        if (searchQuery && !res.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const stats = {
        totalItems: MOCK_RESOURCES.reduce((sum, r) => sum + r.stock, 0),
        allocated: MOCK_RESOURCES.reduce((sum, r) => sum + r.allocated, 0),
        lowStock: MOCK_RESOURCES.filter(r => r.status === 'low' || r.status === 'critical').length,
        categories: new Set(MOCK_RESOURCES.map(r => r.category)).size,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'normal': return <span className="status-badge normal">充足</span>;
            case 'low': return <span className="status-badge low">偏低</span>;
            case 'critical': return <span className="status-badge critical">緊急</span>;
            default: return null;
        }
    };

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
                            <span className="stat-value">{stats.totalItems.toLocaleString()}</span>
                            <span className="stat-label">總庫存量</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Truck className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{stats.allocated.toLocaleString()}</span>
                            <span className="stat-label">已調度</span>
                        </div>
                    </div>
                    <div className="stat-card warning">
                        <AlertCircle className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{stats.lowStock}</span>
                            <span className="stat-label">低庫存項目</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Shield className="stat-icon" />
                        <div className="stat-content">
                            <span className="stat-value">{stats.categories}</span>
                            <span className="stat-label">物資類別</span>
                        </div>
                    </div>
                </div>

                {/* Warehouses */}
                <div className="warehouses-section">
                    <h3><Warehouse size={18} /> 倉儲據點</h3>
                    <div className="warehouse-cards">
                        {WAREHOUSES.map(wh => (
                            <div key={wh.id} className="warehouse-card">
                                <div className="wh-header">
                                    <span className="wh-name">{wh.name}</span>
                                    <span className="wh-location">{wh.location}</span>
                                </div>
                                <div className="wh-capacity">
                                    <div className="capacity-bar">
                                        <div
                                            className={`capacity-fill ${wh.capacity > 80 ? 'high' : wh.capacity > 50 ? 'medium' : 'low'}`}
                                            style={{ width: `${wh.capacity}%` }}
                                        />
                                    </div>
                                    <span className="capacity-text">{wh.capacity}% 使用率</span>
                                </div>
                                <div className="wh-items">{wh.items.toLocaleString()} 件物資</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category Filter */}
                <div className="resource-toolbar">
                    <div className="category-tabs">
                        {(['all', '醫療', '民生', '避難', '裝備', '通訊'] as const).map(cat => (
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
                        <button className="btn-export">
                            <Download size={16} />
                            匯出
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
                                <th>已調度</th>
                                <th>可用量</th>
                                <th>狀態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResources.map(res => (
                                <tr key={res.id}>
                                    <td className="name-cell">{res.name}</td>
                                    <td><span className="category-tag">{res.category}</span></td>
                                    <td>{res.stock.toLocaleString()} {res.unit}</td>
                                    <td>{res.allocated.toLocaleString()} {res.unit}</td>
                                    <td className={res.stock - res.allocated < res.minStock ? 'warning' : ''}>
                                        {(res.stock - res.allocated).toLocaleString()} {res.unit}
                                    </td>
                                    <td>{getStatusBadge(res.status)}</td>
                                    <td>
                                        <button className="btn-action">調度</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageTemplate>
    );
}
