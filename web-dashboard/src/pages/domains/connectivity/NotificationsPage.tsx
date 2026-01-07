import { useState } from 'react';
import { Card, Button, Badge } from '../design-system';
import { useAuth } from '../../../context/AuthContext';

// LINE Bot 官方帳號連結 (曦望燈塔)
// Basic ID 來自 LINE Developers Console
const LINE_BOT_URL = 'https://line.me/R/ti/p/@871ugllc';

// 通知資料 - �?API 讀取，目前為空
// 實際通知將來自後�?/notifications API
const EMPTY_NOTIFICATIONS: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
}> = [];

const TYPE_CONFIG = {
    alert: { label: '警報', color: '#F44336' },
    assignment: { label: '任務', color: '#2196F3' },
    training: { label: '培訓', color: '#4CAF50' },
    system: { label: '系統', color: '#607D8B' },
};

type NotificationType = keyof typeof TYPE_CONFIG;

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState(EMPTY_NOTIFICATIONS);
    const [filter, setFilter] = useState<string>('');

    const unreadCount = notifications.filter(n => !n.read).length;
    const isLineBound = !!user?.lineLinked;

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

    const handleBindLine = () => {
        // 開啟 LINE Bot 好友連結
        // 用戶加入好友後，�?LINE 中輸入「綁定」即可綁定帳�?
        window.open(LINE_BOT_URL, '_blank');
        alert('請在 LINE 中加入好友後，傳送「綁定」即可完成帳號綁定！');
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
                    {isLineBound ? (
                        <Badge variant="success">已綁�?/Badge>
                    ) : (
                        <Badge variant="warning">未綁�?/Badge>
                    )}
                </div>

                {isLineBound ? (
                    <p className="line-bound-msg">�?您已綁定 LINE 帳號，可接收任務指派與災害警報通知</p>
                ) : (
                    <>
                        <Button onClick={handleBindLine} disabled={!LINE_BOT_URL}>
                            📱 加入 LINE 好友並綁�?
                        </Button>

                        <div className="line-instructions">
                            <p><strong>綁定步驟�?/strong></p>
                            <ol>
                                <li>點擊上方按鈕，將自動開啟 LINE 加入好友頁面</li>
                                <li>加入好友後，�?LINE 聊天室中傳送�?strong>綁定</strong>�?/li>
                                <li>點擊 LINE 回覆的綁定連結</li>
                                <li>完成帳號綁定�?/li>
                            </ol>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
