import { useState } from 'react';
import { Card, Button, Badge } from '../design-system';

// 模擬通知資料
const MOCK_NOTIFICATIONS = [
    { id: '1', type: 'alert', title: '⚠️ 地震警報', message: '芮氏規模5.2地震', time: '10分鐘前', read: false },
    { id: '2', type: 'assignment', title: '📋 新任務指派', message: '物資運送 - 板橋區', time: '30分鐘前', read: false },
    { id: '3', type: 'training', title: '📚 培訓提醒', message: '急救技能入門課程已更新', time: '2小時前', read: true },
    { id: '4', type: 'system', title: '🔔 系統通知', message: '本月服務時數已更新', time: '昨天', read: true },
];

const TYPE_CONFIG = {
    alert: { label: '警報', color: '#F44336' },
    assignment: { label: '任務', color: '#2196F3' },
    training: { label: '培訓', color: '#4CAF50' },
    system: { label: '系統', color: '#607D8B' },
};

type NotificationType = keyof typeof TYPE_CONFIG;

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const [filter, setFilter] = useState<string>('');

    const unreadCount = notifications.filter(n => !n.read).length;

    const filteredNotifications = filter
        ? notifications.filter(n => n.type === filter)
        : notifications;

    const markAsRead = (id: string) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    return (
        <div className="page notifications-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>🔔 通知中心</h2>
                    <p className="page-subtitle">
                        {unreadCount > 0 ? `${unreadCount} 則未讀` : '沒有未讀通知'}
                    </p>
                </div>
                <div className="page-header__right">
                    {unreadCount > 0 && (
                        <Button variant="secondary" onClick={markAllAsRead}>
                            全部標為已讀
                        </Button>
                    )}
                </div>
            </div>

            {/* 篩選 */}
            <div className="notification-filters">
                <button
                    className={`category-btn ${filter === '' ? 'active' : ''}`}
                    onClick={() => setFilter('')}
                >
                    全部
                </button>
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        className={`category-btn ${filter === key ? 'active' : ''}`}
                        onClick={() => setFilter(key)}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* 通知列表 */}
            <div className="notifications-list">
                {filteredNotifications.map(notification => {
                    const typeConfig = TYPE_CONFIG[notification.type as NotificationType];
                    return (
                        <Card
                            key={notification.id}
                            className={`notification-card ${!notification.read ? 'unread' : ''}`}
                            padding="md"
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div className="notification-card__header">
                                <Badge size="sm" variant={
                                    notification.type === 'alert' ? 'danger' :
                                        notification.type === 'assignment' ? 'info' :
                                            notification.type === 'training' ? 'success' : 'default'
                                }>
                                    {typeConfig.label}
                                </Badge>
                                <span className="notification-time">{notification.time}</span>
                            </div>
                            <h4 className="notification-title">{notification.title}</h4>
                            <p className="notification-message">{notification.message}</p>
                            {!notification.read && <div className="unread-dot" />}
                        </Card>
                    );
                })}
            </div>

            {/* LINE Bot 設定區 */}
            <Card className="line-settings" padding="lg">
                <h3>📱 LINE 通知設定</h3>
                <p className="card-desc">綁定 LINE 帳號以接收即時推播通知</p>

                <div className="line-status">
                    <span>狀態：</span>
                    <Badge variant="warning">未綁定</Badge>
                </div>

                <Button>
                    綁定 LINE 帳號
                </Button>

                <div className="line-qr">
                    <p>或掃描 QR Code 加入官方帳號：</p>
                    <div className="qr-placeholder">
                        [LINE QR Code]
                    </div>
                </div>
            </Card>
        </div>
    );
}
