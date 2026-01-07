import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { Card, Button } from '../design-system';
import {
    getResourceStats,
    getReportStats,
    getVolunteerStats,
    getNcdrAlerts,
    getEventStats,
    getTaskStats,
    getAllTransactions,
    getReports
} from '../api';
import './AnalyticsPage.css';

// 註冊 Chart.js 組件
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// 生成過去 N 天的日期標籤
function getDateLabels(days: number): string[] {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
    }
    return labels;
}

// NCDR 類別配置
const NCDR_CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
    weather: { label: '氣象', color: 'rgba(59, 130, 246, 0.8)' },
    earthquake: { label: '地震', color: 'rgba(239, 68, 68, 0.8)' },
    flood: { label: '水災', color: 'rgba(14, 165, 233, 0.8)' },
    landslide: { label: '土石�?, color: 'rgba(168, 85, 247, 0.8)' },
    traffic: { label: '交�?, color: 'rgba(245, 158, 11, 0.8)' },
    fire: { label: '火災', color: 'rgba(249, 115, 22, 0.8)' },
    other: { label: '其他', color: 'rgba(156, 163, 175, 0.8)' },
};

// 物資類別配置
const RESOURCE_CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
    food: { label: '食品', icon: '🍎' },
    water: { label: '飲水', icon: '💧' },
    medical: { label: '醫療', icon: '🏥' },
    shelter: { label: '收容', icon: '🏠' },
    clothing: { label: '衣物', icon: '👕' },
    equipment: { label: '設備', icon: '🔧' },
    other: { label: '其他', icon: '📦' },
};

