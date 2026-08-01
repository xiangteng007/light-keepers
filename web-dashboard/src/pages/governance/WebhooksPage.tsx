/**
 * WebhooksPage
 * Webhook subscription management
 *
 * FE-4/3.3: 接上真實 API（backend/src/modules/webhooks/webhooks-admin.controller.ts）。
 * 端點：GET/POST /webhooks/subscriptions、PUT/DELETE /webhooks/subscriptions/:id、
 * POST /webhooks/subscriptions/:id/test、/enable、/disable、GET /webhooks/event-types、
 * GET /webhooks/stats。後端 entity 沒有逐筆 successCount 欄位，改用 failureCount +
 * lastSuccessAt/lastFailureAt 呈現，整體成功/失敗數改用 /webhooks/stats 的彙總值。
 */
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Plus, Webhook as WebhookIcon } from 'lucide-react';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import { Alert, Badge, Button, InputField, Tag, StatIndicator, Modal } from '../../design-system';
import { SkeletonList } from '../../components/ui/Skeleton/Skeleton';
import EmptyState from '../../components/shared/EmptyState';
import './WebhooksPage.css';

interface WebhookSubscription {
    id: string;
    name: string;
    url: string;
    description?: string;
    events: string[];
    active: boolean;
    failureCount: number;
    lastSuccessAt?: string;
    lastFailureAt?: string;
    lastError?: string;
    createdAt: string;
}

interface EventTypeOption {
    type: string;
    description: string;
}

interface DeliveryStats {
    total: number;
    success: number;
    failed: number;
    pending: number;
}

