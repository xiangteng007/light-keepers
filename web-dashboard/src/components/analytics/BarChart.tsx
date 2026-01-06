/**
 * BarChart Component
 * Displays comparative data with horizontal bars
 */

import React from 'react';
import './BarChart.css';

export interface BarDataItem {
    label: string;
    value: number;
    color?: string;
    icon?: string;
}

export interface BarChartProps {
    data: BarDataItem[];
    title?: string;
    maxValue?: number;
    showValues?: boolean;
    animate?: boolean;
    barHeight?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
    data,
    title,
    maxValue,
    showValues = true,
    animate = true,
    barHeight = 32,
}) => {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);
    const defaultColor = '#58a6ff';

    if (data.length === 0) {
        return (
            <div className="bar-chart bar-chart--empty">
                {title && <h4 className="bar-chart__title">{title}</h4>}
                <p>暫無數據</p>
            </div>
        );
    }

    return (
        <div className="bar-chart">
            {title && <h4 className="bar-chart__title">{title}</h4>}

            <div className="bar-chart__bars">
                {data.map((item, i) => {
                    const percentage = (item.value / max) * 100;

                    return (
                        <div
                            key={i}
                            className="bar-chart__item"
                            style={{ '--bar-height': `${barHeight}px` } as React.CSSProperties}
                        >
                            <div className="bar-chart__label">
                                {item.icon && <span className="bar-chart__icon">{item.icon}</span>}
                                <span className="bar-chart__label-text">{item.label}</span>
                            </div>

                            <div className="bar-chart__bar-container">
                                <div
                                    className={`bar-chart__bar ${animate ? 'bar-chart__bar--animate' : ''}`}
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: item.color || defaultColor,
                                        animationDelay: animate ? `${i * 0.1}s` : '0s',
                                    }}
                                />
                            </div>

                            {showValues && (
                                <div className="bar-chart__value">
                                    {item.value.toLocaleString()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BarChart;
