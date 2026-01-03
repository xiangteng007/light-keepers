import React from 'react';
import './ManualCard.css';

export type ManualCardVariant = 'task-flow' | 'manual-list' | 'field-entry' | 'featured';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface ManualCardProps {
    variant?: ManualCardVariant;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    tags?: string[];
    riskLevel?: RiskLevel;
    articleCount?: number;
    updatedAt?: string;
    onClick?: () => void;
    className?: string;
}

export const ManualCard: React.FC<ManualCardProps> = ({
    variant = 'task-flow',
    title,
    description,
    icon,
    tags,
    riskLevel,
    articleCount,
    updatedAt,
    onClick,
    className = '',
}) => {
    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            className={`manual-card manual-card--${variant} ${onClick ? 'manual-card--clickable' : ''} ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role={onClick ? 'button' : 'article'}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Task Flow Card */}
            {variant === 'task-flow' && (
                <>
                    <div className="manual-card__header">
                        {icon && <span className="manual-card__icon">{icon}</span>}
                        <h3 className="manual-card__title">{title}</h3>
                    </div>
                    <div className="manual-card__body">
                        {description && <p className="manual-card__description">{description}</p>}
                        {tags && tags.length > 0 && (
                            <div className="manual-card__tags">
                                {tags.map((tag, index) => (
                                    <span key={index} className="manual-card__tag">{tag}</span>
                                ))}
                            </div>
                        )}
                        {riskLevel && (
                            <div className={`manual-card__risk manual-card__risk--${riskLevel}`}>
                                <span className="manual-card__risk-icon">
                                    {riskLevel === 'low' && '✓'}
                                    {riskLevel === 'medium' && '⚠'}
                                    {riskLevel === 'high' && '⚠'}
                                    {riskLevel === 'critical' && '⚠'}
                                </span>
                                <span className="manual-card__risk-text">
                                    {riskLevel === 'low' && '低風險'}
                                    {riskLevel === 'medium' && '中風險'}
                                    {riskLevel === 'high' && '高風險'}
                                    {riskLevel === 'critical' && '極危'}
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Manual List Card */}
            {variant === 'manual-list' && (
                <>
                    {icon && <span className="manual-card__icon manual-card__icon--left">{icon}</span>}
                    <div className="manual-card__content">
                        <h3 className="manual-card__title">{title}</h3>
                        {description && <p className="manual-card__description">{description}</p>}
                        {updatedAt && <span className="manual-card__meta">{updatedAt}</span>}
                    </div>
                    {riskLevel && (
                        <div className={`manual-card__risk manual-card__risk--${riskLevel}`}>
                            <span className="manual-card__risk-icon">
                                {riskLevel === 'low' && '✓'}
                                {riskLevel === 'medium' && '⚠'}
                                {riskLevel === 'high' && '⚠'}
                                {riskLevel === 'critical' && '⚠'}
                            </span>
                            <span className="manual-card__risk-text">
                                {riskLevel === 'low' && '低風險'}
                                {riskLevel === 'medium' && '中風險'}
                                {riskLevel === 'high' && '高風險'}
                                {riskLevel === 'critical' && '極危'}
                            </span>
                        </div>
                    )}
                </>
            )}

            {/* Field Entry Card */}
            {variant === 'field-entry' && (
                <div className="manual-card__center">
                    {icon && <span className="manual-card__icon manual-card__icon--large">{icon}</span>}
                    <h3 className="manual-card__title">{title}</h3>
                    {articleCount !== undefined && (
                        <span className="manual-card__count">{articleCount}篇</span>
                    )}
                </div>
            )}

            {/* Featured Card */}
            {variant === 'featured' && (
                <>
                    {icon && <div className="manual-card__featured-icon">{icon}</div>}
                    <div className="manual-card__body">
                        <h3 className="manual-card__title">{title}</h3>
                        {description && <p className="manual-card__description">{description}</p>}
                    </div>
                </>
            )}
        </div>
    );
};
