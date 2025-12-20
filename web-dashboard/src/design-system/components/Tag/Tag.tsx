import React from 'react';
import './Tag.css';

export interface TagProps {
    children: React.ReactNode;
    color?: 'default' | 'brown' | 'gold' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md';
    removable?: boolean;
    onRemove?: () => void;
    className?: string;
}

export const Tag: React.FC<TagProps> = ({
    children,
    color = 'default',
    size = 'md',
    removable = false,
    onRemove,
    className = '',
}) => {
    return (
        <span className={`lk-tag lk-tag--${color} lk-tag--${size} ${className}`}>
            {children}
            {removable && (
                <button className="lk-tag__remove" onClick={onRemove} aria-label="移除">
                    ×
                </button>
            )}
        </span>
    );
};

export default Tag;
