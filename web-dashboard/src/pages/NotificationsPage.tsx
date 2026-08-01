import { useState } from 'react';
import { Bell, Smartphone } from 'lucide-react';
import { Card, Button, Badge } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { useAuth } from '../context/AuthContext';
import './NotificationsPage.css';

// LINE Bot 官方帳號連結 (曦望燈塔)
// Basic ID 來自 LINE Developers Console
const LINE_BOT_URL = 'https://line.me/R/ti/p/@871ugllc';

// 通知資料 - 從 API 讀取，目前為空
// 實際通知將來自後端 /notifications API
const EMPTY_NOTIFICATIONS: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
}> = [];

// `color` is not currently consumed by any inline style in this file (Badge
// variants below are set via an independent ternary), but is tokenized here
// per the design-token migration so any future usage points at the semantic
// source of truth. Fallback hex kept identical for zero visual change.
const TYPE_CONFIG = {
    alert: { label: '警報', color: 'var(--color-danger, #F44336)' },
    assignment: { label: '任務', color: 'var(--color-info, #2196F3)' },
    training: { label: '培訓', color: 'var(--color-success, #4CAF50)' },
    system: { label: '系統', color: 'var(--text-tertiary, #607D8B)' },
};

type NotificationType = keyof typeof TYPE_CONFIG;

const badgeVariant = (type: string): 'danger' | 'info' | 'success' | 'default' =>
    type === 'alert' ? 'danger' : type === 'assignment' ? 'info' : type === 'training' ? 'success' : 'default';

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
        // 用戶加入好友後，在 LINE 中輸入「綁定」即可綁定帳號
        window.open(LINE_BOT_URL, '_blank');
        alert('請在 LINE 中加入好友後，傳送「綁定」即可完成帳號綁定！');
    };

    return (
        <div className="notif-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h1 className="notif-page__title">通知中心</h1>
                    <p className="page-subtitle">
                        {unreadCount > 0 ? `${unreadCount} 則未讀` : '沒有未讀通知'}
                    </p>
                </div>
                <div className="page-header__actions">
                    {unreadCount > 0 && (
                        <Button variant="secondary" size="sm" onClick={markAllAsRead}>
                            全部標為已讀
                        </Button>
                    )}
                </div>
            </div>

            {/* 篩選 */}
            <div className="notif-page__filters" role="group" aria-label="依類型篩選通知">
                <Button
                    variant={filter === '' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setFilter('')}
                >
                    全部
                </Button>
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <Button
                        key={key}
                        variant={filter === key ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilter(key)}
                    >
                        {config.label}
                    </Button>
                ))}
            </div>

            {/* 通知列表 */}
            {filteredNotifications.length === 0 ? (
                <EmptyState
                    icon={Bell}
                    title={filter ? '此類型目前沒有通知' : '目前沒有通知'}
                    description={filter ? '切換篩選條件查看其他類型的通知。' : '有新的警報、任務指派或系統訊息時，會顯示在這裡。'}
                    action={filter ? { label: '清除篩選', onClick: () => setFilter('') } : undefined}
                />
            ) : (
                <div className="notif-page__list">
                    {filteredNotifications.map(notification => {
                        const typeConfig = TYPE_CONFIG[notification.type as NotificationType];
                        return (
                            <Card
                                key={notification.id}
                                className={`notif-page__card ${!notification.read ? 'notif-page__card--unread' : ''}`}
                                padding="md"
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="notif-page__card-header">
                                    <Badge size="sm" variant={badgeVariant(notification.type)}>
                                        {typeConfig.label}
                                    </Badge>
                                    <span className="notif-page__card-time">{notification.time}</span>
                                </div>
                                <h4 className="notif-page__card-title">{notification.title}</h4>
                                <p className="notif-page__card-message">{notification.message}</p>
                                {!notification.read && (
                                    <span className="notif-page__unread-dot" aria-label="未讀" />
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* LINE Bot 設定區 */}
            <Card className="notif-page__line-settings" padding="lg">
                <div className="notif-page__line-header">
                    <Smartphone size={20} aria-hidden="true" />
                    <h3>LINE 通知設定</h3>
                </div>
                <p className="notif-page__line-desc">綁定 LINE 帳號以接收即時推播通知</p>

                <div className="notif-page__line-status">
                    <span>狀態：</span>
                    {isLineBound ? (
                        <Badge variant="success">已綁定</Badge>
                    ) : (
                        <Badge variant="warning">未綁定</Badge>
                    )}
                </div>

                {isLineBound ? (
                    <p className="notif-page__line-bound-msg">您已綁定 LINE 帳號，可接收任務指派與災害警報通知</p>
                ) : (
                    <>
                        <Button onClick={handleBindLine} disabled={!LINE_BOT_URL}>
                            加入 LINE 好友並綁定
                        </Button>

                        <div className="notif-page__line-instructions">
                            <p><strong>綁定步驟：</strong></p>
                            <ol>
                                <li>點擊上方按鈕，將自動開啟 LINE 加入好友頁面</li>
                                <li>加入好友後，在 LINE 聊天室中傳送「<strong>綁定</strong>」</li>
                                <li>點擊 LINE 回覆的綁定連結</li>
                                <li>完成帳號綁定！</li>
                            </ol>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
