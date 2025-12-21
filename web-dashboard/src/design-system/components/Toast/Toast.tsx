import React, { useEffect, useState } from 'react';
import './Toast.css';

export interface ToastProps {
    id: string;
    message: string;
    title?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    duration?: number;
    closable?: boolean;
    onClose: (id: string) => void;
    icon?: React.ReactNode;
}

const defaultIcons: Record<string, string> = {
    default: '💬',
    success: '✅',
    warning: '⚠️',
    danger: '🚨',
    info: 'ℹ️',
};

export const Toast: React.FC<ToastProps> = ({
    id,
    message,
    title,
    variant = 'default',
    duration = 5000,
    closable = true,
    onClose,
    icon,
}) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(id);
        }, 300);
    };

    return (
        <div
            className={`lk-toast lk-toast--${variant} ${isExiting ? 'lk-toast--exiting' : ''}`}
            role="alert"
        >
            <div className="lk-toast__indicator" />
            <span className="lk-toast__icon">
                {icon || defaultIcons[variant]}
            </span>
            <div className="lk-toast__content">
                {title && <strong className="lk-toast__title">{title}</strong>}
                <p className="lk-toast__message">{message}</p>
            </div>
            {closable && (
                <button
                    className="lk-toast__close"
                    onClick={handleClose}
                    aria-label="關閉"
                >
                    ✕
                </button>
            )}
            {duration > 0 && (
                <div
                    className="lk-toast__progress"
                    style={{ animationDuration: `${duration}ms` }}
                />
            )}
        </div>
    );
};

// Toast Container Component
export interface ToastContainerProps {
    toasts: ToastProps[];
    onClose: (id: string) => void;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
    toasts,
    onClose,
    position = 'top-right',
}) => {
    return (
        <div className={`lk-toast-container lk-toast-container--${position}`}>
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>
    );
};

export default Toast;
