/**
 * Webhook Management Page
 * Admin page for managing outbound webhooks
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
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
            const { data } = await api.get('/webhooks');
            setWebhooks(data.data || []);
        } catch (error) {
            console.error('Failed to load webhooks:', getApiErrorMessage(error, '載入 Webhook 失敗'));
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
        const url = editingWebhook ? `/webhooks/${editingWebhook.id}` : '/webhooks';

        try {
            if (editingWebhook) {
                await api.put(url, formData);
            } else {
                await api.post(url, formData);
            }
            setShowModal(false);
            loadWebhooks();
        } catch (error) {
            console.error('Failed to save webhook:', getApiErrorMessage(error, '儲存 Webhook 失敗'));
        }
    };

    const deleteWebhook = async (id: string) => {
        if (!confirm('確定要刪除此 Webhook？')) return;

        try {
            await api.delete(`/webhooks/${id}`);
            loadWebhooks();
        } catch (error) {
            console.error('Failed to delete webhook:', getApiErrorMessage(error, '刪除 Webhook 失敗'));
        }
    };

    const testWebhook = async (id: string) => {
        try {
            await api.post(`/webhooks/${id}/test`);
            alert('測試 Webhook 已發送');
        } catch (error) {
            console.error('Failed to test webhook:', getApiErrorMessage(error, '測試 Webhook 失敗'));
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
