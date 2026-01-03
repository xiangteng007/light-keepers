import React from 'react';
import './RiskBadge.css';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskBadgeProps {
    level: RiskLevel;
    showIcon?: boolean;
    showText?: boolean;
    className?: string;
}

const RISK_CONFIG = {
    low: {
        icon: '✓',
        text: '低風險',
        label: 'Low Risk',
    },
    medium: {
        icon: '⚠',
        text: '中風險',
        label: 'Medium Risk',
    },
    high: {
        icon: '⚠',
        text: '高風險',
        label: 'High Risk',
    },
    critical: {
        icon: '⚠',
        text: '極危',
        label: 'Critical Risk',
    },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
    level,
    showIcon = true,
    showText = true,
    className = '',
}) => {
    const config = RISK_CONFIG[level];

    return (
        <span
            className={`risk-badge risk-badge--${level} ${className}`}
            role="status"
            aria-label={config.label}
        >
            {showIcon && <span className="risk-badge__icon">{config.icon}</span>}
            {showText && <span className="risk-badge__text">{config.text}</span>}
        </span>
    );
};
