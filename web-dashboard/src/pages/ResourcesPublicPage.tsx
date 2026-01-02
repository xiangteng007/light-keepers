import { useState, useEffect } from 'react';
import { Card, Badge } from '../design-system';
import './ResourcesPublicPage.css';

// API 基礎 URL - VITE_API_URL 不含 /api/v1，需要手動加上
const API_BASE = `${import.meta.env.VITE_API_URL || 'https://light-keepers-api-bsf4y44tja-de.a.run.app'}/api/v1`;

// 物資分類配置
const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    food: { label: '食品', icon: '🍚', color: '#FF9800' },
    water: { label: '飲水', icon: '💧', color: '#2196F3' },
    medical: { label: '醫療', icon: '🏥', color: '#F44336' },
    shelter: { label: '收容', icon: '🏠', color: '#4CAF50' },
    clothing: { label: '衣物', icon: '👕', color: '#9C27B0' },
    equipment: { label: '設備', icon: '🔧', color: '#607D8B' },
    other: { label: '其他', icon: '📦', color: '#795548' },
};

interface Resource {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    status: string;
    location?: string;
    minQuantity: number;
    expiresAt?: string;
    updatedAt: string;
}

interface Asset {
    id: string;
    assetNo: string;
    status: string;
    item?: {
        name: string;
        category: string;
    };
    location?: {
        fullPath: string;
    };
}

