import React from 'react';
import './ManualButton.css';

interface ManualButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

export const ManualButton: React.FC<ManualButtonProps> = ({
    children,
    onClick,
    disabled = false,
    fullWidth = false,
    className = '',
    type = 'button',
}) => {
    return (
        <button
            type={type}
            className={`manual-button ${fullWidth ? 'manual-button--full-width' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
