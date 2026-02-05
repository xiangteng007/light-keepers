/**
 * Input Component
 * 
 * A reusable form input component with multiple variants, states, and accessibility support.
 * Uses design tokens from components.css.
 * 
 * @example
 * <Input label="Email" type="email" placeholder="輸入電子郵件" />
 * <Input label="密碼" type="password" error="密碼不正確" />
 * <Input label="搜尋" leftIcon={<Search />} />
 */
import React, { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import './Input.css';

export type InputVariant = 'default' | 'filled' | 'outline' | 'ghost';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Variant style */
  variant?: InputVariant;
  /** Size of the input */
  size?: InputSize;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Left icon/element */
  leftIcon?: ReactNode;
  /** Right icon/element */
  rightIcon?: ReactNode;
  /** Full width */
  fullWidth?: boolean;
  /** Container className */
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      variant = 'default',
      size = 'md',
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled = false,
      required = false,
      className = '',
      containerClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const containerClasses = [
      'input-container',
      fullWidth && 'input-container--full-width',
      containerClassName,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      'input-wrapper',
      `input-wrapper--${variant}`,
      `input-wrapper--${size}`,
      error && 'input-wrapper--error',
      disabled && 'input-wrapper--disabled',
      leftIcon && 'input-wrapper--has-left-icon',
      rightIcon && 'input-wrapper--has-right-icon',
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = ['input', className].filter(Boolean).join(' ');

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span className="input-label--required" aria-hidden="true">*</span>}
          </label>
        )}
        <div className={wrapperClasses}>
          {leftIcon && <span className="input-icon input-icon--left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
            {...props}
          />
          {rightIcon && <span className="input-icon input-icon--right">{rightIcon}</span>}
        </div>
        {error && (
          <span id={errorId} className="input-error" role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={helperId} className="input-helper">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea Component
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      disabled = false,
      required = false,
      className = '',
      containerClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;

    const containerClasses = [
      'input-container',
      fullWidth && 'input-container--full-width',
      containerClassName,
    ]
      .filter(Boolean)
      .join(' ');

    const textareaClasses = [
      'textarea',
      error && 'textarea--error',
      disabled && 'textarea--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={textareaId} className="input-label">
            {label}
            {required && <span className="input-label--required">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {error && (
          <span className="input-error" role="alert">
            {error}
          </span>
        )}
        {helperText && !error && <span className="input-helper">{helperText}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Input;
