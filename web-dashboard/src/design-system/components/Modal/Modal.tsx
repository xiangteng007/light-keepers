import React, { useEffect, useCallback } from 'react';
import './Modal.css';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    closable?: boolean;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    size = 'md',
    closable = true,
    children,
    footer,
    className = '',
}) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && closable) {
            onClose();
        }
    }, [closable, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="lk-modal-overlay" onClick={closable ? onClose : undefined}>
            <div
                className={`lk-modal lk-modal--${size} ${className}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
            >
                {(title || closable) && (
                    <div className="lk-modal__header">
                        <div className="lk-modal__header-text">
                            {title && <h2 id="modal-title" className="lk-modal__title">{title}</h2>}
                            {subtitle && <p className="lk-modal__subtitle">{subtitle}</p>}
                        </div>
                        {closable && (
                            <button
                                className="lk-modal__close"
                                onClick={onClose}
                                aria-label="關閉"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="lk-modal__body">
                    {children}
                </div>
                {footer && (
                    <div className="lk-modal__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