export default function WebhooksPage() {
    const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
    const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
    const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formEvents, setFormEvents] = useState<string[]>([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [subsRes, typesRes, statsRes] = await Promise.allSettled([
                api.get('/webhooks/subscriptions'),
                api.get('/webhooks/event-types'),
                api.get('/webhooks/stats'),
            ]);

            if (subsRes.status === 'fulfilled') {
                setSubscriptions(subsRes.value.data?.data || []);
            } else {
                throw subsRes.reason;
            }

            if (typesRes.status === 'fulfilled') {
                setEventTypes(typesRes.value.data?.data || []);
            }

            if (statsRes.status === 'fulfilled') {
                setDeliveryStats(statsRes.value.data?.data?.deliveries || null);
            }
        } catch (err: any) {
            console.error('Failed to fetch webhook subscriptions:', err);
            setError(getApiErrorMessage(err, '無法載入 Webhook 訂閱清單'));
            setSubscriptions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTest = async (id: string) => {
        setTestingId(id);
        try {
            const res = await api.post(`/webhooks/subscriptions/${id}/test`);
            alert(res.data?.message || (res.data?.success ? '測試成功' : '測試失敗'));
        } catch (err: any) {
            alert(getApiErrorMessage(err, '測試失敗'));
        } finally {
            setTestingId(null);
        }
    };

    const handleToggleActive = async (sub: WebhookSubscription) => {
        try {
            await api.post(`/webhooks/subscriptions/${sub.id}/${sub.active ? 'disable' : 'enable'}`);
            await fetchData();
        } catch (err: any) {
            alert(getApiErrorMessage(err, '操作失敗'));
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName || !formUrl || formEvents.length === 0) return;
        setCreating(true);
        try {
            await api.post('/webhooks/subscriptions', {
                name: formName,
                url: formUrl,
                events: formEvents,
            });
            setShowCreate(false);
            setFormName('');
            setFormUrl('');
            setFormEvents([]);
            await fetchData();
        } catch (err: any) {
            alert(getApiErrorMessage(err, '建立失敗'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="webhooks-page">
            <div className="page-header">
                <div className="page-header__text">
                    <h1><WebhookIcon size={24} aria-hidden="true" /> Webhook 管理</h1>
                    <p>管理外部系統事件訂閱</p>
                </div>
                <div className="page-header__actions">
                    <Button
                        variant="secondary"
                        onClick={fetchData}
                        disabled={loading}
                        icon={<RefreshCw size={16} className={loading ? 'spin' : ''} aria-hidden="true" />}
                    >
                        重新整理
                    </Button>
                    <Button variant="primary" onClick={() => setShowCreate(true)} icon={<Plus size={16} aria-hidden="true" />}>
                        新增訂閱
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="danger" icon={<AlertTriangle size={16} />} title="載入失敗">
                    <div className="webhooks-page__error-body">
                        <span>{error}</span>
                        <Button size="sm" variant="secondary" onClick={fetchData}>重試</Button>
                    </div>
                </Alert>
            )}

            {deliveryStats && (
                <div className="webhooks-page__stats">
                    <StatIndicator value={deliveryStats.success} label="派送成功" variant="success" />
                    <StatIndicator value={deliveryStats.failed} label="派送失敗" variant="danger" />
                    <StatIndicator value={deliveryStats.pending} label="派送中" />
                </div>
            )}

            {loading ? (
                <div className="webhooks-page__list">
                    <SkeletonList count={3} showAvatar={false} />
                </div>
            ) : subscriptions.length === 0 ? (
                <EmptyState
                    title="尚無 Webhook 訂閱"
                    description="新增訂閱以接收系統事件通知到外部服務。"
                    action={{ label: '新增訂閱', onClick: () => setShowCreate(true) }}
                />
            ) : (
                <div className="webhooks-page__list">
                    {subscriptions.map(sub => (
                        <div key={sub.id} className={`webhook-card ${!sub.active ? 'inactive' : ''}`}>
                            <div className="webhook-card__status">
                                <Badge variant={sub.active ? 'success' : 'default'} size="sm">
                                    {sub.active ? '啟用中' : '已停用'}
                                </Badge>
                            </div>
                            <div className="webhook-card__info">
                                <h3>{sub.name}</h3>
                                <p className="webhook-url">{sub.url}</p>
                                <div className="webhook-events">
                                    {sub.events.map((e, i) => (
                                        <Tag key={i} size="sm">{e}</Tag>
                                    ))}
                                </div>
                                {sub.lastError && (
                                    <p className="webhook-last-error">
                                        最近錯誤：{sub.lastError}
                                    </p>
                                )}
                            </div>
                            <div className="webhook-card__stats">
                                <div className="stat">
                                    <span className="value failure">{sub.failureCount}</span>
                                    <span className="label">失敗次數</span>
                                </div>
                            </div>
                            <div className="webhook-card__actions">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleTest(sub.id)}
                                    disabled={testingId === sub.id}
                                    loading={testingId === sub.id}
                                >
                                    測試
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => handleToggleActive(sub)}>
                                    {sub.active ? '停用' : '啟用'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="新增 Webhook 訂閱"
                size="sm"
            >
                <form onSubmit={handleCreate} className="webhook-form">
                    <InputField
                        label="名稱"
                        placeholder="ERP 整合"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        required
                        fullWidth
                    />
                    <InputField
                        label="Webhook URL"
                        type="url"
                        placeholder="https://..."
                        value={formUrl}
                        onChange={e => setFormUrl(e.target.value)}
                        required
                        fullWidth
                    />
                    <label className="webhook-form__label" htmlFor="webhook-events-select">
                        事件類型
                        <select
                            id="webhook-events-select"
                            multiple
                            value={formEvents}
                            onChange={e => setFormEvents(Array.from(e.target.selectedOptions, o => o.value))}
                            required
                            className="webhook-form__select"
                        >
                            {eventTypes.length === 0 ? (
                                <option value="*">* (全部)</option>
                            ) : (
                                eventTypes.map(et => (
                                    <option key={et.type} value={et.type}>{et.description}（{et.type}）</option>
                                ))
                            )}
                        </select>
                    </label>
                    <div className="webhook-form__actions">
                        <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>取消</Button>
                        <Button type="submit" variant="primary" disabled={creating} loading={creating}>
                            建立
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
