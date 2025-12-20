import React from 'react';
import './Badge.css';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    dot?: boolean;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    dot = false,
    className = '',
}) => {
    return (
        <span className={`lk-badge lk-badge--${variant} lk-badge--${size} ${className}`}>
            {dot && <span className="lk-badge__dot" />}
            {children}
        </span>
    );
};

export default Badge;
