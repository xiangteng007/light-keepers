import { useState } from 'react';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, Badge } from '../design-system';
import { getResourceStats, getReportStats, getVolunteerStats, getNcdrAlerts } from '../api';
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

// 生成模擬趨勢數據 (實際應從 API 獲取)
function generateTrendData(baseValue: number, days: number, variance: number): number[] {
    const data = [];
    let current = baseValue;
    for (let i = 0; i < days; i++) {
        current += Math.floor(Math.random() * variance * 2) - variance;
        current = Math.max(0, current);
        data.push(current);
    }
    return data;
}

export default function AnalyticsPage() {
    const [dateRange] = useState(14); // 預設 14 天

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

    const dateLabels = getDateLabels(dateRange);

    // 事件趨勢圖數據
    const eventTrendData = {
        labels: dateLabels,
        datasets: [
            {
                label: '回報數量',
                data: generateTrendData(reportStats?.total || 5, dateRange, 3),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'NCDR 警報',
                data: generateTrendData(alertsData?.length || 3, dateRange, 2),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // 物資類別分布圖
    const resourceCategoryData = {
        labels: resourceStats?.byCategory ? Object.keys(resourceStats.byCategory) : ['食品', '醫療', '設備', '其他'],
        datasets: [{
            data: resourceStats?.byCategory ? Object.values(resourceStats.byCategory) : [30, 25, 20, 15],
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)',
                'rgba(99, 102, 241, 0.8)',
            ],
            borderWidth: 0,
        }],
    };

    // 志工狀態分布
    const volunteerStatusData = {
        labels: ['可用', '執勤中', '離線'],
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

    // 回報類型分布
    const reportTypeData = {
        labels: reportStats?.byType ? Object.keys(reportStats.byType) : ['淹水', '道路', '建物', '其他'],
        datasets: [{
            label: '回報數量',
            data: reportStats?.byType ? Object.values(reportStats.byType) : [10, 8, 5, 3],
            backgroundColor: 'rgba(139, 92, 246, 0.8)',
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

    return (
        <div className="page analytics-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📈 數據分析</h2>
                    <p className="page-subtitle">歷史趨勢與統計圖表</p>
                </div>
                <Badge variant="info">過去 {dateRange} 天</Badge>
            </div>

            {/* 趨勢圖 */}
            <Card title="📊 事件趨勢" padding="lg" className="chart-card">
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
                        <Doughnut data={resourceCategoryData} options={chartOptions} />
                    </div>
                </Card>

                <Card title="👥 志工狀態" padding="lg" className="chart-card">
                    <div className="chart-container">
                        <Bar data={volunteerStatusData} options={{
                            ...chartOptions,
                            indexAxis: 'y' as const,
                        }} />
                    </div>
                </Card>
            </div>

            {/* 回報類型分布 */}
            <div className="charts-grid">
                <Card title="📢 回報類型分布" padding="lg" className="chart-card">
                    <div className="chart-container">
                        <Bar data={reportTypeData} options={chartOptions} />
                    </div>
                </Card>

                <Card title="🗺️ 地區分布" padding="lg" className="chart-card">
                    <div className="chart-container heatmap-placeholder">
                        <div className="heatmap-icon">🗺️</div>
                        <p>地區分布熱力圖</p>
                        <small>整合於地圖頁面</small>
                    </div>
                </Card>
            </div>
        </div>
    );
}
