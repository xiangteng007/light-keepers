import React, { forwardRef, useState } from 'react';
import './InputField.css';

export interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
    label?: string;
    helperText?: string;
    error?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'filled' | 'outlined';
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    fullWidth?: boolean;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(({
    label,
    helperText,
    error,
    size = 'md',
    variant = 'default',
    prefix,
    suffix,
    fullWidth = false,
    className = '',
    disabled,
    id,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const containerClasses = [
        'lk-input',
        `lk-input--${size}`,
        `lk-input--${variant}`,
        isFocused ? 'lk-input--focused' : '',
        error ? 'lk-input--error' : '',
        disabled ? 'lk-input--disabled' : '',
        fullWidth ? 'lk-input--full-width' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            {label && (
                <label htmlFor={inputId} className="lk-input__label">
                    {label}
                </label>
            )}
            <div className="lk-input__wrapper">
                {prefix && <span className="lk-input__prefix">{prefix}</span>}
                <input
                    ref={ref}
                    id={inputId}
                    className="lk-input__field"
                    disabled={disabled}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    {...props}
                />
                {suffix && <span className="lk-input__suffix">{suffix}</span>}
                <div className="lk-input__focus-ring" />
            </div>
            {(helperText || error) && (
                <span className={`lk-input__helper ${error ? 'lk-input__helper--error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    );
});

InputField.displayName = 'InputField';

export default InputField;
