import React from 'react';
import './ManualTag.css';

interface ManualTagProps {
    children: React.ReactNode;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
}

export const ManualTag: React.FC<ManualTagProps> = ({
    children,
    selected = false,
    onClick,
    className = '',
}) => {
    return (
        <span
            className={`manual-tag ${selected ? 'manual-tag--selected' : ''} ${onClick ? 'manual-tag--clickable' : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {children}
        </span>
    );
};
