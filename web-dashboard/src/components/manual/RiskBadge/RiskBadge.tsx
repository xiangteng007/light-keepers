import React from 'react';
import { CheckIcon, WarningIcon } from '../../../design-system/icons';
import './RiskBadge.css';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskBadgeProps {
    level: RiskLevel;
    showIcon?: boolean;
    showText?: boolean;
    className?: string;
}

// R5/T5c：icon 改用 B3c 教範圖例（低風險＝勾核、其餘＝三角警告）
const RISK_CONFIG = {
    low: {
        icon: <CheckIcon size={16} aria-hidden="true" />,
        text: '低風險',
        label: 'Low Risk',
    },
    medium: {
        icon: <WarningIcon size={16} aria-hidden="true" />,
        text: '中風險',
        label: 'Medium Risk',
    },
    high: {
        icon: <WarningIcon size={16} aria-hidden="true" />,
        text: '高風險',
        label: 'High Risk',
    },
    critical: {
        icon: <WarningIcon size={16} aria-hidden="true" />,
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