export default function ResourcesPublicPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());


    // 載入資料
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [resourcesRes, assetsRes] = await Promise.all([
                fetch(`${API_BASE}/resources`).then(r => r.json()),
                fetch(`${API_BASE}/assets/public/list`).then(r => r.json()),
            ]);
            setResources(resourcesRes.data || []);
            setAssets(assetsRes.data || []);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('載入資料失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 篩選邏輯
    const filteredResources = resources.filter(r => {
        // 搜尋條件
        const matchSearch = searchQuery === '' ||
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            CATEGORY_CONFIG[r.category]?.label.includes(searchQuery);

        // 篩選條件
        let matchFilter = true;
        if (activeFilter === 'low') {
            matchFilter = r.status === 'low' || r.status === 'depleted';
        } else if (activeFilter === 'expiring') {
            if (r.expiresAt) {
                const daysUntilExpiry = Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                matchFilter = daysUntilExpiry <= 30;
            } else {
                matchFilter = false;
            }
        } else if (activeFilter === 'equipment') {
            matchFilter = r.category === 'equipment';
        } else if (activeFilter === 'consumable') {
            matchFilter = r.category !== 'equipment';
        }

        return matchSearch && matchFilter;
    });

    // 切換展開
    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    // 判斷是否即期
    const isExpiring = (expiresAt?: string): boolean => {
        if (!expiresAt) return false;
        const daysUntilExpiry = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30;
    };

    // 格式化更新時間
    const formatLastUpdated = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '剛剛';
        if (diffMins < 60) return `${diffMins} 分鐘前`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} 小時前`;
        return date.toLocaleDateString('zh-TW');
    };

    // 掃碼處理 (只讀，導向查詢)
    const handleScan = () => {
        // 使用原生 input 觸發相機
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // 這裡可以使用 jsQR 或其他 QR 解碼庫
                // 目前先顯示提示
                alert('掃碼功能開發中，請使用搜尋功能查詢物資');
            }
        };
        input.click();
    };

    // 資產狀態統計
    const assetStats = {
        inStock: assets.filter(a => a.status === 'in_stock').length,
        borrowed: assets.filter(a => a.status === 'borrowed').length,
    };

    return (
        <div className="page resources-public-page">
            {/* 頁面標題 */}
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📦 物資查詢</h2>
                    <p className="page-subtitle">查看庫存與儲位資訊</p>
                </div>
                <div className="page-header__right">
                    <button className="scan-btn" onClick={handleScan} aria-label="掃碼查詢">
                        📷 掃碼
                    </button>
                </div>
            </div>

            {/* 搜尋列 */}
            <div className="search-bar">
                <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 搜尋品項名稱..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* 篩選 Chips */}
            <div className="filter-chips">
                <button
                    className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    全部
                </button>
                <button
                    className={`filter-chip filter-chip--warning ${activeFilter === 'low' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('low')}
                >
                    ⚠️ 低庫存
                </button>
                <button
                    className={`filter-chip filter-chip--danger ${activeFilter === 'expiring' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('expiring')}
                >
                    ⏰ 即期品
                </button>
                <button
                    className={`filter-chip ${activeFilter === 'equipment' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('equipment')}
                >
                    🔧 器材
                </button>
                <button
                    className={`filter-chip ${activeFilter === 'consumable' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('consumable')}
                >
                    📦 耗材
                </button>
            </div>

            {/* 載入/錯誤狀態 */}
            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>載入物資資料中...</p>
                </div>
            ) : error ? (
                <div className="error-state">
                    <p>⚠️ {error}</p>
                    <button onClick={fetchData}>重試</button>
                </div>
            ) : (
                <>
                    {/* 物資列表 */}
                    <div className="resources-list">
                        {filteredResources.length === 0 ? (
                            <div className="empty-state">
                                <p>📦 無符合條件的物資</p>
                            </div>
                        ) : (
                            filteredResources.map(resource => {
                                const category = CATEGORY_CONFIG[resource.category] || CATEGORY_CONFIG.other;
                                const isLow = resource.status === 'low' || resource.status === 'depleted';
                                const expiring = isExpiring(resource.expiresAt);
                                const isExpanded = expandedItems.has(resource.id);

                                return (
                                    <Card
                                        key={resource.id}
                                        className={`resource-card ${isExpanded ? 'expanded' : ''}`}
                                        padding="md"
                                        onClick={() => toggleExpand(resource.id)}
                                    >
                                        <div className="resource-card__header">
                                            <div className="resource-card__info">
                                                <span className="resource-icon">{category.icon}</span>
                                                <div className="resource-details">
                                                    <h4 className="resource-name">{resource.name}</h4>
                                                    <span className="resource-category">{category.label}</span>
                                                </div>
                                            </div>
                                            <div className="resource-card__badges">
                                                {isLow && <Badge variant="warning">⚠️ 低庫存</Badge>}
                                                {expiring && <Badge variant="danger">⏰ 即期</Badge>}
                                            </div>
                                        </div>

                                        <div className="resource-card__summary">
                                            <span className="quantity">
                                                總量：<strong>{resource.quantity}</strong> {resource.unit}
                                            </span>
                                            <span className="update-time">
                                                更新：{formatLastUpdated(new Date(resource.updatedAt))}
                                            </span>
                                        </div>

                                        <div className="resource-card__expand-hint">
                                            {isExpanded ? '▲ 收合' : '▼ 點擊查看儲位'}
                                        </div>

                                        {/* 展開的儲位詳情 */}
                                        {isExpanded && (
                                            <div className="resource-card__locations">
                                                <div className="location-header">儲位分布</div>
                                                {resource.location ? (
                                                    <div className="location-item">
                                                        <span className="location-path">📍 {resource.location}</span>
                                                        <span className="location-qty">{resource.quantity} {resource.unit}</span>
                                                    </div>
                                                ) : (
                                                    <div className="location-item location-item--empty">
                                                        <span>暫無儲位資訊</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })
                        )}
                    </div>

                    {/* 器材區塊 */}
                    {(activeFilter === 'all' || activeFilter === 'equipment') && assets.length > 0 && (
                        <div className="assets-section">
                            <h3 className="section-title">🔧 器材狀態</h3>
                            <div className="asset-stats">
                                <div className="asset-stat">
                                    <span className="stat-value">{assetStats.inStock}</span>
                                    <span className="stat-label">在庫</span>
                                </div>
                                <div className="asset-stat asset-stat--borrowed">
                                    <span className="stat-value">{assetStats.borrowed}</span>
                                    <span className="stat-label">借出中</span>
                                </div>
                            </div>
                            <div className="assets-list">
                                {assets.slice(0, 10).map(asset => (
                                    <div key={asset.id} className="asset-item">
                                        <div className="asset-info">
                                            <span className="asset-no">{asset.assetNo}</span>
                                            <span className="asset-name">{asset.item?.name || '未知器材'}</span>
                                        </div>
                                        <Badge variant={asset.status === 'in_stock' ? 'success' : 'warning'}>
                                            {asset.status === 'in_stock' ? '在庫' : '借出中'}
                                        </Badge>
                                        {asset.status === 'in_stock' && asset.location && (
                                            <span className="asset-location">📍 {asset.location.fullPath}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="assets-note">ⓘ 如需借用請聯繫倉管人員</p>
                        </div>
                    )}
                </>
            )}

            {/* 底部更新資訊 */}
            <div className="page-footer">
                <span className="last-updated">
                    最後更新：{lastUpdated ? formatLastUpdated(lastUpdated) : '-'}
                </span>
                <button className="refresh-btn" onClick={fetchData} disabled={isLoading}>
                    🔄 重新整理
                </button>
            </div>
        </div>
    );
}
