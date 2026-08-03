import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../design-system';
import { PlusIcon, EditIcon, CheckIcon } from '../design-system/icons';
import EmptyState from '../components/shared/EmptyState';
import { getResources, getResourceStats } from '../api/services';
import type { Resource, ResourceCategory } from '../api/services';
import { useAuth } from '../context/AuthContext';
import WarehousesTab from './resources/WarehousesTab';
import AssetsTab from './resources/AssetsTab';
import DispatchTab from './resources/DispatchTab';
import AuditTab from './resources/AuditTab';
import './ResourcesPage.css';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import {
    Package, UtensilsCrossed, Droplets, Stethoscope, Home, Shirt, Wrench,
    ClipboardList, Factory, Settings, Truck, BarChart3, ScrollText,
    PackageOpen, Plus, AlertTriangle, type LucideIcon,
} from 'lucide-react';

/** 桌機表格載入骨架（≥3 列，DESIGN_LANGUAGE §7.1） */
function TableSkeletonRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }, (_, i) => (
                <tr key={`skeleton-${i}`} className="table-skeleton-row" aria-hidden="true">
                    {Array.from({ length: columns }, (_, j) => (
                        <td key={j}><span className="table-skeleton-bar" /></td>
                    ))}
                </tr>
            ))}
        </>
    );
}

/** 行動端卡片載入骨架（同一批資料的卡片版本） */
function CardSkeletonRows({ rows = 4 }: { rows?: number }) {
    return (
        <div className="table-skeleton-cards" role="status" aria-label="載入中">
            {Array.from({ length: rows }, (_, i) => (
                <div key={`card-skeleton-${i}`} className="table-skeleton-card" aria-hidden="true">
                    <span className="table-skeleton-bar" />
                    <span className="table-skeleton-bar table-skeleton-bar--sm" />
                </div>
            ))}
        </div>
    );
}

// 物資分類
const CATEGORY_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
    food: { label: '食品', icon: UtensilsCrossed },
    water: { label: '飲水', icon: Droplets },
    medical: { label: '醫療', icon: Stethoscope },
    shelter: { label: '收容', icon: Home },
    clothing: { label: '衣物', icon: Shirt },
    equipment: { label: '設備', icon: Wrench },
    other: { label: '其他', icon: Package },
};

const STATUS_CONFIG = {
    available: { label: '充足' },
    low: { label: '不足' },
    depleted: { label: '缺貨' },
};

type ResourceStatus = keyof typeof STATUS_CONFIG;

interface ResourceLog {
    id: string;
    resourceId: string;
    type: string;
    quantity: number;
    beforeQuantity: number;
    afterQuantity: number;
    operatorName: string;
    notes?: string;
    createdAt: string;
    resource?: {
        name: string;
    };
}


