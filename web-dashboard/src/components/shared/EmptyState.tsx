import React from 'react';
import { FileX, SearchX, Inbox, AlertCircle, LucideIcon } from 'lucide-react';
import './EmptyState.css';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'search' | 'error' | 'minimal';
    className?: string;
}

const VARIANT_ICONS: Record<string, LucideIcon> = {
    default: Inbox,
    search: SearchX,
    error: AlertCircle,
    minimal: FileX,
};

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    variant = 'default',
    className = '',
}) => {
    const Icon = icon || VARIANT_ICONS[variant] || Inbox;

    return (
        <div className={`empty-state empty-state--${variant} ${className}`}>
            <div className="empty-state__icon-wrapper">
                <Icon size={48} strokeWidth={1.5} />
            </div>
            <h3 className="empty-state__title">{title}</h3>
            {description && (
                <p className="empty-state__description">{description}</p>
            )}
            {action && (
                <button
                    className="empty-state__action"
                    onClick={action.onClick}
                    type="button"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
