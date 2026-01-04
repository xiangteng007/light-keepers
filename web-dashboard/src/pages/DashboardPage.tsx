import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getEvents, getTaskStats, getEventStats, getNcdrAlerts, getVolunteerStats, getReportStats } from '../api';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';
import { LowStockWidget } from '../components/widgets/LowStockWidget';
import './DashboardPage.css';

// 格式化時間
function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 格式化相對時間
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    return formatTime(dateString);
}

export default function DashboardPage() {
    const { user } = useAuth();
    const roleLevel = user?.roleLevel ?? 0;
    const { isConnected, onlineCount } = useRealtime();

    // 取得當前時間
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // API Queries
    const { data: eventStats } = useQuery({
        queryKey: ['eventStats'],
        queryFn: () => getEventStats().then(res => res.data.data),
    });

    // 獲取任務統計 (Level 2+ 需要)
    const { data: taskStats, isLoading: tasksLoading } = useQuery({
        queryKey: ['taskStats'],
        queryFn: () => getTaskStats().then(res => res.data.data),
        enabled: roleLevel >= 2, // 只有 Level 2+ 才需要這個資料
    });

    // 獲取 NCDR 警報 - 僅顯示重大災害類型
    // 5=颱風, 6=地震, 7=海嘯, 8=淹水, 9=土石流及大規模崩塌, 1087=火災, 2102=疏散避難
    const DASHBOARD_ALERT_TYPES = '5,6,7,8,9,1087,2102';
    const { data: alertsData, refetch: refetchAlerts } = useQuery({
        queryKey: ['recentAlerts', DASHBOARD_ALERT_TYPES],
        queryFn: () => getNcdrAlerts({ limit: 5, types: DASHBOARD_ALERT_TYPES }).then(res => res.data.data),
        refetchInterval: 60000, // 每分鐘刷新
    });

    const { data: eventsData } = useQuery({
        queryKey: ['recentEvents'],
        queryFn: () => getEvents({ limit: 5, status: 'active' }).then(res => res.data.data),
    });

    // 獲取志工統計 (Level 2+ 需要)
    const { data: volunteerStats } = useQuery({
        queryKey: ['volunteerStats'],
        queryFn: () => getVolunteerStats().then(res => res.data.data),
        enabled: roleLevel >= 2, // 只有 Level 2+ 才需要這個資料
    });

    // 獲取回報統計 (Level 1+ 需要)
    const { data: reportStats } = useQuery({
        queryKey: ['reportStats'],
        queryFn: () => getReportStats().then(res => res.data.data),
        enabled: roleLevel >= 1, // 只有 Level 1+ 才需要這個資料
    });

    // 計算完成率
    const total = (taskStats?.pending || 0) + (taskStats?.inProgress || 0) + (taskStats?.completed || 0);
    const completionRate = total > 0 ? Math.round((taskStats?.completed || 0) / total * 100) : 0;

    return (
        <div className="command-center">
            {/* ===== TOP BAR ===== */}
            <header className="cc-topbar">
                <div className="cc-topbar__left">
                    <span className={`cc-status ${isConnected ? 'cc-status--online' : ''}`}>
                        <span className="cc-status__dot"></span>
                        {isConnected ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div className="cc-topbar__center">
                    <span className="cc-topbar__logo">📊</span>
                    <h1 className="cc-topbar__title">指揮中心</h1>
                </div>
                <div className="cc-topbar__right">
                    <span className="cc-topbar__time">{timestamp}</span>
                    <div className="cc-search">
                        <input type="text" placeholder="Search" className="cc-search__input" />
                        <span className="cc-search__icon">🔍</span>
                    </div>
                    <span className="cc-topbar__users">👥 Online Users: {onlineCount || 0}</span>
                </div>
            </header>

            {/* ===== KPI ROW (6 tiles) ===== */}
            <section className="cc-kpi-row">
                <div className="cc-kpi">
                    <div className="cc-kpi__icon cc-kpi__icon--danger">⚠️</div>
                    <div className="cc-kpi__value">{eventStats?.active || 0}</div>
                    <div className="cc-kpi__label">Active Events</div>
                </div>
                <div className="cc-kpi">
                    <div className="cc-kpi__icon cc-kpi__icon--warning">📋</div>
                    <div className="cc-kpi__value">{alertsData?.length || 0}</div>
                    <div className="cc-kpi__label">NCDR Alerts</div>
                </div>
                <div className="cc-kpi">
                    <div className="cc-kpi__icon cc-kpi__icon--info">📄</div>
                    <div className="cc-kpi__value">{reportStats?.pending || 0}</div>
                    <div className="cc-kpi__label">Pending Reports</div>
                </div>
                <div className="cc-kpi">
                    <div className="cc-kpi__icon cc-kpi__icon--success">👥</div>
                    <div className="cc-kpi__value">{volunteerStats?.available || 0}</div>
                    <div className="cc-kpi__label">Available Volunteers</div>
                </div>
                <div className="cc-kpi">
                    <div className="cc-kpi__icon cc-kpi__icon--primary">✅</div>
                    <div className="cc-kpi__value">{taskStats?.pending || 0}</div>
                    <div className="cc-kpi__label">Pending Tasks</div>
                </div>
                <div className="cc-kpi">
                    <div className="cc-kpi__icon cc-kpi__icon--success">📊</div>
                    <div className="cc-kpi__value">{completionRate}%</div>
                    <div className="cc-kpi__label">Completion Rate</div>
                </div>
            </section>

            {/* ===== CONTENT ROW 1 ===== */}
            <section className="cc-content-row">
                {/* Quick Actions */}
                <div className="cc-card cc-card--quick-actions">
                    <div className="cc-card__header">
                        <h3 className="cc-card__title">Quick Actions</h3>
                    </div>
                    <div className="cc-card__body">
                        <div className="cc-quick-grid">
                            {roleLevel >= 2 && (
                                <Link to="/emergency-response" className="cc-quick-btn cc-quick-btn--emergency">
                                    <span className="cc-quick-btn__icon">🚨</span>
                                    <span className="cc-quick-btn__label">緊急啟動</span>
                                </Link>
                            )}
                            <Link to="/map" className="cc-quick-btn">
                                <span className="cc-quick-btn__icon">📍</span>
                                <span className="cc-quick-btn__label">Map</span>
                            </Link>
                            <Link to="/manuals" className="cc-quick-btn">
                                <span className="cc-quick-btn__icon">📖</span>
                                <span className="cc-quick-btn__label">Manual</span>
                            </Link>
                            <Link to="/ncdr-alerts" className="cc-quick-btn">
                                <span className="cc-quick-btn__icon">🔔</span>
                                <span className="cc-quick-btn__label">Alerts</span>
                            </Link>
                            <Link to="/report" className="cc-quick-btn">
                                <span className="cc-quick-btn__icon">➕</span>
                                <span className="cc-quick-btn__label">New Report</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Real-time Alerts */}
                <div className="cc-card cc-card--alerts">
                    <div className="cc-card__header">
                        <h3 className="cc-card__title">Real-time Alerts</h3>
                        <button className="cc-card__action" onClick={() => refetchAlerts()}>🔄</button>
                    </div>
                    <div className="cc-card__body">
                        <div className="cc-alerts-list">
                            {alertsData?.slice(0, 4).map((alert: any) => {
                                const severityClass = alert.severity === 'critical' ? 'critical' :
                                    alert.severity === 'warning' ? 'warning' : 'info';
                                return (
                                    <div key={alert.id} className={`cc-alert-item cc-alert-item--${severityClass}`}>
                                        <span className={`cc-alert-item__dot cc-alert-item__dot--${severityClass}`}></span>
                                        <div className="cc-alert-item__content">
                                            <div className="cc-alert-item__title">{alert.title}</div>
                                            <div className="cc-alert-item__desc">
                                                {alert.description?.substring(0, 60) || alert.alertTypeName}
                                            </div>
                                        </div>
                                        <span className="cc-alert-item__time">{formatTime(alert.publishedAt || alert.createdAt)}</span>
                                    </div>
                                );
                            })}
                            {(!alertsData || alertsData.length === 0) && (
                                <div className="cc-empty">✅ 目前無重大警報</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Latest Events */}
                <div className="cc-card cc-card--events">
                    <div className="cc-card__header">
                        <h3 className="cc-card__title">Latest Events</h3>
                        <button className="cc-card__action">🔽</button>
                    </div>
                    <div className="cc-card__body">
                        <div className="cc-events-list">
                            {eventsData?.slice(0, 4).map((event: any) => {
                                const icon = event.severity >= 4 ? '⚠️' : event.severity === 3 ? '⚡' : '✓';
                                return (
                                    <div key={event.id} className="cc-event-item">
                                        <span className="cc-event-item__time">{formatTime(event.createdAt)}</span>
                                        <span className="cc-event-item__icon">{icon}</span>
                                        <div className="cc-event-item__content">
                                            <div className="cc-event-item__title">{event.title}</div>
                                            <div className="cc-event-item__desc">{event.location || event.category}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!eventsData || eventsData.length === 0) && (
                                <div className="cc-empty">目前沒有進行中事件</div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== CONTENT ROW 2 ===== */}
            <section className="cc-content-row cc-content-row--second">
                {/* Volunteer Overview */}
                <div className="cc-card cc-card--volunteers">
                    <div className="cc-card__header">
                        <h3 className="cc-card__title">Volunteer Overview</h3>
                    </div>
                    <div className="cc-card__body">
                        <div className="cc-volunteer-stats">
                            <div className="cc-volunteer-stat">
                                <span className="cc-volunteer-stat__icon">👥</span>
                                <div className="cc-volunteer-stat__content">
                                    <span className="cc-volunteer-stat__label">On Duty</span>
                                    <span className="cc-volunteer-stat__value">{volunteerStats?.busy || 0}</span>
                                    <span className="cc-volunteer-stat__sub">Across {volunteerStats?.sectors || 0} sectors</span>
                                </div>
                            </div>
                            <div className="cc-volunteer-stat">
                                <span className="cc-volunteer-stat__icon">👤</span>
                                <div className="cc-volunteer-stat__content">
                                    <span className="cc-volunteer-stat__label">Available</span>
                                    <span className="cc-volunteer-stat__value">{volunteerStats?.available || 0}</span>
                                    <span className="cc-volunteer-stat__sub">Ready for deployment</span>
                                </div>
                            </div>
                            <div className="cc-volunteer-stat">
                                <span className="cc-volunteer-stat__icon">😴</span>
                                <div className="cc-volunteer-stat__content">
                                    <span className="cc-volunteer-stat__label">Resting</span>
                                    <span className="cc-volunteer-stat__value">{volunteerStats?.resting || 0}</span>
                                    <span className="cc-volunteer-stat__sub">Next shift in 2 hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map Overview */}
                <div className="cc-card cc-card--map">
                    <div className="cc-card__header">
                        <h3 className="cc-card__title">Map Overview</h3>
                        <Link to="/map" className="cc-card__action">⛶</Link>
                    </div>
                    <div className="cc-card__body">
                        <div className="cc-map-preview">
                            <div className="cc-map-visual">
                                <div className="cc-map-controls">
                                    <button className="cc-map-btn">+</button>
                                    <button className="cc-map-btn">−</button>
                                </div>
                                <div className="cc-map-center">
                                    <span className="cc-map-pin">📍</span>
                                </div>
                                <div className="cc-map-hotspots">
                                    <span className="cc-hotspot cc-hotspot--1">⚡</span>
                                    <span className="cc-hotspot cc-hotspot--2">🔴</span>
                                </div>
                                <div className="cc-map-bottom">
                                    <button className="cc-map-btn">🔍</button>
                                    <button className="cc-map-btn">◉</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Low Stock Resources */}
                <div className="cc-card cc-card--resources">
                    <div className="cc-card__header">
                        <h3 className="cc-card__title">Low Stock Resources</h3>
                        <span className="cc-card__badge">⚠️</span>
                    </div>
                    <div className="cc-card__body">
                        <LowStockWidget />
                    </div>
                </div>
            </section>
        </div>
    );
}