export default function ResourcesPage() {
    const { user } = useAuth();
    const canManage = user && user.roleLevel >= 3; // 幹部以上權限
    const isOwner = user && user.roleLevel >= 5; // 系統擁有者權限

    const [activeTab, setActiveTab] = useState<'manage' | 'warehouses' | 'assets' | 'dispatch' | 'audit' | 'logs'>('manage');
    const [resources, setResources] = useState<Resource[]>([]);
    const [logs, setLogs] = useState<ResourceLog[]>([]);
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
    const [editModal, setEditModal] = useState<Resource | null>(null);
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
                if (activeTab === 'manage') {
                    const [resourcesRes, statsRes] = await Promise.all([
                        getResources({ category: selectedCategory as ResourceCategory || undefined }),
                        getResourceStats(),
                    ]);
                    setResources(resourcesRes.data.data);
                    setStats(statsRes.data.data);
                } else {
                    // 載入物資紀錄
                    const res = await api.get('/resources/transactions/all');
                    setLogs(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch resources:', err);
                setError(getApiErrorMessage(err, '載入資料失敗'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedCategory, activeTab]);

    const filteredResources = resources;

    // 新增物資
    const handleAddResource = async () => {
        if (!resourceForm.name || resourceForm.quantity <= 0) {
            alert('請填寫物資名稱和數量');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/resources', {
                ...resourceForm,
                operatorName: user?.displayName || user?.roleDisplayName || user?.email || 'Admin',
            });
            setShowAddModal(false);
            setResourceForm({ name: '', category: 'food', quantity: 0, unit: '件', minQuantity: 10, location: '', description: '' });
            window.location.reload();
        } catch (err) {
            console.error('Failed to add resource:', err);
            alert(getApiErrorMessage(err, '新增失敗'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // 編輯物資
    const handleEditResource = async () => {
        if (!editModal) return;
        setIsSubmitting(true);
        try {
            await api.patch(`/resources/${editModal.id}`, {
                name: resourceForm.name,
                category: resourceForm.category,
                unit: resourceForm.unit,
                minQuantity: resourceForm.minQuantity,
                location: resourceForm.location,
                description: resourceForm.description,
            });
            setEditModal(null);
            window.location.reload();
        } catch (err) {
            console.error('Failed to edit resource:', err);
            alert(getApiErrorMessage(err, '編輯失敗'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // 刪除物資
    const handleDeleteResource = async (resource: Resource) => {
        if (!confirm(`確定要刪除「${resource.name}」嗎？此操作無法還原。`)) return;
        try {
            await api.delete(`/resources/${resource.id}`);
            window.location.reload();
        } catch (err) {
            console.error('Failed to delete resource:', err);
            alert(getApiErrorMessage(err, '刪除失敗'));
        }
    };

    // 開啟編輯 Modal
    const openEditModal = (resource: Resource) => {
        setResourceForm({
            name: resource.name,
            category: resource.category,
            quantity: resource.quantity,
            unit: resource.unit || '件',
            minQuantity: resource.minQuantity || 10,
            location: resource.location || '',
            description: resource.description || '',
        });
        setEditModal(resource);
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
            await api.patch(`/resources/${stockModal.resource.id}/${endpoint}`, {
                amount: stockModal.quantity,
                operatorName: user?.displayName || user?.roleDisplayName || user?.email || 'Admin',
                notes: stockModal.notes,
            });
            setStockModal(null);
            window.location.reload();
        } catch (err) {
            console.error('Failed to update stock:', err);
            alert(getApiErrorMessage(err, '操作失敗'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getLogTypeLabel = (type: string): { label: string; variant: 'success' | 'danger' | 'info' | 'default' } => {
        switch (type) {
            case 'in': return { label: '入庫', variant: 'success' };
            case 'out': return { label: '出庫', variant: 'danger' };
            case 'transfer': return { label: '調撥', variant: 'info' };
            case 'donate': return { label: '捐贈', variant: 'success' };
            default: return { label: type, variant: 'default' };
        }
    };

    // 刪除紀錄 (僅系統擁有者)
    const handleDeleteLog = async (logId: string) => {
        if (!confirm('確定要刪除此紀錄嗎？此操作無法還原。')) return;
        try {
            await api.delete(`/resources/transactions/${logId}`);
            setLogs(logs.filter(log => log.id !== logId));
        } catch (err) {
            console.error('Failed to delete log:', err);
            alert(getApiErrorMessage(err, '刪除失敗'));
        }
    };

    return (
        <div className="page resources-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2><Package size={24} /> 物資管理</h2>
                    <p className="page-subtitle">庫存管理與調度</p>
                </div>
                <div className="page-header__right">
                    {canManage && (
                        <Button onClick={() => setShowAddModal(true)}>
                            <Plus size={16} /> 新增物資
                        </Button>
                    )}
                </div>
            </div>

            {/* Tab 切換 */}
            <div className="resources-tabs">
                <button
                    className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
                    onClick={() => setActiveTab('manage')}
                >
                    <ClipboardList size={16} /> 耗材管理
                </button>
                <button
                    className={`tab-btn ${activeTab === 'warehouses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('warehouses')}
                >
                    <Factory size={16} /> 倉庫/儲位
                </button>
                <button
                    className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
                    onClick={() => setActiveTab('assets')}
                >
                    <Settings size={16} /> 器材資產
                </button>
                <button
                    className={`tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dispatch')}
                >
                    <Truck size={16} /> 調度
                </button>
                <button
                    className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit')}
                >
                    <BarChart3 size={16} /> 盤點
                </button>
                <button
                    className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    <ScrollText size={16} /> 異動紀錄
                </button>
            </div>

            {activeTab === 'manage' && (
                <>
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
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                            const CategoryIcon = config.icon;
                            return (
                                <button
                                    key={key}
                                    className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(key)}
                                >
                                    <CategoryIcon size={14} /> {config.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* 物資列表：桌機表格 / 行動端卡片直列（DESIGN_LANGUAGE §7.1） */}
                    <div className="resources-list">
                        <div className="resources-table-wrap resources-table-wrap--has-cards">
                            <table className="resources-table" aria-busy={isLoading || undefined}>
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
                                        <TableSkeletonRows columns={6} />
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={6} className="table-message-cell">
                                                <div className="table-message table-message--error">
                                                    <AlertTriangle size={16} /> {error}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredResources.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="table-message-cell">
                                                <EmptyState
                                                    variant="minimal"
                                                    icon={PackageOpen}
                                                    title="尚無物資資料"
                                                    description={canManage ? '點擊右上角「新增物資」開始建立庫存清單' : undefined}
                                                    action={canManage ? { label: '新增物資', onClick: () => setShowAddModal(true) } : undefined}
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResources.map(resource => {
                                            const category = CATEGORY_CONFIG[resource.category as ResourceCategory];
                                            const status = STATUS_CONFIG[resource.status as ResourceStatus];
                                            const CatIcon = category.icon;
                                            return (
                                                <tr key={resource.id}>
                                                    <td>
                                                        <span className="resource-name">
                                                            <CatIcon size={14} /> {resource.name}
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
                                                            <Button size="sm" variant="secondary" onClick={() => setStockModal({ resource, type: 'add', quantity: 0, notes: '' })}>
                                                                入庫
                                                            </Button>
                                                            <Button size="sm" variant="secondary" onClick={() => setStockModal({ resource, type: 'deduct', quantity: 0, notes: '' })}>
                                                                出庫
                                                            </Button>
                                                            {canManage && (
                                                                <>
                                                                    <Button size="sm" variant="ghost" onClick={() => openEditModal(resource)}>
                                                                        編輯
                                                                    </Button>
                                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteResource(resource)}>
                                                                        刪除
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 行動端：Card 直列（每卡＝一列，左資訊右狀態） */}
                        <div className="resources-card-list" aria-busy={isLoading || undefined}>
                            {isLoading ? (
                                <CardSkeletonRows />
                            ) : error ? (
                                <div className="table-message table-message--error">
                                    <AlertTriangle size={16} /> {error}
                                </div>
                            ) : filteredResources.length === 0 ? (
                                <EmptyState
                                    variant="minimal"
                                    icon={PackageOpen}
                                    title="尚無物資資料"
                                    description={canManage ? '點擊右上角「新增物資」開始建立庫存清單' : undefined}
                                    action={canManage ? { label: '新增物資', onClick: () => setShowAddModal(true) } : undefined}
                                />
                            ) : (
                                filteredResources.map(resource => {
                                    const category = CATEGORY_CONFIG[resource.category as ResourceCategory];
                                    const status = STATUS_CONFIG[resource.status as ResourceStatus];
                                    const CatIcon = category.icon;
                                    return (
                                        <Card key={resource.id} className="resource-row-card" padding="sm">
                                            <div className="resource-row-card__main">
                                                <span className="resource-name">
                                                    <CatIcon size={14} /> {resource.name}
                                                </span>
                                                <Badge
                                                    variant={resource.status === 'available' ? 'success' :
                                                        resource.status === 'low' ? 'warning' : 'danger'}
                                                >
                                                    {status.label}
                                                </Badge>
                                            </div>
                                            <div className="resource-row-card__meta">
                                                <span>{category.label}</span>
                                                <span><strong>{resource.quantity}</strong> {resource.unit}</span>
                                                {resource.location && <span>{resource.location}</span>}
                                            </div>
                                            <div className="resource-actions">
                                                <Button size="sm" variant="secondary" onClick={() => setStockModal({ resource, type: 'add', quantity: 0, notes: '' })}>
                                                    入庫
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => setStockModal({ resource, type: 'deduct', quantity: 0, notes: '' })}>
                                                    出庫
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button size="sm" variant="ghost" onClick={() => openEditModal(resource)}>
                                                            編輯
                                                        </Button>
                                                        <Button size="sm" variant="danger" onClick={() => handleDeleteResource(resource)}>
                                                            刪除
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'warehouses' && (
                <WarehousesTab canManage={!!canManage} />
            )}

            {activeTab === 'assets' && (
                <AssetsTab canManage={!!canManage} userName={user?.displayName || '操作員'} />
            )}

            {activeTab === 'dispatch' && (
                <DispatchTab canManage={!!canManage} userName={user?.displayName || '操作員'} />
            )}

            {activeTab === 'audit' && (
                <AuditTab canManage={!!canManage} userName={user?.displayName || '操作員'} />
            )}

            {activeTab === 'logs' && (
                <div className="resources-list">
                    <div className="resources-table-wrap">
                        <table className="logs-table" aria-busy={isLoading || undefined}>
                            <thead>
                                <tr>
                                    <th>時間</th>
                                    <th>物資名稱</th>
                                    <th>類型</th>
                                    <th>數量變更</th>
                                    <th>操作人</th>
                                    <th>備註</th>
                                    {isOwner && <th>操作</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <TableSkeletonRows columns={isOwner ? 7 : 6} />
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={isOwner ? 7 : 6} className="table-message-cell">
                                            <EmptyState variant="minimal" icon={ScrollText} title="尚無物資紀錄" />
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map(log => {
                                        const typeInfo = getLogTypeLabel(log.type);
                                        return (
                                            <tr key={log.id}>
                                                <td>{new Date(log.createdAt).toLocaleString('zh-TW')}</td>
                                                <td>{log.resource?.name || '-'}</td>
                                                <td>
                                                    <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                                                </td>
                                                <td>
                                                    {log.beforeQuantity} → {log.afterQuantity}
                                                    <span className={`qty-delta ${log.quantity > 0 ? 'qty-increase' : 'qty-decrease'}`}>
                                                        ({log.quantity > 0 ? '+' : ''}{log.quantity})
                                                    </span>
                                                </td>
                                                <td>{log.operatorName}</td>
                                                <td>{log.notes || '-'}</td>
                                                {isOwner && (
                                                    <td>
                                                        <Button size="sm" variant="danger" onClick={() => handleDeleteLog(log.id)}>
                                                            刪除
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 新增物資 Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3><PlusIcon size={20} aria-hidden="true" /> 新增物資</h3>

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
                                        <option key={key} value={key}>{config.label}</option>
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
                                {isSubmitting ? '新增中...' : <><CheckIcon size={16} aria-hidden="true" /> 確認新增</>}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* 編輯物資 Modal */}
            {editModal && (
                <div className="modal-overlay" onClick={() => setEditModal(null)}>
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3><EditIcon size={20} aria-hidden="true" /> 編輯物資</h3>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">物資名稱 *</label>
                                <input
                                    type="text"
                                    className="form-input"
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
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">單位</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={resourceForm.unit}
                                    onChange={e => setResourceForm({ ...resourceForm, unit: e.target.value })}
                                />
                            </div>
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
                        </div>

                        <div className="form-section">
                            <label className="form-label">存放位置</label>
                            <input
                                type="text"
                                className="form-input"
                                value={resourceForm.location}
                                onChange={e => setResourceForm({ ...resourceForm, location: e.target.value })}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">說明</label>
                            <textarea
                                className="form-textarea"
                                value={resourceForm.description}
                                onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setEditModal(null)}>
                                取消
                            </Button>
                            <Button onClick={handleEditResource} disabled={isSubmitting}>
                                {isSubmitting ? '儲存中...' : <><CheckIcon size={16} aria-hidden="true" /> 儲存變更</>}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* 入庫/出庫 Modal */}
            {stockModal && stockModal.resource && (
                <div className="modal-overlay" onClick={() => setStockModal(null)}>
                    <Card className="modal-content" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>{stockModal.type === 'add' ? '入庫' : '出庫'} - {stockModal.resource.name}</h3>
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
                                {isSubmitting ? '處理中...' : <><CheckIcon size={16} aria-hidden="true" /> 確認</>}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
