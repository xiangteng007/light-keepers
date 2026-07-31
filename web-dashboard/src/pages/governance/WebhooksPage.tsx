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
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import { Alert } from '../../design-system';
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
            setError(err?.response?.data?.message || '無法載入 Webhook 訂閱清單');
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
            alert(err?.response?.data?.message || '測試失敗');
        } finally {
            setTestingId(null);
        }
    };

    const handleToggleActive = async (sub: WebhookSubscription) => {
        try {
            await api.post(`/webhooks/subscriptions/${sub.id}/${sub.active ? 'disable' : 'enable'}`);
            await fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.message || '操作失敗');
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
            alert(err?.response?.data?.message || '建立失敗');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="webhooks-page">
            <header className="webhooks-page__header">
                <div>
                    <h1>🔗 Webhook 管理</h1>
                    <p>管理外部系統事件訂閱</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="action-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} /> 重新整理
                    </button>
                    <button className="create-btn" onClick={() => setShowCreate(true)}>
                        + 新增訂閱
                    </button>
                </div>
            </header>

            {error && (
                <Alert variant="danger" icon={<AlertTriangle size={16} />}>{error}</Alert>
            )}

            {deliveryStats && (
                <div className="webhooks-page__list" style={{ flexDirection: 'row', gap: '12px' }}>
                    <div className="webhook-card" style={{ flex: 1, justifyContent: 'center' }}>
                        <div className="stat">
                            <span className="value success">{deliveryStats.success}</span>
                            <span className="label">派送成功</span>
                        </div>
                    </div>
                    <div className="webhook-card" style={{ flex: 1, justifyContent: 'center' }}>
                        <div className="stat">
                            <span className="value failure">{deliveryStats.failed}</span>
                            <span className="label">派送失敗</span>
                        </div>
                    </div>
                    <div className="webhook-card" style={{ flex: 1, justifyContent: 'center' }}>
                        <div className="stat">
                            <span className="value">{deliveryStats.pending}</span>
                            <span className="label">派送中</span>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>
                    <Loader2 size={24} className="spin" />
                    <span>載入 Webhook 訂閱中...</span>
                </div>
            ) : subscriptions.length === 0 ? (
                <div className="empty-state">尚無 Webhook 訂閱</div>
            ) : (
                <div className="webhooks-page__list">
                    {subscriptions.map(sub => (
                        <div key={sub.id} className={`webhook-card ${!sub.active ? 'inactive' : ''}`}>
                            <div className="webhook-card__status">
                                <span className={`status-dot ${sub.active ? 'active' : 'inactive'}`} />
                            </div>
                            <div className="webhook-card__info">
                                <h3>{sub.name}</h3>
                                <p className="webhook-url">{sub.url}</p>
                                <div className="webhook-events">
                                    {sub.events.map((e, i) => (
                                        <span key={i} className="event-tag">{e}</span>
                                    ))}
                                </div>
                                {sub.lastError && (
                                    <p style={{ fontSize: '11px', color: '#EF4444', margin: '6px 0 0' }}>
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
                                <button
                                    className="action-btn test"
                                    onClick={() => handleTest(sub.id)}
                                    disabled={testingId === sub.id}
                                >
                                    {testingId === sub.id ? '測試中...' : '測試'}
                                </button>
                                <button className="action-btn edit" onClick={() => handleToggleActive(sub)}>
                                    {sub.active ? '停用' : '啟用'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>新增 Webhook 訂閱</h2>
                        <form onSubmit={handleCreate}>
                            <label>
                                名稱
                                <input
                                    type="text"
                                    placeholder="ERP 整合"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    required
                                />
                            </label>
                            <label>
                                Webhook URL
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={formUrl}
                                    onChange={e => setFormUrl(e.target.value)}
                                    required
                                />
                            </label>
                            <label>
                                事件類型
                                <select
                                    multiple
                                    value={formEvents}
                                    onChange={e => setFormEvents(Array.from(e.target.selectedOptions, o => o.value))}
                                    required
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
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreate(false)}>取消</button>
                                <button type="submit" className="primary" disabled={creating}>
                                    {creating ? '建立中...' : '建立'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
