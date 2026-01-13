/**
 * WebhooksPage
 * Webhook subscription management
 */
import { useState } from 'react';
import './WebhooksPage.css';

interface WebhookSubscription {
    id: string;
    name: string;
    url: string;
    events: string[];
    active: boolean;
    createdAt: Date;
    successCount: number;
    failureCount: number;
}

const mockSubscriptions: WebhookSubscription[] = [
    { id: '1', name: 'ERP 系統', url: 'https://erp.example.com/webhooks', events: ['task.created', 'task.completed'], active: true, createdAt: new Date('2024-01-01'), successCount: 1250, failureCount: 3 },
    { id: '2', name: 'Slack 通知', url: 'https://hooks.slack.com/services/xxx', events: ['alert.created'], active: true, createdAt: new Date('2024-02-15'), successCount: 89, failureCount: 0 },
    { id: '3', name: '資料備份', url: 'https://backup.example.com/hook', events: ['*'], active: false, createdAt: new Date('2024-03-10'), successCount: 500, failureCount: 12 },
];

export default function WebhooksPage() {
    const [subscriptions] = useState(mockSubscriptions);
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="webhooks-page">
            <header className="webhooks-page__header">
                <div>
                    <h1>🔗 Webhook 管理</h1>
                    <p>管理外部系統事件訂閱</p>
                </div>
                <button className="create-btn" onClick={() => setShowCreate(true)}>
                    + 新增訂閱
                </button>
            </header>

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
                        </div>
                        <div className="webhook-card__stats">
                            <div className="stat">
                                <span className="value success">{sub.successCount}</span>
                                <span className="label">成功</span>
                            </div>
                            <div className="stat">
                                <span className="value failure">{sub.failureCount}</span>
                                <span className="label">失敗</span>
                            </div>
                        </div>
                        <div className="webhook-card__actions">
                            <button className="action-btn test">測試</button>
                            <button className="action-btn edit">編輯</button>
                        </div>
                    </div>
                ))}
            </div>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>新增 Webhook 訂閱</h2>
                        <form>
                            <label>
                                名稱
                                <input type="text" placeholder="ERP 整合" />
                            </label>
                            <label>
                                Webhook URL
                                <input type="url" placeholder="https://..." />
                            </label>
                            <label>
                                事件類型
                                <select multiple>
                                    <option value="task.created">task.created</option>
                                    <option value="task.completed">task.completed</option>
                                    <option value="alert.created">alert.created</option>
                                    <option value="resource.low">resource.low</option>
                                    <option value="*">* (全部)</option>
                                </select>
                            </label>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreate(false)}>取消</button>
                                <button type="submit" className="primary">建立</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
