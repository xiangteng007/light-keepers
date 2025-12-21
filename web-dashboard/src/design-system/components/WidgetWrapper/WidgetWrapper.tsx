import React, { useState } from 'react';
import './WidgetWrapper.css';

export interface WidgetWrapperProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    loading?: boolean;
    variant?: 'default' | 'elevated' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    className?: string;
}

export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
    title,
    subtitle,
    icon,
    actions,
    children,
    collapsible = false,
    defaultCollapsed = false,
    loading = false,
    variant = 'default',
    padding = 'md',
    className = '',
}) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    const wrapperClasses = [
        'lk-widget',
        `lk-widget--${variant}`,
        `lk-widget--padding-${padding}`,
        isCollapsed ? 'lk-widget--collapsed' : '',
        loading ? 'lk-widget--loading' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={wrapperClasses}>
            <div className="lk-widget__header">
                <div className="lk-widget__header-left">
                    {icon && <span className="lk-widget__icon">{icon}</span>}
                    <div className="lk-widget__header-text">
                        <h3 className="lk-widget__title">{title}</h3>
                        {subtitle && <p className="lk-widget__subtitle">{subtitle}</p>}
                    </div>
                </div>
                <div className="lk-widget__header-right">
                    {actions && <div className="lk-widget__actions">{actions}</div>}
                    {collapsible && (
                        <button
                            className="lk-widget__collapse-btn"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            aria-expanded={!isCollapsed}
                            aria-label={isCollapsed ? '展開' : '收合'}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{
                                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            <div className="lk-widget__body">
                {loading ? (
                    <div className="lk-widget__loading">
                        <div className="lk-widget__loading-spinner" />
                        <span>載入中...</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default WidgetWrapper;
