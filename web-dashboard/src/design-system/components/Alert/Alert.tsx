import React from 'react';
import { InfoIcon, CheckIcon, WarningIcon, SirenIcon, CloseIcon } from '../../icons';
import './Alert.css';

export interface AlertProps {
    children: React.ReactNode;
    variant?: 'info' | 'success' | 'warning' | 'danger';
    title?: string;
    icon?: React.ReactNode;
    closable?: boolean;
    onClose?: () => void;
    className?: string;
}

export const Alert: React.FC<AlertProps> = ({
    children,
    variant = 'info',
    title,
    icon,
    closable = false,
    onClose,
    className = '',
}) => {
    const defaultIcons: Record<NonNullable<AlertProps['variant']>, React.ReactNode> = {
        info: <InfoIcon size={20} aria-hidden="true" />,
        success: <CheckIcon size={20} aria-hidden="true" />,
        warning: <WarningIcon size={20} aria-hidden="true" />,
        danger: <SirenIcon size={20} aria-hidden="true" />,
    };

    return (
        <div className={`lk-alert lk-alert--${variant} ${className}`} role="alert">
            <span className="lk-alert__icon">{icon || defaultIcons[variant]}</span>
            <div className="lk-alert__content">
                {title && <strong className="lk-alert__title">{title}</strong>}
                <div className="lk-alert__message">{children}</div>
            </div>
            {closable && (
                <button className="lk-alert__close" onClick={onClose} aria-label="關閉">
                    <CloseIcon size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    );
};

export default Alert;
