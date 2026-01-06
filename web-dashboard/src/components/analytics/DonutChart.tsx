/**
 * DonutChart Component
 * Displays distribution data with SVG donut chart
 */

import React, { useMemo } from 'react';
import './DonutChart.css';

export interface DonutDataItem {
    label: string;
    value: number;
    color: string;
}

export interface DonutChartProps {
    data: DonutDataItem[];
    title?: string;
    size?: number;
    thickness?: number;
    showLegend?: boolean;
    showPercentage?: boolean;
    centerLabel?: string;
    centerValue?: string | number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
    data,
    title,
    size = 180,
    thickness = 24,
    showLegend = true,
    showPercentage = true,
    centerLabel,
    centerValue,
}) => {
    const chartData = useMemo(() => {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        if (total === 0) return { paths: [], total: 0 };

        const radius = (size - thickness) / 2;
        const center = size / 2;
        let currentAngle = -90; // Start from top

        const paths = data.map(item => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;

            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // Calculate arc path
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return {
                ...item,
                percentage,
                path,
                startAngle,
                endAngle,
            };
        });

        return { paths, total };
    }, [data, size, thickness]);

    if (data.length === 0 || chartData.total === 0) {
        return (
            <div className="donut-chart donut-chart--empty">
                {title && <h4 className="donut-chart__title">{title}</h4>}
                <p>暫無數據</p>
            </div>
        );
    }

    const innerRadius = (size - thickness * 2) / 2;

    return (
        <div className="donut-chart">
            {title && <h4 className="donut-chart__title">{title}</h4>}

            <div className="donut-chart__container">
                <svg width={size} height={size} className="donut-chart__svg">
                    {/* Pie slices */}
                    {chartData.paths.map((item, i) => (
                        <path
                            key={i}
                            d={item.path}
                            fill={item.color}
                            className="donut-chart__slice"
                            style={{ animationDelay: `${i * 0.1}s` }}
                        >
                            <title>{`${item.label}: ${item.value} (${item.percentage.toFixed(1)}%)`}</title>
                        </path>
                    ))}

                    {/* Center hole */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={innerRadius}
                        fill="var(--bg-secondary, #21262d)"
                    />

                    {/* Center label */}
                    {(centerLabel || centerValue !== undefined) && (
                        <g>
                            {centerValue !== undefined && (
                                <text
                                    x={size / 2}
                                    y={size / 2 - 4}
                                    textAnchor="middle"
                                    className="donut-chart__center-value"
                                >
                                    {centerValue}
                                </text>
                            )}
                            {centerLabel && (
                                <text
                                    x={size / 2}
                                    y={size / 2 + 14}
                                    textAnchor="middle"
                                    className="donut-chart__center-label"
                                >
                                    {centerLabel}
                                </text>
                            )}
                        </g>
                    )}
                </svg>

                {/* Legend */}
                {showLegend && (
                    <div className="donut-chart__legend">
                        {chartData.paths.map((item, i) => (
                            <div key={i} className="donut-chart__legend-item">
                                <span
                                    className="donut-chart__legend-color"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="donut-chart__legend-label">{item.label}</span>
                                {showPercentage && (
                                    <span className="donut-chart__legend-value">
                                        {item.percentage.toFixed(0)}%
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DonutChart;
