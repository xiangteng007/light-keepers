/**
 * TrendChart Component
 * Displays time-series data with SVG line chart
 */

import React, { useMemo } from 'react';
import './TrendChart.css';

export interface TrendDataPoint {
    label: string;
    value: number;
    timestamp?: Date;
}

export interface TrendChartProps {
    data: TrendDataPoint[];
    title?: string;
    height?: number;
    color?: string;
    showGrid?: boolean;
    showLabels?: boolean;
    showTooltip?: boolean;
    fillArea?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
    data,
    title,
    height = 200,
    color = '#58a6ff',
    showGrid = true,
    showLabels = true,
    fillArea = true,
}) => {
    const chartData = useMemo(() => {
        if (data.length === 0) return { points: '', areaPath: '', max: 0, min: 0, chartHeight: 0, padding: 40 };

        const values = data.map(d => d.value);
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const range = max - min || 1;

        const padding = 40;
        const chartHeight = height - padding * 2;

        const points = data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * 100;
            const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
            return `${x},${y}`;
        }).join(' ');

        // Create area path
        const areaPath = data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * 100;
            const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ') + ` L 100 ${padding + chartHeight} L 0 ${padding + chartHeight} Z`;

        return { points, areaPath, max, min, chartHeight, padding };
    }, [data, height]);

    if (data.length === 0) {
        return (
            <div className="trend-chart trend-chart--empty" style={{ height }}>
                <p>暫無數據</p>
            </div>
        );
    }

    return (
        <div className="trend-chart">
            {title && <h4 className="trend-chart__title">{title}</h4>}

            <svg
                viewBox={`0 0 100 ${height}`}
                preserveAspectRatio="none"
                className="trend-chart__svg"
                style={{ height }}
            >
                {/* Grid lines */}
                {showGrid && (
                    <g className="trend-chart__grid">
                        {[0, 25, 50, 75, 100].map(pct => (
                            <line
                                key={`h-${pct}`}
                                x1="0"
                                y1={chartData.padding + (chartData.chartHeight || 0) * (pct / 100)}
                                x2="100"
                                y2={chartData.padding + (chartData.chartHeight || 0) * (pct / 100)}
                                stroke="currentColor"
                                strokeOpacity="0.1"
                                strokeWidth="0.2"
                            />
                        ))}
                    </g>
                )}

                {/* Area fill */}
                {fillArea && (
                    <path
                        d={chartData.areaPath}
                        fill={`url(#gradient-${color.replace('#', '')})`}
                        opacity="0.3"
                    />
                )}

                {/* Gradient definition */}
                <defs>
                    <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Line */}
                <polyline
                    points={chartData.points}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Data points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1 || 1)) * 100;
                    const y = chartData.padding + (chartData.chartHeight || 0) -
                        ((d.value - chartData.min) / (chartData.max - chartData.min || 1)) * (chartData.chartHeight || 0);
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="1"
                            fill={color}
                            className="trend-chart__point"
                        >
                            <title>{`${d.label}: ${d.value}`}</title>
                        </circle>
                    );
                })}
            </svg>

            {/* Labels */}
            {showLabels && (
                <div className="trend-chart__labels">
                    <span className="trend-chart__label--max">{chartData.max}</span>
                    <span className="trend-chart__label--min">{chartData.min}</span>
                </div>
            )}

            {/* X-axis labels */}
            {showLabels && data.length > 0 && (
                <div className="trend-chart__x-labels">
                    <span>{data[0].label}</span>
                    <span>{data[data.length - 1].label}</span>
                </div>
            )}
        </div>
    );
};

export default TrendChart;
