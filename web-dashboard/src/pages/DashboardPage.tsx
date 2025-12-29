import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getEvents, getTaskStats, getEventStats, getNcdrAlerts, getVolunteerStats, getReportStats, getResourceStats } from '../api';
import { Card, Badge, Alert, Button } from '../design-system';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';

// 統計卡片組件
interface StatCardProps {
    icon: string;
    value: number | string;
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    trend?: 'up' | 'down' | 'stable';
}

function StatCard({ icon, value, label, variant = 'default', trend }: StatCardProps) {
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
    return (
        <Card variant="elevated" padding="md" className="stat-card-vi">
            <div className="stat-card-vi__content">
                <div className="stat-card-vi__icon">{icon}</div>
                <div className="stat-card-vi__data">
                    <span className={`stat-card-vi__value stat-card-vi__value--${variant}`}>
                        {value}
                        {trendIcon && <span className={`trend trend--${trend}`}>{trendIcon}</span>}
                    </span>
                    <span className="stat-card-vi__label">{label}</span>
                </div>
            </div>
        </Card>
    );
}

// 快速操作按鈕 - 根據權限等級顯示不同選項
function QuickActions({ roleLevel }: { roleLevel: number }) {
    return (
        <Card title="快速操作" icon="⚡" padding="md">
            <div className="quick-actions-grid">
                {/* Level 0+: 公開頁面 */}
                <Link to="/map" className="quick-action-btn">
                    <span className="quick-action-btn__icon">🗺️</span>
                    <span className="quick-action-btn__label">地圖總覽</span>
                </Link>
                <Link to="/manuals" className="quick-action-btn">
                    <span className="quick-action-btn__icon">📖</span>
                    <span className="quick-action-btn__label">實務手冊</span>
                </Link>
                <Link to="/ncdr-alerts" className="quick-action-btn">
                    <span className="quick-action-btn__icon">⚠️</span>
                    <span className="quick-action-btn__label">災害示警</span>
                </Link>
                {/* Level 1+: 志工功能 */}
                {roleLevel >= 1 && (
                    <Link to="/report" className="quick-action-btn">
                        <span className="quick-action-btn__icon">📢</span>
                        <span className="quick-action-btn__label">新增回報</span>
                    </Link>
                )}
                {/* Level 2+: 幹部功能 */}
                {roleLevel >= 2 && (
                    <Link to="/volunteers" className="quick-action-btn">
                        <span className="quick-action-btn__icon">👥</span>
                        <span className="quick-action-btn__label">志工調度</span>
                    </Link>
                )}
            </div>
        </Card>
    );
}