export default function AnalyticsPage() {
    const [dateRange, setDateRange] = useState(14);

    // 獲取統計數據
    const { data: resourceStats } = useQuery({
        queryKey: ['resourceStats'],
        queryFn: () => getResourceStats().then(res => res.data.data),
    });

    const { data: reportStats } = useQuery({
        queryKey: ['reportStats'],
        queryFn: () => getReportStats().then(res => res.data.data),
    });

    const { data: volunteerStats } = useQuery({
        queryKey: ['volunteerStats'],
        queryFn: () => getVolunteerStats().then(res => res.data.data),
    });

    const { data: alertsData } = useQuery({
        queryKey: ['ncdrAlerts'],
        queryFn: () => getNcdrAlerts({ limit: 100 }).then(res => res.data.data),
    });

    const { data: eventStats } = useQuery({
        queryKey: ['eventStats'],
        queryFn: () => getEventStats().then(res => res.data.data).catch(() => ({ active: 0, resolved: 0 })),
    });

    const { data: taskStats } = useQuery({
        queryKey: ['taskStats'],
        queryFn: () => getTaskStats().then(res => res.data.data).catch(() => ({ pending: 0, inProgress: 0, completed: 0 })),
    });

    // 獲取最近活�?
    const { data: recentTransactions } = useQuery({
        queryKey: ['recentTransactions'],
        queryFn: () => getAllTransactions().then(res => res.data).catch(() => []),
    });

    const { data: recentReports } = useQuery({
        queryKey: ['recentReports'],
        queryFn: () => getReports({ limit: 5 }).then(res => res.data.data).catch(() => []),
    });

    const dateLabels = getDateLabels(dateRange);

    // 計算 NCDR 警報分類統計 - 使用 alertTypeName 來分�?
    const ncdrCategoryStats = useMemo(() => {
        if (!alertsData || !Array.isArray(alertsData)) return {};
        const stats: Record<string, number> = {};

        // 根據 alertTypeName 映射到分�?
        const getCategory = (typeName: string): string => {
            const name = typeName.toLowerCase();
            if (name.includes('颱風') || name.includes('低溫') || name.includes('高溫') ||
                name.includes('雷雨') || name.includes('強風') || name.includes('濃霧') || name.includes('降雨')) {
                return 'weather';
            }
            if (name.includes('地震') || name.includes('海嘯') || name.includes('火山')) {
                return 'earthquake';
            }
            if (name.includes('淹水') || name.includes('河川') || name.includes('水庫') ||
                name.includes('土石�?) || name.includes('崩塌') || name.includes('分洪')) {
                return 'flood';
            }
            if (name.includes('道路') || name.includes('交�?) || name.includes('高速公�?) || name.includes('鐵路')) {
                return 'traffic';
            }
            if (name.includes('火災') || name.includes('林火')) {
                return 'fire';
            }
            return 'other';
        };

        alertsData.forEach((alert) => {
            const typeName = (alert as { alertTypeName?: string }).alertTypeName || '';
            const category = getCategory(typeName);
            stats[category] = (stats[category] || 0) + 1;
        });
        return stats;
    }, [alertsData]);

    // 事件趨勢圖數�?
    const eventTrendData = useMemo(() => {
        const alertCounts = new Array(dateRange).fill(0);

        if (alertsData && Array.isArray(alertsData)) {
            alertsData.forEach((alert) => {
                const createdAt = (alert as { createdAt?: string }).createdAt;
                if (createdAt) {
                    const alertDate = new Date(createdAt);
                    const today = new Date();
                    const diffDays = Math.floor((today.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0 && diffDays < dateRange) {
                        alertCounts[dateRange - 1 - diffDays]++;
                    }
                }
            });
        }

        return {
            labels: dateLabels,
            datasets: [
                {
                    label: 'NCDR 警報',
                    data: alertCounts,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };
    }, [alertsData, dateLabels, dateRange]);

    // 物資類別分布�?
    const resourceCategoryData = {
        labels: resourceStats?.byCategory
            ? Object.keys(resourceStats.byCategory).map(k => RESOURCE_CATEGORY_CONFIG[k]?.label || k)
            : [],
        datasets: [{
            data: resourceStats?.byCategory ? Object.values(resourceStats.byCategory) : [],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',   // red
                'rgba(59, 130, 246, 0.8)',  // blue
                'rgba(16, 185, 129, 0.8)',  // green
                'rgba(245, 158, 11, 0.8)',  // amber
                'rgba(139, 92, 246, 0.8)',  // purple
                'rgba(236, 72, 153, 0.8)',  // pink
                'rgba(99, 102, 241, 0.8)',  // indigo
            ],
            borderWidth: 0,
        }],
    };

    // 志工狀態分�?
    const volunteerStatusData = {
        labels: ['可用', '執勤�?, '離線'],
        datasets: [{
            label: '志工人數',
            data: [
                volunteerStats?.available || 0,
                volunteerStats?.busy || 0,
                volunteerStats?.offline || 0
            ],
            backgroundColor: [
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(156, 163, 175, 0.8)',
            ],
        }],
    };

    // 回報狀態分�?
    const reportStatusData = {
        labels: ['待處�?, '已確�?, '已駁�?],
        datasets: [{
            data: [
                reportStats?.pending || 0,
                reportStats?.confirmed || 0,
                reportStats?.rejected || 0,
            ],
            backgroundColor: [
                'rgba(245, 158, 11, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(239, 68, 68, 0.8)',
            ],
            borderWidth: 0,
        }],
    };

    // NCDR 警報類別�?
    const ncdrCategoryData = {
        labels: Object.keys(ncdrCategoryStats).map(key => NCDR_CATEGORY_CONFIG[key]?.label || key),
        datasets: [{
            data: Object.values(ncdrCategoryStats),
            backgroundColor: Object.keys(ncdrCategoryStats).map(key => NCDR_CATEGORY_CONFIG[key]?.color || 'rgba(156, 163, 175, 0.8)'),
            borderWidth: 0,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
        },
    };

    // 計算 KPI 數據
    const totalResources = resourceStats?.total || 0;
    const lowStockCount = resourceStats?.lowStock || 0;
    const totalVolunteers = (volunteerStats?.available || 0) + (volunteerStats?.busy || 0) + (volunteerStats?.offline || 0);
    const busyVolunteers = volunteerStats?.busy || 0;
    const totalAlerts = alertsData?.length || 0;
    const totalReports = reportStats?.total || 0;
    const pendingReports = reportStats?.pending || 0;
    const activeEvents = eventStats?.active || 0;
    const taskCompleted = taskStats?.completed || 0;
    const taskTotal = (taskStats?.pending || 0) + (taskStats?.inProgress || 0) + (taskStats?.completed || 0);
    const taskCompletionRate = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

    // 格式化時�?
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    // 交易類型標籤
    const getTransactionLabel = (type: string) => {
        const labels: Record<string, { text: string; class: string }> = {
            in: { text: '入庫', class: 'badge-success' },
            out: { text: '出庫', class: 'badge-danger' },
            transfer: { text: '調撥', class: 'badge-info' },
            donation: { text: '捐贈', class: 'badge-primary' },
            adjustment: { text: '調整', class: 'badge-warning' },
        };
        return labels[type] || { text: type, class: 'badge-secondary' };
    };

    return (
        <div className="page analytics-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📊 數據分析儀表板</h2>
                    <p className="page-subtitle">系統整體運作狀態總�?/p>
                </div>
                <div className="date-range-selector">
                    <Button
                        variant={dateRange === 7 ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setDateRange(7)}
                    >
                        7 �?
                    </Button>
                    <Button
                        variant={dateRange === 14 ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setDateRange(14)}
                    >
                        14 �?
                    </Button>
                    <Button
                        variant={dateRange === 30 ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setDateRange(30)}
                    >
                        30 �?
                    </Button>
                </div>
            </div>

            {/* 6 �?KPI 摘要卡片 */}
            <div className="kpi-grid">
                <Card className="kpi-card kpi-card--resources" padding="md">
                    <div className="kpi-card__header">
                        <span className="kpi-card__icon">📦</span>
                        <span className="kpi-card__title">物資管理</span>
                    </div>
                    <div className="kpi-card__value">{totalResources}</div>
                    <div className="kpi-card__subtitle">物資種類</div>
                    <div className="kpi-card__detail">
                        {lowStockCount > 0 ? (
                            <span className="kpi-detail--warning">⚠️ {lowStockCount} 項低庫存</span>
                        ) : (
                            <span className="kpi-detail--success">�?庫存充足</span>
                        )}
                    </div>
                </Card>

                <Card className="kpi-card kpi-card--volunteers" padding="md">
                    <div className="kpi-card__header">
                        <span className="kpi-card__icon">👥</span>
                        <span className="kpi-card__title">志工團隊</span>
                    </div>
                    <div className="kpi-card__value">{totalVolunteers}</div>
                    <div className="kpi-card__subtitle">志工人數</div>
                    <div className="kpi-card__detail">
                        <span className="kpi-detail--info">🟢 {busyVolunteers} 人執勤中</span>
                    </div>
                </Card>

                <Card className="kpi-card kpi-card--alerts" padding="md">
                    <div className="kpi-card__header">
                        <span className="kpi-card__icon">🚨</span>
                        <span className="kpi-card__title">NCDR 警報</span>
                    </div>
                    <div className="kpi-card__value">{totalAlerts}</div>
                    <div className="kpi-card__subtitle">即時警報</div>
                    <div className="kpi-card__detail">
                        <span className="kpi-detail--neutral">過去 {dateRange} �?/span>
                    </div>
                </Card>

                <Card className="kpi-card kpi-card--reports" padding="md">
                    <div className="kpi-card__header">
                        <span className="kpi-card__icon">📢</span>
                        <span className="kpi-card__title">災情回報</span>
                    </div>
                    <div className="kpi-card__value">{totalReports}</div>
                    <div className="kpi-card__subtitle">回報總數</div>
                    <div className="kpi-card__detail">
                        {pendingReports > 0 ? (
                            <span className="kpi-detail--warning">�?{pendingReports} 件待處理</span>
                        ) : (
                            <span className="kpi-detail--success">�?全部處理完成</span>
                        )}
                    </div>
                </Card>

                <Card className="kpi-card kpi-card--events" padding="md">
                    <div className="kpi-card__header">
                        <span className="kpi-card__icon">📋</span>
                        <span className="kpi-card__title">事件管理</span>
                    </div>
                    <div className="kpi-card__value">{activeEvents}</div>
                    <div className="kpi-card__subtitle">進行中事�?/div>
                    <div className="kpi-card__detail">
                        <span className="kpi-detail--neutral">需持續關注</span>
                    </div>
                </Card>

                <Card className="kpi-card kpi-card--tasks" padding="md">
                    <div className="kpi-card__header">
                        <span className="kpi-card__icon">�?/span>
                        <span className="kpi-card__title">任務進度</span>
                    </div>
                    <div className="kpi-card__value">{taskCompletionRate}%</div>
                    <div className="kpi-card__subtitle">完成�?/div>
                    <div className="kpi-card__detail">
                        <span className="kpi-detail--info">{taskCompleted}/{taskTotal} 已完�?/span>
                    </div>
                </Card>
            </div>

            {/* 趨勢�?*/}
            <Card title="📈 NCDR 警報趨勢" padding="lg" className="chart-card">
                <div className="chart-container chart-container--lg">
                    <Line data={eventTrendData} options={{
                        ...chartOptions,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }} />
                </div>
            </Card>

            {/* 雙欄圖表 */}
            <div className="charts-grid">
                <Card title="📦 物資類別分布" padding="lg" className="chart-card">
                    <div className="chart-container">
                        {Object.keys(resourceStats?.byCategory || {}).length > 0 ? (
                            <Doughnut data={resourceCategoryData} options={chartOptions} />
                        ) : (
                            <div className="no-data-placeholder">
                                <span>📭</span>
                                <p>尚無物資資料</p>
                            </div>
                        )}
                    </div>
                </Card>

                <Card title="🚨 NCDR 警報分類" padding="lg" className="chart-card">
                    <div className="chart-container">
                        {Object.keys(ncdrCategoryStats).length > 0 ? (
                            <Pie data={ncdrCategoryData} options={chartOptions} />
                        ) : (
                            <div className="no-data-placeholder">
                                <span>📭</span>
                                <p>目前無警報資�?/p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* 第二排雙欄圖�?*/}
            <div className="charts-grid">
                <Card title="👥 志工狀態分�? padding="lg" className="chart-card">
                    <div className="chart-container">
                        <Bar data={volunteerStatusData} options={{
                            ...chartOptions,
                            indexAxis: 'y' as const,
                        }} />
                    </div>
                </Card>

                <Card title="📢 回報處理狀�? padding="lg" className="chart-card">
                    <div className="chart-container">
                        {totalReports > 0 ? (
                            <Doughnut data={reportStatusData} options={chartOptions} />
                        ) : (
                            <div className="no-data-placeholder">
                                <span>📭</span>
                                <p>尚無回報資料</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* 即時活動摘要 */}
            <div className="activity-section">
                <div className="activity-grid">
                    <Card title="📦 最近物資異�? padding="md" className="activity-card">
                        <div className="activity-list">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.slice(0, 5).map((tx: { id: string; type: string; operatorName: string; createdAt: string; quantity: number }) => {
                                    const label = getTransactionLabel(tx.type);
                                    return (
                                        <div key={tx.id} className="activity-item">
                                            <span className={`activity-badge ${label.class}`}>{label.text}</span>
                                            <span className="activity-text">{tx.operatorName}</span>
                                            <span className="activity-meta">
                                                {tx.quantity > 0 ? '+' : ''}{tx.quantity} · {formatTime(tx.createdAt)}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="activity-empty">暫無異動紀�?/div>
                            )}
                        </div>
                    </Card>

                    <Card title="🚨 最�?NCDR 警報" padding="md" className="activity-card">
                        <div className="activity-list">
                            {alertsData && alertsData.length > 0 ? (
                                alertsData.slice(0, 5).map((alert: { id: string; title: string; severity?: string; createdAt?: string }) => (
                                    <div key={alert.id} className="activity-item">
                                        <span className={`activity-badge badge-${alert.severity || 'info'}`}>
                                            {alert.severity === 'critical' ? '緊�? : alert.severity === 'warning' ? '警告' : '資訊'}
                                        </span>
                                        <span className="activity-text" title={alert.title}>
                                            {alert.title.length > 20 ? alert.title.substring(0, 20) + '...' : alert.title}
                                        </span>
                                        <span className="activity-meta">
                                            {alert.createdAt ? formatTime(alert.createdAt) : ''}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="activity-empty">目前無警�?/div>
                            )}
                        </div>
                    </Card>

                    <Card title="📢 最新災情回�? padding="md" className="activity-card">
                        <div className="activity-list">
                            {recentReports && recentReports.length > 0 ? (
                                recentReports.slice(0, 5).map((report: { id: string; title: string; status: string; createdAt: string }) => (
                                    <div key={report.id} className="activity-item">
                                        <span className={`activity-badge badge-${report.status === 'pending' ? 'warning' : report.status === 'confirmed' ? 'success' : 'danger'}`}>
                                            {report.status === 'pending' ? '待處�? : report.status === 'confirmed' ? '已確�? : '已駁�?}
                                        </span>
                                        <span className="activity-text" title={report.title}>
                                            {report.title.length > 20 ? report.title.substring(0, 20) + '...' : report.title}
                                        </span>
                                        <span className="activity-meta">{formatTime(report.createdAt)}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="activity-empty">暫無回報</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
