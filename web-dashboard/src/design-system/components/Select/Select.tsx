/**
 * Select — B3c 野戰手冊（R5/T6，補齊 T3 規格缺件）
 * 深面板底＋1px 規線；focus＝橄欖環（--focus-ring）。
 * 原生 <select> 包裝（零自製下拉行為）；chevron 為 B3c 折線 icon。
 * 紅色憲法（DESIGN_LANGUAGE v2 §D）：表單驗證錯誤一律琥珀，紅只給生命/安全。
 */
import React, { forwardRef, useId, useState } from 'react';
import { ChevronDownIcon } from '../../icons';
import './Select.css';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps
    extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    helperText?: string;
    error?: string;
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    /** 選項清單；也可改用 children 自行渲染 <option> */
    options?: SelectOption[];
    /** 佔位提示（渲染為 value="" 的 disabled option） */
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    label,
    helperText,
    error,
    size = 'md',
    fullWidth = false,
    options,
    placeholder,
    className = '',
    disabled,
    id,
    children,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const autoId = useId();
    const selectId = id || `select-${autoId}`;

    // 非受控且未給 defaultValue 時，讓 placeholder 成為初始顯示
    const defaultValue =
        placeholder !== undefined &&
        props.value === undefined &&
        props.defaultValue === undefined
            ? ''
            : props.defaultValue;

    const containerClasses = [
        'lk-select',
        `lk-select--${size}`,
        isFocused ? 'lk-select--focused' : '',
        error ? 'lk-select--error' : '',
        disabled ? 'lk-select--disabled' : '',
        fullWidth ? 'lk-select--full-width' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            {label && (
                <label htmlFor={selectId} className="lk-select__label">
                    {label}
                </label>
            )}
            <div className="lk-select__wrapper">
                <select
                    ref={ref}
                    id={selectId}
                    className="lk-select__field"
                    disabled={disabled}
                    {...props}
                    defaultValue={defaultValue}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                >
                    {placeholder !== undefined && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options
                        ? options.map((opt) => (
                            <option
                                key={opt.value}
                                value={opt.value}
                                disabled={opt.disabled}
                            >
                                {opt.label}
                            </option>
                        ))
                        : children}
                </select>
                <span className="lk-select__chevron" aria-hidden="true">
                    <ChevronDownIcon size={16} />
                </span>
                <div className="lk-select__focus-ring" />
            </div>
            {(helperText || error) && (
                <span className={`lk-select__helper ${error ? 'lk-select__helper--error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    );
});

Select.displayName = 'Select';

export default Select;
