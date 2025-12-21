import React from 'react';
import './Indicators.css';

// ===== Progress Bar =====
export interface ProgressBarProps {
    value: number;
    max?: number;
    label?: string;
    showValue?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient';
    animated?: boolean;
    className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    label,
    showValue = true,
    size = 'md',
    variant = 'gradient',
    animated = true,
    className = '',
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={`lk-progress lk-progress--${size} ${className}`}>
            {(label || showValue) && (
                <div className="lk-progress__header">
                    {label && <span className="lk-progress__label">{label}</span>}
                    {showValue && (
                        <span className="lk-progress__value">
                            {Math.round(percentage)}%
                        </span>
                    )}
                </div>
            )}
            <div className="lk-progress__track">
                <div
                    className={`lk-progress__bar lk-progress__bar--${variant} ${animated ? 'lk-progress__bar--animated' : ''}`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                />
            </div>
        </div>
    );
};

// ===== Circular Progress =====
export interface CircularProgressProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    showValue?: boolean;
    label?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient';
    className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    value,
    max = 100,
    size = 80,
    strokeWidth = 8,
    showValue = true,
    label,
    variant = 'gradient',
    className = '',
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className={`lk-circular ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="lk-circular__svg">
                <circle
                    className="lk-circular__track"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <circle
                    className={`lk-circular__bar lk-circular__bar--${variant}`}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            {(showValue || label) && (
                <div className="lk-circular__content">
                    {showValue && (
                        <span className="lk-circular__value">
                            {Math.round(percentage)}%
                        </span>
                    )}
                    {label && <span className="lk-circular__label">{label}</span>}
                </div>
            )}
        </div>
    );
};

// ===== Stat Indicator =====
export interface StatIndicatorProps {
    value: string | number;
    label: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const StatIndicator: React.FC<StatIndicatorProps> = ({
    value,
    label,
    icon,
    trend,
    trendValue,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    return (
        <div className={`lk-stat lk-stat--${size} lk-stat--${variant} ${className}`}>
            {icon && <span className="lk-stat__icon">{icon}</span>}
            <div className="lk-stat__content">
                <span className="lk-stat__value">{value}</span>
                <span className="lk-stat__label">{label}</span>
            </div>
            {trend && (
                <span className={`lk-stat__trend lk-stat__trend--${trend}`}>
                    {trend === 'up' && '↑'}
                    {trend === 'down' && '↓'}
                    {trend === 'neutral' && '→'}
                    {trendValue && <span>{trendValue}</span>}
                </span>
            )}
        </div>
    );
};

export default { ProgressBar, CircularProgress, StatIndicator };
