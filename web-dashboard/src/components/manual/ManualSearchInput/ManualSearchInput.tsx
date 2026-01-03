import React from 'react';
import './ManualSearchInput.css';

interface ManualSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

export const ManualSearchInput: React.FC<ManualSearchInputProps> = ({
    value,
    onChange,
    placeholder = '搜尋手冊、情境...',
    className = '',
    autoFocus = false,
}) => {
    return (
        <div className={`manual-search-input ${className}`}>
            <span className="manual-search-input__icon" aria-hidden="true">
                🔍
            </span>
            <input
                type="text"
                className="manual-search-input__field"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                aria-label="搜尋災防手冊"
            />
            {value && (
                <button
                    className="manual-search-input__clear"
                    onClick={() => onChange('')}
                    aria-label="清除搜尋"
                    type="button"
                >
                    ×
                </button>
            )}
        </div>
    );
};
