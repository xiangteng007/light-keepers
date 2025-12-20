import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <button
            className={`lk-btn lk-btn--${variant} lk-btn--${size} ${loading ? 'lk-btn--loading' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className="lk-btn__spinner" />}
            {icon && <span className="lk-btn__icon">{icon}</span>}
            <span className="lk-btn__text">{children}</span>
        </button>
    );
};

export default Button;
