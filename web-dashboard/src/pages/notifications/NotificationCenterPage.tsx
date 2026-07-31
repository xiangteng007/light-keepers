/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * Notification Center Page
 * Unified notification history and management
 */

import React, { useState, useEffect } from 'react';
import './NotificationCenterPage.css';

interface NotificationItem {
    id: string;
    type: string;
    channel: string;
    title: string;
    body: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
    sentAt?: string;
    createdAt: string;
}

interface NotificationStats {
    total: number;
    deliveryRate: number;
    readRate: number;
}

const NotificationCenterPage: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
        loadStats();
    }, [filter]);

    const loadNotifications = async () => {
        try {
            const params = filter === 'unread' ? '?unreadOnly=true' : '';
            const response = await fetch(`/api/notifications${params}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch('/api/notifications/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, status: 'read' } : n)
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications/read-all', { method: 'POST' });
            setNotifications(prev =>
                prev.map(n => ({ ...n, status: 'read' }))
            );
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            'sos_alert': '🚨',
            'task_assignment': '📋',
            'report_update': '📝',
            'mission_broadcast': '📢',
            'weather_alert': '🌧️',
            'system_notice': '⚙️',
            'reminder': '⏰',
        };
        return icons[type] || '📬';
    };

    const getChannelBadge = (channel: string) => {
        const badges: Record<string, { label: string; color: string }> = {
            'push': { label: 'Push', color: '#3b82f6' },
            'email': { label: 'Email', color: '#10b981' },
            'line': { label: 'LINE', color: '#00b900' },
            'sms': { label: 'SMS', color: '#f59e0b' },
            'in_app': { label: 'App', color: '#6366f1' },
        };
        return badges[channel] || { label: channel, color: '#6b7280' };
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '剛剛';
        if (minutes < 60) return `${minutes} 分鐘前`;
        if (hours < 24) return `${hours} 小時前`;
        if (days < 7) return `${days} 天前`;
        return date.toLocaleDateString('zh-TW');
    };

    const unreadCount = notifications.filter(n => n.status !== 'read').length;

    return (
        <div className="notification-center-page">
            <header className="nc-header">
                <div className="nc-title">
                    <h1>🔔 通知中心</h1>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount} 則未讀</span>
                    )}
                </div>
                <div className="nc-actions">
                    {unreadCount > 0 && (
                        <button className="mark-all-btn" onClick={markAllAsRead}>
                            ✓ 全部標為已讀
                        </button>
                    )}
                </div>
            </header>

            {stats && (
                <div className="nc-stats">
                    <div className="stat-card">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">總通知數</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats.deliveryRate.toFixed(1)}%</span>
                        <span className="stat-label">送達率</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats.readRate.toFixed(1)}%</span>
                        <span className="stat-label">閱讀率</span>
                    </div>
                </div>
            )}

            <div className="nc-filters">
                <button
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    全部
                </button>
                <button
                    className={filter === 'unread' ? 'active' : ''}
                    onClick={() => setFilter('unread')}
                >
                    未讀
                </button>
            </div>

            <div className="nc-list">
                {loading ? (
                    <div className="nc-loading">載入中...</div>
                ) : notifications.length === 0 ? (
                    <div className="nc-empty">
                        <span className="empty-icon">📭</span>
                        <p>沒有通知</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`nc-item ${notification.status !== 'read' ? 'unread' : ''}`}
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div className="nc-item-icon">
                                {getTypeIcon(notification.type)}
                            </div>
                            <div className="nc-item-content">
                                <div className="nc-item-header">
                                    <h3>{notification.title}</h3>
                                    <span
                                        className="channel-badge"
                                        style={{ backgroundColor: getChannelBadge(notification.channel).color }}
                                    >
                                        {getChannelBadge(notification.channel).label}
                                    </span>
                                </div>
                                <p className="nc-item-body">{notification.body}</p>
                                <div className="nc-item-meta">
                                    <span className="nc-item-time">
                                        {formatTime(notification.createdAt)}
                                    </span>
                                    <span className={`nc-item-status ${notification.status}`}>
                                        {notification.status === 'read' ? '已讀' :
                                            notification.status === 'delivered' ? '已送達' :
                                                notification.status === 'sent' ? '已發送' :
                                                    notification.status === 'failed' ? '發送失敗' : '等待中'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationCenterPage;
