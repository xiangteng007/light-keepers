/**
 * widgets/shared/primitives.tsx
 *
 * Shared building blocks reused across widget domains, plus the two
 * generic "metrics" widgets that several pages map onto.
 *
 * Loaded as its own async chunk (shared between widget domain chunks).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ===== Reusable Placeholder Components =====
export const CardPlaceholder = ({ title }: { title: string }) => (
    <div style={{
        padding: '12px',
        background: 'rgba(47, 54, 65, 0.3)',
        borderRadius: '8px',
        marginBottom: '8px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
    }}>
        {title}
    </div>
);

export const MetricCard = ({ label, value, trend, color = '#C39B6F' }: { label: string; value: string | number; trend?: 'up' | 'down' | 'stable'; color?: string }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        background: 'var(--surface-raised, rgba(255, 255, 255, 0.9))',
        borderRadius: '8px',
        minWidth: '100px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid var(--border-default, rgba(0, 0, 0, 0.06))',
    }}>
        <span className="u-mono" style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</span>
        {trend && (
            <span style={{ marginTop: '4px', color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#94A3B8' }}>
                {trend === 'up' && <TrendingUp size={14} />}
                {trend === 'down' && <TrendingDown size={14} />}
            </span>
        )}
    </div>
);

export const ListItem = ({ icon, title, subtitle, status }: { icon: React.ReactNode; title: string; subtitle?: string; status?: 'success' | 'warning' | 'error' }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'rgba(47, 54, 65, 0.3)',
        borderRadius: '8px',
        marginBottom: '8px',
    }}>
        <div style={{ color: 'var(--accent-gold)' }}>{icon}</div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
        {status && (
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: status === 'success' ? '#22c55e' : status === 'warning' ? '#eab308' : '#ef4444',
            }} />
        )}
    </div>
);

// ===== i18n Helper Components =====
export const TranslatedMetricCard = ({ labelKey, value, trend, color = '#C39B6F' }: { labelKey: string; value: string | number; trend?: 'up' | 'down' | 'stable'; color?: string }) => {
    const { t } = useTranslation();
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            background: 'var(--surface-raised, rgba(255, 255, 255, 0.9))',
            borderRadius: '8px',
            minWidth: '100px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-default, rgba(0, 0, 0, 0.06))',
        }}>
            <span className="u-mono" style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t(labelKey)}</span>
            {trend && (
                <span style={{ marginTop: '4px', color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#94A3B8' }}>
                    {trend === 'up' && <TrendingUp size={14} />}
                    {trend === 'down' && <TrendingDown size={14} />}
                </span>
            )}
        </div>
    );
};

// Translated Key Metrics Widget (main dashboard stats)
export const TranslatedKeyMetricsWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        <TranslatedMetricCard labelKey="widgets.taskStats.pending" value={5} color="#ef4444" />
        <TranslatedMetricCard labelKey="widgets.taskStats.matched" value={12} trend="up" color="#3B82F6" />
        <TranslatedMetricCard labelKey="widgets.taskStats.completed" value={28} color="#22c55e" />
        <TranslatedMetricCard labelKey="widgets.taskStats.matchRate" value="91%" trend="up" color="#C39B6F" />
    </div>
);

// Generic (non-translated) key metrics — reused by several page widgets
export const KeyMetricsWidget = () => (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', height: '100%', alignItems: 'center', padding: '8px' }}>
        <MetricCard label="待配對" value={5} color="#ef4444" />
        <MetricCard label="已配對" value={12} trend="up" color="#3B82F6" />
        <MetricCard label="已完成" value={28} color="#22c55e" />
        <MetricCard label="配對率" value="91%" trend="up" color="#C39B6F" />
    </div>
);
