import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../design-system';
import { getResources, getResourceStats } from '../api/services';
import type { Resource, ResourceCategory } from '../api/services';

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

const STATUS_CONFIG = {
    available: { label: '充足', color: '#4CAF50' },
    low: { label: '不足', color: '#FF9800' },
    depleted: { label: '缺貨', color: '#F44336' },
};

type ResourceStatus = keyof typeof STATUS_CONFIG;

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        byCategory: {} as Record<string, number>,
        lowStock: 0,
        expiringSoon: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [stockModal, setStockModal] = useState<{
        resource: Resource | null;
        type: 'add' | 'deduct';
        quantity: number;
        notes: string;
    } | null>(null);
    const [resourceForm, setResourceForm] = useState({
        name: '',
        category: 'food' as ResourceCategory,
        quantity: 0,
        unit: '件',
        minQuantity: 10,
        location: '',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 載入資源資料
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [resourcesRes, statsRes] = await Promise.all([
                    getResources({ category: selectedCategory as ResourceCategory || undefined }),
                    getResourceStats(),
                ]);
                setResources(resourcesRes.data);
                setStats(statsRes.data);
            } catch (err) {
                console.error('Failed to fetch resources:', err);
                setError('載入物資資料失敗');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedCategory]);

    // 篩選 (已由 API 處理，這裡保留以防前端需要)
    const filteredResources = resources;

    // 新增物資
    const handleAddResource = async () => {
        if (!resourceForm.name || resourceForm.quantity <= 0) {
            alert('請填寫物資名稱和數量');
            return;
        }
        setIsSubmitting(true);
        try {
            await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resourceForm),
            });
            setShowAddModal(false);
            setResourceForm({ name: '', category: 'food', quantity: 0, unit: '件', minQuantity: 10, location: '', description: '' });
            window.location.reload();
        } catch (err) {
            console.error('Failed to add resource:', err);
            alert('新增失敗');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 入庫/出庫
    const handleStockChange = async () => {
        if (!stockModal?.resource || stockModal.quantity <= 0) {
            alert('請輸入數量');
            return;
        }
        setIsSubmitting(true);
        try {
            const endpoint = stockModal.type === 'add' ? 'add' : 'deduct';
            await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/resources/${stockModal.resource.id}/${endpoint}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: stockModal.quantity, operatorName: 'Admin', notes: stockModal.notes }),
            });
            setStockModal(null);
            window.location.reload();
        } catch (err) {
            console.error('Failed to update stock:', err);
            alert('操作失敗');
        } finally {
            setIsSubmitting(false);
        }
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
                    <div className="stat-card__value">{resources.filter(r => r.status === 'available').length}</div>
                    <div className="stat-card__label">充足</div>
                </Card>
                <Card className="stat-card stat-card--warning" padding="md">
                    <div className="stat-card__value">{stats.lowStock}</div>
                    <div className="stat-card__label">低庫存</div>
                </Card>
                <Card className="stat-card stat-card--danger" padding="md">
                    <div className="stat-card__value">{stats.expiringSoon}</div>
                    <div className="stat-card__label">即期</div>
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
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                    ⏳ 載入物資資料中...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#F44336' }}>
                                    ⚠️ {error}
                                </td>
                            </tr>
                        ) : filteredResources.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                    📦 尚無物資資料
                                </td>
                            </tr>
                        ) : (
                            filteredResources.map(resource => {
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
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setStockModal({ resource, type: 'add', quantity: 0, notes: '' })}
                                                >
                                                    入庫
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setStockModal({ resource, type: 'deduct', quantity: 0, notes: '' })}
                                                >
                                                    出庫
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 新增物資 Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>➕ 新增物資</h3>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">物資名稱 *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="請輸入物資名稱"
                                    value={resourceForm.name}
                                    onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })}
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">分類</label>
                                <select
                                    className="form-input"
                                    value={resourceForm.category}
                                    onChange={e => setResourceForm({ ...resourceForm, category: e.target.value as ResourceCategory })}
                                >
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.icon} {config.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">數量 *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    value={resourceForm.quantity}
                                    onChange={e => setResourceForm({ ...resourceForm, quantity: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">單位</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="件、箱、瓶..."
                                    value={resourceForm.unit}
                                    onChange={e => setResourceForm({ ...resourceForm, unit: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">最低庫存警示</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    value={resourceForm.minQuantity}
                                    onChange={e => setResourceForm({ ...resourceForm, minQuantity: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">存放位置</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="倉庫A-1"
                                    value={resourceForm.location}
                                    onChange={e => setResourceForm({ ...resourceForm, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">說明</label>
                            <textarea
                                className="form-textarea"
                                placeholder="物資說明或備註..."
                                value={resourceForm.description}
                                onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                                取消
                            </Button>
                            <Button onClick={handleAddResource} disabled={isSubmitting}>
                                {isSubmitting ? '新增中...' : '✅ 確認新增'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* 入庫/出庫 Modal */}
            {stockModal && stockModal.resource && (
                <div className="modal-overlay" onClick={() => setStockModal(null)}>
                    <Card className="modal-content" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>{stockModal.type === 'add' ? '📥 入庫' : '📤 出庫'} - {stockModal.resource.name}</h3>
                        <p className="modal-desc">
                            目前數量：<strong>{stockModal.resource.quantity}</strong> {stockModal.resource.unit}
                        </p>

                        <div className="form-section">
                            <label className="form-label">{stockModal.type === 'add' ? '入庫' : '出庫'}數量 *</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                value={stockModal.quantity || ''}
                                onChange={e => setStockModal({ ...stockModal, quantity: Number(e.target.value) })}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">備註</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="操作說明..."
                                value={stockModal.notes}
                                onChange={e => setStockModal({ ...stockModal, notes: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setStockModal(null)}>
                                取消
                            </Button>
                            <Button onClick={handleStockChange} disabled={isSubmitting}>
                                {isSubmitting ? '處理中...' : '✅ 確認'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
