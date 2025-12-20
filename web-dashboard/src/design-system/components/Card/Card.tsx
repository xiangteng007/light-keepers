import React from 'react';
import './Card.css';

export interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    footer?: React.ReactNode;
    variant?: 'default' | 'elevated' | 'outlined';
    padding?: 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}


export const Card: React.FC<CardProps> = ({
    children,
    title,
    subtitle,
    icon,
    footer,
    variant = 'default',
    padding = 'md',
    className = '',
    onClick,
}) => {
    return (
        <div
            className={`lk-card lk-card--${variant} lk-card--padding-${padding} ${className}`}
            onClick={onClick}
        >
            {(title || icon) && (
                <div className="lk-card__header">
                    {icon && <span className="lk-card__icon">{icon}</span>}
                    <div className="lk-card__header-text">
                        {title && <h3 className="lk-card__title">{title}</h3>}
                        {subtitle && <p className="lk-card__subtitle">{subtitle}</p>}
                    </div>
                </div>
            )}
            <div className="lk-card__body">{children}</div>
            {footer && <div className="lk-card__footer">{footer}</div>}
        </div>
    );
};


export default Card;
