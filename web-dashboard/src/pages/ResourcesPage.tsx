import { useState } from 'react';
import { Card, Button, Badge } from '../design-system';

// 物資分類
const CATEGORY_CONFIG = {
    food: { label: '食品', icon: '🍚', color: '#FF9800' },
    water: { label: '飲水', icon: '💧', color: '#2196F3' },
    medical: { label: '醫療', icon: '🏥', color: '#F44336' },
    shelter: { label: '收容', icon: '🏠', color: '#4CAF50' },
    clothing: { label: '衣物', icon: '👕', color: '#9C27B0' },
    equipment: { label: '設備', icon: '🔧', color: '#607D8B' },
    other: { label: '其他', icon: '📦', color: '#795548' },
};

// 模擬物資資料
const MOCK_RESOURCES = [
    { id: '1', name: '礦泉水', category: 'water', quantity: 500, unit: '瓶', minQuantity: 100, status: 'available', location: '倉庫A' },
    { id: '2', name: '白米', category: 'food', quantity: 200, unit: '公斤', minQuantity: 50, status: 'available', location: '倉庫A' },
    { id: '3', name: '急救包', category: 'medical', quantity: 30, unit: '組', minQuantity: 20, status: 'available', location: '倉庫B' },
    { id: '4', name: '毛毯', category: 'shelter', quantity: 8, unit: '條', minQuantity: 20, status: 'low', location: '倉庫B' },
    { id: '5', name: '手電筒', category: 'equipment', quantity: 0, unit: '支', minQuantity: 10, status: 'depleted', location: '倉庫C' },
];

const STATUS_CONFIG = {
    available: { label: '充足', color: '#4CAF50' },
    low: { label: '不足', color: '#FF9800' },
    depleted: { label: '缺貨', color: '#F44336' },
};

type ResourceStatus = keyof typeof STATUS_CONFIG;
type ResourceCategory = keyof typeof CATEGORY_CONFIG;

export default function ResourcesPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState(false);

    // 篩選
    const filteredResources = selectedCategory
        ? MOCK_RESOURCES.filter(r => r.category === selectedCategory)
        : MOCK_RESOURCES;

    // 統計
    const stats = {
        total: MOCK_RESOURCES.length,
        available: MOCK_RESOURCES.filter(r => r.status === 'available').length,
        low: MOCK_RESOURCES.filter(r => r.status === 'low').length,
        depleted: MOCK_RESOURCES.filter(r => r.status === 'depleted').length,
    };

    return (
        <div className="page resources-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📦 物資管理</h2>
                    <p className="page-subtitle">庫存管理與調度</p>
                </div>
                <div className="page-header__right">
                    <Button onClick={() => setShowAddModal(true)}>
                        ➕ 新增物資
                    </Button>
                </div>
            </div>

            {/* 統計卡片 */}
            <div className="resources-stats">
                <Card className="stat-card" padding="md">
                    <div className="stat-card__value">{stats.total}</div>
                    <div className="stat-card__label">物資種類</div>
                </Card>
                <Card className="stat-card stat-card--success" padding="md">
                    <div className="stat-card__value">{stats.available}</div>
                    <div className="stat-card__label">充足</div>
                </Card>
                <Card className="stat-card stat-card--warning" padding="md">
                    <div className="stat-card__value">{stats.low}</div>
                    <div className="stat-card__label">不足</div>
                </Card>
                <Card className="stat-card stat-card--danger" padding="md">
                    <div className="stat-card__value">{stats.depleted}</div>
                    <div className="stat-card__label">缺貨</div>
                </Card>
            </div>

            {/* 分類篩選 */}
            <div className="resources-categories">
                <button
                    className={`category-btn ${selectedCategory === '' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('')}
                >
                    全部
                </button>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(key)}
                    >
                        {config.icon} {config.label}
                    </button>
                ))}
            </div>

            {/* 物資列表 */}
            <div className="resources-list">
                <table className="resources-table">
                    <thead>
                        <tr>
                            <th>物資名稱</th>
                            <th>分類</th>
                            <th>數量</th>
                            <th>狀態</th>
                            <th>位置</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredResources.map(resource => {
                            const category = CATEGORY_CONFIG[resource.category as ResourceCategory];
                            const status = STATUS_CONFIG[resource.status as ResourceStatus];
                            return (
                                <tr key={resource.id}>
                                    <td>
                                        <span className="resource-name">
                                            {category.icon} {resource.name}
                                        </span>
                                    </td>
                                    <td>{category.label}</td>
                                    <td>
                                        <strong>{resource.quantity}</strong> {resource.unit}
                                    </td>
                                    <td>
                                        <Badge
                                            variant={resource.status === 'available' ? 'success' :
                                                resource.status === 'low' ? 'warning' : 'danger'}
                                        >
                                            {status.label}
                                        </Badge>
                                    </td>
                                    <td>{resource.location}</td>
                                    <td>
                                        <div className="resource-actions">
                                            <Button variant="secondary" size="sm">入庫</Button>
                                            <Button variant="secondary" size="sm">出庫</Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 新增物資 Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <Card className="modal-content" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>新增物資</h3>
                        <p className="modal-desc">物資新增功能開發中...</p>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                                關閉
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
