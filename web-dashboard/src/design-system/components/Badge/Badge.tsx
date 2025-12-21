import React from 'react';
import './Badge.css';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'gradient' | 'subtle';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    dot?: boolean;
    pulse?: boolean;
    icon?: React.ReactNode;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    dot = false,
    pulse = false,
    icon,
    className = '',
}) => {
    const badgeClasses = [
        'lk-badge',
        `lk-badge--${variant}`,
        `lk-badge--${size}`,
        pulse ? 'lk-badge--pulse' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <span className={badgeClasses}>
            {dot && <span className="lk-badge__dot" />}
            {icon && <span className="lk-badge__icon">{icon}</span>}
            <span className="lk-badge__text">{children}</span>
        </span>
    );
};

export default Badge;

