/**
 * Activity Feed Component
 * Displays recent activity timeline
 */

import './ActivityFeed.css';

export interface ActivityItem {
    id: string;
    type: 'report' | 'sos' | 'task';
    action: string;
    description: string;
    timestamp: string;
    severity?: number;
}

export interface ActivityFeedProps {
    activities: ActivityItem[];
    loading?: boolean;
    maxItems?: number;
}

const TYPE_ICONS: Record<string, string> = {
    report: '📋',
    sos: '🆘',
    task: '📝',
};

const TYPE_COLORS: Record<string, string> = {
    report: '#3b82f6',
    sos: '#dc2626',
    task: '#22c55e',
};

function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} 天前`;

    return then.toLocaleDateString('zh-TW');
}

export function ActivityFeed({ activities, loading, maxItems = 10 }: ActivityFeedProps) {
    if (loading) {
        return (
            <div className="activity-feed">
                <h3 className="activity-feed__title">最近活動</h3>
                <div className="activity-feed__list">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="activity-item activity-item--loading">
                            <div className="activity-item__skeleton activity-item__skeleton--icon"></div>
                            <div className="activity-item__content">
                                <div className="activity-item__skeleton activity-item__skeleton--text"></div>
                                <div className="activity-item__skeleton activity-item__skeleton--time"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const displayItems = activities.slice(0, maxItems);

    return (
        <div className="activity-feed">
            <h3 className="activity-feed__title">最近活動</h3>
            {displayItems.length === 0 ? (
                <div className="activity-feed__empty">暫無活動記錄</div>
            ) : (
                <div className="activity-feed__list">
                    {displayItems.map((item) => (
                        <div
                            key={item.id}
                            className={`activity-item activity-item--${item.type}`}
                        >
                            <div
                                className="activity-item__icon"
                                style={{ borderColor: TYPE_COLORS[item.type] }}
                            >
                                {TYPE_ICONS[item.type]}
                            </div>
                            <div className="activity-item__content">
                                <div className="activity-item__description">
                                    {item.description}
                                    {item.severity && item.severity >= 4 && (
                                        <span className="activity-item__severity activity-item__severity--high">
                                            高優先
                                        </span>
                                    )}
                                </div>
                                <div className="activity-item__time">
                                    {formatTimeAgo(item.timestamp)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ActivityFeed;
