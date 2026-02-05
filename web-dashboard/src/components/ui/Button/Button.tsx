/**
 * Light Keepers - Button Component
 * Unified button with 6 variants
 */
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'outline' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const sizeClass = size !== 'md' ? `lk-btn--${size}` : '';
    const variantClass = `lk-btn--${variant}`;
    const loadingClass = loading ? 'lk-btn--loading' : '';

    return (
      <button
        ref={ref}
        className={`lk-btn ${variantClass} ${sizeClass} ${loadingClass} ${className}`.trim()}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="lk-btn__spinner" aria-hidden="true" />}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
