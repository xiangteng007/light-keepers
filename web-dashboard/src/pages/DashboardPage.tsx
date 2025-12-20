import { useQuery } from '@tanstack/react-query';
import { getEvents, getTaskStats, getEventStats } from '../api';

export default function DashboardPage() {
    // 獲取事件統計
    const { data: eventStats } = useQuery({
        queryKey: ['eventStats'],
        queryFn: () => getEventStats().then(res => res.data),
    });

    // 獲取任務統計
    const { data: taskStats } = useQuery({
        queryKey: ['taskStats'],
        queryFn: () => getTaskStats().then(res => res.data),
    });

    // 獲取最新事件
    const { data: eventsData } = useQuery({
        queryKey: ['recentEvents'],
        queryFn: () => getEvents({ limit: 5, status: 'active' }).then(res => res.data),
    });

    // 計算完成率
    const completionRate = taskStats
        ? Math.round((taskStats.completed / (taskStats.pending + taskStats.inProgress + taskStats.completed || 1)) * 100)
        : 0;

    return (
        <div className="page dashboard-page">
            <h2>儀表板</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-content">
                        <span className="stat-value">{eventStats?.active || 0}</span>
                        <span className="stat-label">進行中事件</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <span className="stat-value">{taskStats?.pending || 0}</span>
                        <span className="stat-label">待處理任務</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <span className="stat-value">{taskStats?.inProgress || 0}</span>
                        <span className="stat-label">進行中任務</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <span className="stat-value">{completionRate}%</span>
                        <span className="stat-label">任務完成率</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <section className="recent-events">
                    <h3>最新事件</h3>
                    <div className="event-list">
                        {eventsData?.data?.length === 0 && (
                            <div className="empty-state">
                                <span>📭</span>
                                <p>目前沒有進行中的事件</p>
                            </div>
                        )}
                        {eventsData?.data?.map((event) => (
                            <div key={event.id} className={`event-item priority-${event.severity && event.severity >= 4 ? 'high' : event.severity === 3 ? 'medium' : 'low'}`}>
                                <span className="event-category">{event.category || '其他'}</span>
                                <span className="event-title">{event.title}</span>
                                <span className="event-time">{formatTime(event.createdAt)}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="map-preview">
                    <h3>地圖概覽</h3>
                    <div className="map-placeholder">
                        <span>🗺️ 地圖視覺化區域</span>
                        <p>整合 MapView 後將在此顯示事件分佈</p>
                    </div>
                </section>
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
