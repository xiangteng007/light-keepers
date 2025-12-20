import { useQuery } from '@tanstack/react-query';
import { getEvents, getTaskStats, getEventStats } from '../api';
import { Card, Badge, Alert } from '../design-system';

// 統計卡片組件
interface StatCardProps {
    icon: string;
    value: number | string;
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ icon, value, label, variant = 'default' }: StatCardProps) {
    return (
        <Card variant="elevated" padding="md" className="stat-card-vi">
            <div className="stat-card-vi__content">
                <div className="stat-card-vi__icon">{icon}</div>
                <div className="stat-card-vi__data">
                    <span className={`stat-card-vi__value stat-card-vi__value--${variant}`}>{value}</span>
                    <span className="stat-card-vi__label">{label}</span>
                </div>
            </div>
        </Card>
    );
}

export default function DashboardPage() {
    // 獲取事件統計
    const { data: eventStats, isLoading: eventsLoading } = useQuery({
        queryKey: ['eventStats'],
        queryFn: () => getEventStats().then(res => res.data),
    });

    // 獲取任務統計
    const { data: taskStats, isLoading: tasksLoading } = useQuery({
        queryKey: ['taskStats'],
        queryFn: () => getTaskStats().then(res => res.data),
    });

    // 獲取最新事件
    const { data: eventsData } = useQuery({
        queryKey: ['recentEvents'],
        queryFn: () => getEvents({ limit: 5, status: 'active' }).then(res => res.data),
    });

    // 計算完成率
    const total = (taskStats?.pending || 0) + (taskStats?.inProgress || 0) + (taskStats?.completed || 0);
    const completionRate = total > 0 ? Math.round((taskStats?.completed || 0) / total * 100) : 0;

    const isLoading = eventsLoading || tasksLoading;

    return (
        <div className="page dashboard-page">
            <div className="page-header">
                <h2>儀表板</h2>
                <Badge variant="success" dot>系統運作正常</Badge>
            </div>

            {/* 統計卡片 */}
            <div className="stats-grid">
                <StatCard
                    icon="🚨"
                    value={eventStats?.active || 0}
                    label="進行中事件"
                    variant="danger"
                />
                <StatCard
                    icon="📋"
                    value={taskStats?.pending || 0}
                    label="待處理任務"
                    variant="warning"
                />
                <StatCard
                    icon="⏳"
                    value={taskStats?.inProgress || 0}
                    label="進行中任務"
                    variant="default"
                />
                <StatCard
                    icon="✅"
                    value={`${completionRate}%`}
                    label="任務完成率"
                    variant="success"
                />
            </div>

            {/* 任務過期警告 */}
            {taskStats?.overdue && taskStats.overdue > 0 && (
                <Alert variant="warning" title="注意" className="dashboard-alert">
                    有 {taskStats.overdue} 個任務已逾期，請盡速處理！
                </Alert>
            )}

            <div className="dashboard-sections">
                {/* 最新事件 */}
                <Card title="最新事件" icon="📢" padding="md">
                    <div className="event-list">
                        {isLoading && <div className="loading">載入中...</div>}
                        {!isLoading && eventsData?.data?.length === 0 && (
                            <div className="empty-state">
                                <span>📭</span>
                                <p>目前沒有進行中的事件</p>
                            </div>
                        )}
                        {eventsData?.data?.map((event) => (
                            <div
                                key={event.id}
                                className={`event-item priority-${event.severity && event.severity >= 4 ? 'high' : event.severity === 3 ? 'medium' : 'low'}`}
                            >
                                <Badge variant={event.severity && event.severity >= 4 ? 'danger' : 'default'} size="sm">
                                    {event.category || '其他'}
                                </Badge>
                                <span className="event-title">{event.title}</span>
                                <span className="event-time">{formatTime(event.createdAt)}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* 地圖概覽 */}
                <Card title="地圖概覽" icon="🗺️" padding="md">
                    <div className="map-placeholder">
                        <span>🗺️</span>
                        <p>整合 MapView 後將在此顯示事件分佈</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    return `${days}天前`;
}
