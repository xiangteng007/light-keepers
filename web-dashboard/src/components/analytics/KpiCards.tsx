/**
 * KPI Cards Component
 * Displays key performance indicators for the analytics dashboard
 */

import './KpiCards.css';

export interface KpiCardData {
    title: string;
    value: number | string;
    trend?: number; // percentage change
    icon?: string;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    subtitle?: string;
}

export interface KpiCardsProps {
    cards: KpiCardData[];
    loading?: boolean;
}

export function KpiCard({ title, value, trend, icon, color = 'primary', subtitle }: KpiCardData) {
    const colorMap = {
        primary: '#3b82f6',
        success: '#22c55e',
        warning: '#eab308',
        danger: '#dc2626',
        info: '#06b6d4',
    };

    return (
        <div className="kpi-card" style={{ borderTopColor: colorMap[color] }}>
            <div className="kpi-card__header">
                {icon && <span className="kpi-card__icon">{icon}</span>}
                <span className="kpi-card__title">{title}</span>
            </div>
            <div className="kpi-card__value">{value}</div>
            {trend !== undefined && (
                <div className={`kpi-card__trend ${trend >= 0 ? 'kpi-card__trend--up' : 'kpi-card__trend--down'}`}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </div>
            )}
            {subtitle && <div className="kpi-card__subtitle">{subtitle}</div>}
        </div>
    );
}

export function KpiCards({ cards, loading }: KpiCardsProps) {
    if (loading) {
        return (
            <div className="kpi-cards">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="kpi-card kpi-card--loading">
                        <div className="kpi-card__skeleton kpi-card__skeleton--title"></div>
                        <div className="kpi-card__skeleton kpi-card__skeleton--value"></div>
                        <div className="kpi-card__skeleton kpi-card__skeleton--subtitle"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="kpi-cards">
            {cards.map((card, index) => (
                <KpiCard key={index} {...card} />
            ))}
        </div>
    );
}

export default KpiCards;