export default function DashboardPage() {
    // 用戶權限
    const { user } = useAuth();
    const roleLevel = user?.roleLevel ?? 0;

    // 即時連線狀態
    const { isConnected, onlineCount } = useRealtime();

    // 獲取事件統計
    const { data: eventStats, isLoading: eventsLoading } = useQuery({
        queryKey: ['eventStats'],
        queryFn: () => getEventStats().then(res => res.data.data),
    });

    // 獲取任務統計
    const { data: taskStats, isLoading: tasksLoading } = useQuery({
        queryKey: ['taskStats'],
        queryFn: () => getTaskStats().then(res => res.data.data),
    });

    // 獲取最新事件
    const { data: eventsData } = useQuery({
        queryKey: ['recentEvents'],
        queryFn: () => getEvents({ limit: 5, status: 'active' }).then(res => res.data.data),
    });

    // 獲取 NCDR 警報
    const { data: alertsData } = useQuery({
        queryKey: ['recentAlerts'],
        queryFn: () => getNcdrAlerts({ limit: 5 }).then(res => res.data.data),
        refetchInterval: 60000, // 每分鐘刷新
    });

    // 獲取志工統計 (真實 API)
    const { data: volunteerStats } = useQuery({
        queryKey: ['volunteerStats'],
        queryFn: () => getVolunteerStats().then(res => res.data.data),
    });

    // 獲取回報統計 (真實 API)
    const { data: reportStats } = useQuery({
        queryKey: ['reportStats'],
        queryFn: () => getReportStats().then(res => res.data.data),
    });

    // 獲取物資統計 (真實 API)
    const { data: resourceStats } = useQuery({
        queryKey: ['resourceStats'],
        queryFn: () => getResourceStats().then(res => res.data.data),
    });

    // 計算完成率
    const total = (taskStats?.pending || 0) + (taskStats?.inProgress || 0) + (taskStats?.completed || 0);
    const completionRate = total > 0 ? Math.round((taskStats?.completed || 0) / total * 100) : 0;

    const isLoading = eventsLoading || tasksLoading;

    return (
        <div className="page dashboard-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📊 決策儀表板</h2>
                    <p className="page-subtitle">Light Keepers 災害應變系統總覽</p>
                </div>
                <div className="page-header__right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {onlineCount > 0 && (
                        <Badge variant="info">👥 {onlineCount} 人在線</Badge>
                    )}
                    <Badge variant={isConnected ? 'success' : 'default'} dot>
                        {isConnected ? '即時連線中' : '系統運作正常'}
                    </Badge>
                </div>
            </div>

            {/* KPI 統計卡片 - 根據權限等級顯示 */}
            <div className="stats-grid stats-grid--6">
                {/* Level 0+: 公開資訊 */}
                <StatCard
                    icon="🚨"
                    value={eventStats?.active || 0}
                    label="進行中事件"
                    variant="danger"
                />
                <StatCard
                    icon="⚠️"
                    value={alertsData?.length || 0}
                    label="NCDR 警報"
                    variant="warning"
                />
                {/* Level 1+: 志工可見 */}
                {roleLevel >= 1 && (
                    <StatCard
                        icon="📢"
                        value={reportStats?.pending || 0}
                        label="待審核回報"
                        variant="warning"
                    />
                )}
                {/* Level 2+: 幹部可見 */}
                {roleLevel >= 2 && (
                    <>
                        <StatCard
                            icon="👥"
                            value={volunteerStats?.available || 0}
                            label="可用志工"
                            variant="success"
                        />
                        <StatCard
                            icon="📋"
                            value={taskStats?.pending || 0}
                            label="待處理任務"
                            variant="info"
                        />
                        <StatCard
                            icon="✅"
                            value={`${completionRate}%`}
                            label="任務完成率"
                            variant="success"
                        />
                    </>
                )}
            </div>

            {/* 任務過期警告 - Level 2+ */}
            {roleLevel >= 2 && taskStats?.overdue && taskStats.overdue > 0 && (
                <Alert variant="warning" title="注意" className="dashboard-alert">
                    有 {taskStats.overdue} 個任務已逾期，請盡速處理！
                </Alert>
            )}

            {/* 主要內容區 */}
            <div className="dashboard-sections dashboard-sections--3col">
                {/* 快速操作 */}
                <QuickActions roleLevel={roleLevel} />

                {/* 最新 NCDR 警報 - 公開 */}
                <Card title="即時警報" icon="⚠️" padding="md">
                    <div className="alert-list">
                        {alertsData?.slice(0, 4).map((alert: any) => (
                            <div key={alert.id} className="alert-item">
                                <Badge
                                    variant={alert.severity === 'extreme' ? 'danger' : alert.severity === 'severe' ? 'warning' : 'default'}
                                    size="sm"
                                >
                                    {alert.type}
                                </Badge>
                                <span className="alert-title">{alert.title?.substring(0, 30)}...</span>
                            </div>
                        )) || <div className="empty-state-mini">暫無警報</div>}
                    </div>
                    <Link to="/ncdr-alerts" className="view-more-link">
                        查看全部 →
                    </Link>
                </Card>

                {/* 最新事件 - Level 1+ */}
                {roleLevel >= 1 ? (
                    <Card title="最新事件" icon="📢" padding="md">
                        <div className="event-list">
                            {isLoading && <div className="loading">載入中...</div>}
                            {!isLoading && eventsData?.length === 0 && (
                                <div className="empty-state-mini">目前沒有進行中的事件</div>
                            )}
                            {eventsData?.slice(0, 4).map((event) => (
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
                        <Link to="/events" className="view-more-link">
                            查看全部 →
                        </Link>
                    </Card>
                ) : (
                    <Card title="地圖概覽" icon="🗺️" padding="md">
                        <div className="map-placeholder">
                            <span>🗺️</span>
                            <p>地圖顯示災情與資源分布</p>
                            <Link to="/map">
                                <Button variant="secondary" size="sm">開啟地圖</Button>
                            </Link>
                        </div>
                    </Card>
                )}
            </div>

            {/* 資源分布概覽 - Level 2+ 才顯示 */}
            {roleLevel >= 2 && (
                <div className="dashboard-sections">
                    <Card title="志工資源概覽" icon="👥" padding="md">
                        <div className="resource-grid">
                            <div className="resource-item">
                                <span className="resource-label">總志工數</span>
                                <span className="resource-value">{volunteerStats?.total || 0}</span>
                            </div>
                            <div className="resource-item">
                                <span className="resource-label">可用</span>
                                <span className="resource-value resource-value--success">{volunteerStats?.available || 0}</span>
                            </div>
                            <div className="resource-item">
                                <span className="resource-label">執勤中</span>
                                <span className="resource-value resource-value--warning">{volunteerStats?.busy || 0}</span>
                            </div>
                            <div className="resource-item">
                                <span className="resource-label">回報總數</span>
                                <span className="resource-value">{reportStats?.total || 0}</span>
                            </div>
                        </div>
                        <Link to="/volunteers" className="view-more-link">
                            前往志工管理 →
                        </Link>
                    </Card>

                    <Card title="地圖概覽" icon="🗺️" padding="md">
                        <div className="map-placeholder">
                            <span>🗺️</span>
                            <p>地圖顯示災情與資源分布</p>
                            <Link to="/map">
                                <Button variant="secondary" size="sm">開啟地圖</Button>
                            </Link>
                        </div>
                    </Card>

                    <Card title="物資庫存" icon="📦" padding="md">
                        <div className="resource-grid">
                            <div className="resource-item">
                                <span className="resource-label">物資種類</span>
                                <span className="resource-value">{resourceStats?.total || 0}</span>
                            </div>
                            <div className="resource-item">
                                <span className="resource-label">低庫存</span>
                                <span className="resource-value resource-value--warning">{resourceStats?.lowStock || 0}</span>
                            </div>
                            <div className="resource-item">
                                <span className="resource-label">即期品</span>
                                <span className="resource-value resource-value--danger">{resourceStats?.expiringSoon || 0}</span>
                            </div>
                        </div>
                        <Link to="/resources" className="view-more-link">
                            前往物資管理 →
                        </Link>
                    </Card>
                </div>
            )}
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
