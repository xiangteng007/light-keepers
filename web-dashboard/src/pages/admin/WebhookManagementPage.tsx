/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * Webhook Management Page
 * Admin page for managing outbound webhooks
 */

import React, { useState, useEffect } from 'react';
import './WebhookManagementPage.css';

interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    successCount: number;
    failureCount: number;
    lastTriggered?: string;
}

const AVAILABLE_EVENTS = [
    'sos.created',
    'sos.acknowledged',
    'sos.resolved',
    'report.created',
    'report.updated',
    'task.created',
    'task.assigned',
    'task.completed',
    'mission.started',
    'mission.ended',
    'alert.triggered',
];

const WebhookManagementPage: React.FC = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        secret: '',
        events: [] as string[],
    });

    useEffect(() => {
        loadWebhooks();
    }, []);

    const loadWebhooks = async () => {
        try {
            const response = await fetch('/api/webhooks');
            if (response.ok) {
                const data = await response.json();
                setWebhooks(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load webhooks:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingWebhook(null);
        setFormData({ name: '', url: '', secret: '', events: [] });
        setShowModal(true);
    };

    const openEditModal = (webhook: Webhook) => {
        setEditingWebhook(webhook);
        setFormData({
            name: webhook.name,
            url: webhook.url,
            secret: '',
            events: webhook.events,
        });
        setShowModal(true);
    };

    const saveWebhook = async () => {
        const method = editingWebhook ? 'PUT' : 'POST';
        const url = editingWebhook ? `/api/webhooks/${editingWebhook.id}` : '/api/webhooks';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setShowModal(false);
                loadWebhooks();
            }
        } catch (error) {
            console.error('Failed to save webhook:', error);
        }
    };

    const deleteWebhook = async (id: string) => {
        if (!confirm('確定要刪除此 Webhook？')) return;

        try {
            await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
            loadWebhooks();
        } catch (error) {
            console.error('Failed to delete webhook:', error);
        }
    };

    const testWebhook = async (id: string) => {
        try {
            const response = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
            if (response.ok) {
                alert('測試 Webhook 已發送');
            }
        } catch (error) {
            console.error('Failed to test webhook:', error);
        }
    };

    const toggleEvent = (event: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(event)
                ? prev.events.filter(e => e !== event)
                : [...prev.events, event],
        }));
    };

    if (loading) {
        return <div className="webhook-loading">載入中...</div>;
    }

    return (
        <div className="webhook-management-page">
            <header className="webhook-header">
                <h1>🔗 Webhook 管理</h1>
                <button className="create-btn" onClick={openCreateModal}>
                    ➕ 新增 Webhook
                </button>
            </header>

            <div className="webhook-list">
                {webhooks.length === 0 ? (
                    <div className="empty-state">
                        <p>尚未設定任何 Webhook</p>
                        <button onClick={openCreateModal}>建立第一個 Webhook</button>
                    </div>
                ) : (
                    webhooks.map(webhook => (
                        <div key={webhook.id} className={`webhook-card ${webhook.enabled ? '' : 'disabled'}`}>
                            <div className="webhook-info">
                                <h3>{webhook.name}</h3>
                                <p className="webhook-url">{webhook.url}</p>
                                <div className="webhook-events">
                                    {webhook.events.map(event => (
                                        <span key={event} className="event-tag">{event}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="webhook-stats">
                                <span className="stat success">✓ {webhook.successCount}</span>
                                <span className="stat failure">✗ {webhook.failureCount}</span>
                            </div>
                            <div className="webhook-actions">
                                <button className="action-btn test" onClick={() => testWebhook(webhook.id)}>
                                    🧪 測試
                                </button>
                                <button className="action-btn edit" onClick={() => openEditModal(webhook)}>
                                    ✏️ 編輯
                                </button>
                                <button className="action-btn delete" onClick={() => deleteWebhook(webhook.id)}>
                                    🗑️ 刪除
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingWebhook ? '編輯 Webhook' : '新增 Webhook'}</h2>

                        <div className="form-group">
                            <label>名稱</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="例如：Slack 通知"
                            />
                        </div>

                        <div className="form-group">
                            <label>URL</label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://example.com/webhook"
                            />
                        </div>

                        <div className="form-group">
                            <label>密鑰 (用於簽名驗證)</label>
                            <input
                                type="password"
                                value={formData.secret}
                                onChange={e => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                                placeholder="留空則不變更"
                            />
                        </div>

                        <div className="form-group">
                            <label>訂閱事件</label>
                            <div className="events-grid">
                                {AVAILABLE_EVENTS.map(event => (
                                    <label key={event} className="event-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.events.includes(event)}
                                            onChange={() => toggleEvent(event)}
                                        />
                                        {event}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>
                                取消
                            </button>
                            <button className="save-btn" onClick={saveWebhook}>
                                儲存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebhookManagementPage;
