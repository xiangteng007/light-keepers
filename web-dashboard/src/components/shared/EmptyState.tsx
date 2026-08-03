import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { DocEmptyIcon, SearchIcon, WarningIcon } from '../../design-system/icons';
import type { LkIcon } from '../../design-system/icons';
import './EmptyState.css';

interface EmptyStateProps {
    /** 自訂圖示：可傳 B3c LkIcon 或（過渡期）lucide icon */
    icon?: LucideIcon | LkIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'search' | 'error' | 'minimal';
    className?: string;
}

/**
 * 變體圖示一律走 B3c 教範圖例（R5/T6）：
 * default／minimal＝doc-empty（無資料）、search＝search（無結果）、error＝warning。
 */
const VARIANT_ICONS: Record<string, LkIcon> = {
    default: DocEmptyIcon,
    search: SearchIcon,
    error: WarningIcon,
    minimal: DocEmptyIcon,
};

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    variant = 'default',
    className = '',
}) => {
    const Icon = icon || VARIANT_ICONS[variant] || DocEmptyIcon;

    return (
        <div className={`empty-state empty-state--${variant} ${className}`}>
            <div className="empty-state__icon-wrapper">
                {/* B3c 圖形文法鎖 stroke 2，不傳 strokeWidth 覆寫 */}
                <Icon size={48} />
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
