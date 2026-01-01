import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
import { Card } from '../../design-system';
import './AnalyticsCharts.css';

// 註冊 Chart.js 元件
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

// ===== 時間範圍選擇器 =====

export type TimeRange = '7d' | '30d' | '90d';

interface TimeRangeSelectorProps {
    value: TimeRange;
    onChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
    return (
        <div className="time-range-selector">
            {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
                <button
                    key={range}
                    className={`time-range-btn ${value === range ? 'active' : ''}`}
                    onClick={() => onChange(range)}
                >
                    {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
                </button>
            ))}
        </div>
    );
}

// ===== 回報趨勢圖 =====

interface TrendData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
    }[];
}

interface TrendChartProps {
    title: string;
    data: TrendData;
    height?: number;
}

export function TrendChart({ title, data, height = 300 }: TrendChartProps) {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                },
            },
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
    };

    const chartData = {
        labels: data.labels,
        datasets: data.datasets.map((ds, i) => ({
            ...ds,
            tension: 0.4,
            fill: true,
            borderColor: ds.borderColor || getColor(i),
            backgroundColor: ds.backgroundColor || getColorWithAlpha(i, 0.2),
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
        })),
    };

    return (
        <Card className="analytics-chart">
            <div className="chart-header">
                <h3>{title}</h3>
            </div>
            <div className="chart-container" style={{ height }}>
                <Line options={options} data={chartData} />
            </div>
        </Card>
    );
}

// ===== 類型分佈圖（甜甜圈） =====

interface DistributionData {
    labels: string[];
    values: number[];
    colors?: string[];
}

interface DistributionChartProps {
    title: string;
    data: DistributionData;
    height?: number;
}

export function DistributionChart({ title, data, height = 280 }: DistributionChartProps) {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                },
            },
        },
        cutout: '60%',
    };

    const chartData = {
        labels: data.labels,
        datasets: [{
            data: data.values,
            backgroundColor: data.colors || data.labels.map((_, i) => getColor(i)),
            borderWidth: 0,
        }],
    };

    const total = data.values.reduce((sum, v) => sum + v, 0);

    return (
        <Card className="analytics-chart distribution-chart">
            <div className="chart-header">
                <h3>{title}</h3>
                <span className="chart-total">總計: {total}</span>
            </div>
            <div className="chart-container" style={{ height }}>
                <Doughnut options={options} data={chartData} />
            </div>
        </Card>
    );
}

// ===== 區域分佈圖（橫向柱狀圖） =====

interface RegionData {
    regions: string[];
    values: number[];
}

interface RegionChartProps {
    title: string;
    data: RegionData;
    height?: number;
}

export function RegionChart({ title, data, height = 300 }: RegionChartProps) {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                },
            },
        },
    };

    const chartData = {
        labels: data.regions,
        datasets: [{
            data: data.values,
            backgroundColor: data.values.map((v) => {
                const maxVal = Math.max(...data.values);
                const intensity = v / maxVal;
                return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
            }),
            borderRadius: 4,
        }],
    };

    return (
        <Card className="analytics-chart">
            <div className="chart-header">
                <h3>{title}</h3>
            </div>
            <div className="chart-container" style={{ height }}>
                <Bar options={options} data={chartData} />
            </div>
        </Card>
    );
}

// ===== 時段熱力圖 =====

interface HourlyData {
    hours: number[];  // 0-23
    values: number[];
}

interface HourlyHeatmapProps {
    title: string;
    data: HourlyData;
}

export function HourlyHeatmap({ title, data }: HourlyHeatmapProps) {
    const maxVal = Math.max(...data.values, 1);

    return (
        <Card className="analytics-chart">
            <div className="chart-header">
                <h3>{title}</h3>
            </div>
            <div className="hourly-heatmap">
                {data.hours.map((hour, i) => {
                    const intensity = data.values[i] / maxVal;
                    const bgColor = `rgba(59, 130, 246, ${0.1 + intensity * 0.9})`;

                    return (
                        <div
                            key={hour}
                            className="hour-cell"
                            style={{ backgroundColor: bgColor }}
                            title={`${hour}:00 - ${data.values[i]} 筆`}
                        >
                            <span className="hour-label">{hour}</span>
                            <span className="hour-value">{data.values[i]}</span>
                        </div>
                    );
                })}
            </div>
            <div className="heatmap-legend">
                <span>低</span>
                <div className="legend-gradient"></div>
                <span>高</span>
            </div>
        </Card>
    );
}

// ===== 輔助函數 =====

const COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
];

function getColor(index: number): string {
    return COLORS[index % COLORS.length];
}

function getColorWithAlpha(index: number, alpha: number): string {
    const hex = COLORS[index % COLORS.length];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
