import React from 'react';
import { SearchX, Inbox, AlertCircle, LucideIcon } from 'lucide-react';
import { DocEmptyIcon } from '../../design-system/icons';
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

/* minimal（檔案/空文件語意）改用 B3c doc-empty；其餘變體暫留 lucide */
const VARIANT_ICONS: Record<string, LucideIcon> = {
    default: Inbox,
    search: SearchX,
    error: AlertCircle,
};

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    variant = 'default',
    className = '',
}) => {
    const Icon = icon || VARIANT_ICONS[variant];

    return (
        <div className={`empty-state empty-state--${variant} ${className}`}>
            <div className="empty-state__icon-wrapper">
                {Icon ? (
                    <Icon size={48} strokeWidth={1.5} />
                ) : (
                    /* B3c 圖形文法鎖 stroke 2，不傳 strokeWidth 覆寫 */
                    <DocEmptyIcon size={48} />
                )}
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
