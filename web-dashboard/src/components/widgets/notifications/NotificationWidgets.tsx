/**
 * widgets/notifications/NotificationWidgets.tsx
 *
 * Notification hub: feed, summary, channel status and preferences.
 */

export const NotificationFeedWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { type: 'LINE', title: '任務觸發通知', body: '您已被指派至信義區支援任務', time: '10:32', read: false },
            { type: 'Push', title: '系統公告', body: '今晚 00:00-06:00 進行系統維護', time: '09:15', read: true },
            { type: 'Telegram', title: '警報轉發', body: 'NCDR 豪雨特報已更新', time: '08:45', read: true },
        ].map((n, i) => (
            <div key={i} style={{
                padding: '12px', marginBottom: '8px', background: n.read ? 'rgba(47, 54, 65, 0.2)' : 'rgba(195, 155, 111, 0.1)',
                borderRadius: '8px', borderLeft: `3px solid ${n.read ? '#64748b' : '#C39B6F'}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px' }}>{n.type} • <span className="u-mono">{n.time}</span></span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.body}</div>
            </div>
        ))}
    </div>
);

export const NotificationSummaryWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        {[
            { label: '今日通知', value: '47', color: '#C39B6F' },
            { label: '未讀', value: '8', color: '#F97316' },
            { label: 'LINE', value: '32', color: '#00C300' },
            { label: 'Push', value: '15', color: '#3B82F6' },
        ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
                <div className="u-mono" style={{ fontSize: '20px', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.label}</div>
            </div>
        ))}
    </div>
);

export const ChannelStatusWidget = () => (
    <div style={{ height: '100%', padding: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>頻道連線狀態</div>
        {[
            { name: 'LINE Messaging', status: 'online' },
            { name: 'Telegram Bot', status: 'online' },
            { name: 'Web Push', status: 'online' },
            { name: 'Slack Webhook', status: 'offline' },
        ].map((ch, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{ch.name}</span>
                <span style={{ fontSize: '11px', color: ch.status === 'online' ? '#22c55e' : '#ef4444' }}>● {ch.status === 'online' ? '連線中' : '離線'}</span>
            </div>
        ))}
    </div>
);

export const NotificationCenterWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '8px', fontWeight: 600 }}>通知中心</div>
        {[
            { title: '系統公告', body: '將於今晚進行系統維護', time: '10:00' },
            { title: '任務更新', body: '任務 #1234 已完成', time: '09:45' },
        ].map((notif, i) => (
            <div key={i} style={{
                padding: '10px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '6px',
                marginBottom: '6px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{notif.title}</span>
                    <span className="u-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{notif.time}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{notif.body}</div>
            </div>
        ))}
    </div>
);

export const NotificationListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { title: '新任務指派', time: '5 分鐘前', type: 'task' },
            { title: '系統維護通知', time: '1 小時前', type: 'system' },
            { title: 'NCDR 警報', time: '2 小時前', type: 'alert' },
        ].map((notif, i) => (
            <div key={i} style={{
                padding: '16px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '10px',
                marginBottom: '8px',
            }}>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{notif.title}</div>
                <div className="u-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{notif.time}</div>
            </div>
        ))}
    </div>
);

export const NotificationSettingsWidget = () => (
    <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '16px' }}>通知偏好</div>
        {['Email', 'LINE', '推播'].map((type, i) => (
            <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid rgba(47, 54, 65, 0.5)',
            }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{type}</span>
                <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: i === 0 ? '#22c55e' : 'rgba(47, 54, 65, 0.5)', cursor: 'pointer' }} />
            </div>
        ))}
    </div>
);
