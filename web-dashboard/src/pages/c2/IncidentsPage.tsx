/**
 * IncidentsPage.tsx
 * 
 * C2 Domain - 事件中心頁面
 * 管理所有事件的列表與狀態追蹤 — connected to real API
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Plus, MapPin, Users, Loader2, RefreshCw } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import api from '../../utils/api'; // eslint-disable-line no-restricted-imports -- FE-4 遷移待辦（工作項 3.2）：改用 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md
import './IncidentsPage.css';

interface Incident {
    id: string;
    number?: string;
    title: string;
    name?: string;
    status: string;
    priority: number;
    category?: string;
    type?: string;
    location?: string;
    reportedAt?: string;
    createdAt?: string;
    assignedTeams?: number;
}

// Status colors: mapped to semantic status tokens where the hue matches exactly
// (var(--token, original-hex) keeps the fallback identical, so no visual change).
// `reported` (#6b7280) is a neutral/inactive gray with no matching semantic status
// token — left as a bespoke literal.
const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    reported: { label: '已通報', color: '#6b7280', icon: Clock },
    confirmed: { label: '已確認', color: 'var(--color-info, #3b82f6)', icon: AlertTriangle },
    active: { label: '進行中', color: 'var(--color-warning, #f59e0b)', icon: AlertTriangle },
    in_progress: { label: '處理中', color: 'var(--color-warning, #f59e0b)', icon: AlertTriangle },
    resolved: { label: '已解決', color: 'var(--color-success, #22c55e)', icon: CheckCircle },
    closed: { label: '已結案', color: 'var(--color-success-dark, #10b981)', icon: CheckCircle },
};

// Priority gradient: end points map to danger/warning/success semantics; the two
// mid-scale hues (#f97316 orange, #84cc16 lime) don't correspond to a semantic
// status token and are kept as bespoke literals for the gradient.
const PRIORITY_COLORS = ['', 'var(--color-danger, #ef4444)', '#f97316', 'var(--color-warning, #f59e0b)', '#84cc16', 'var(--color-success, #22c55e)'];

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchIncidents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: Record<string, string> = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            const response = await api.get('/events', { params });
            const data = response.data?.data || response.data || [];
            const items = Array.isArray(data) ? data : (data.items || []);
            setIncidents(items);
        } catch (err: any) {
            console.error('Failed to fetch incidents:', err);
            setError(err?.response?.data?.message || '無法載入事件列表');
            setIncidents([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    const filtered = incidents;

    return (
        <PageTemplate
            title="事件中心"
            subtitle="管理所有事件的生命週期"
            icon={AlertTriangle}
            domain="C2 指揮控制"
        >
            <div className="incidents-page">
                {/* Stats Bar */}
                <div className="stats-bar">
                    {Object.entries(STATUS_INFO).map(([key, info]) => {
                        const count = incidents.filter(i => i.status === key).length;
                        if (count === 0 && key !== statusFilter) return null;
                        return (
                            <div
                                key={key}
                                className={`stat-item ${statusFilter === key ? 'active' : ''}`}
                                onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                                style={{ '--stat-color': info.color } as React.CSSProperties}
                            >
                                <span className="stat-count">{count}</span>
                                <span className="stat-label">{info.label}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="page-actions">
                    <button className="btn-icon" onClick={fetchIncidents} disabled={loading} title="重新整理">
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    </button>
                    <button className="btn-primary">
                        <Plus size={16} /> 新增事件
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="error-banner" style={{ background: 'rgba(239,68,68,0.1)' /* color-danger tint, no rgba token variant available */, color: 'var(--color-danger, #ef4444)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md, 8px)', marginBottom: 'var(--space-4, 1rem)' }}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: 'var(--space-2, 0.5rem)', color: 'var(--text-tertiary, #94a3b8)' }}>
                        <Loader2 size={24} className="spin" />
                        <span>載入事件中...</span>
                    </div>
                )}

                {/* Incident List */}
                {!loading && (
                    <div className="incident-list">
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary, #64748b)' }}>
                                {error ? '載入失敗' : '暫無事件'}
                            </div>
                        ) : filtered.map(incident => {
                            const statusInfo = STATUS_INFO[incident.status] || STATUS_INFO.reported;
                            const StatusIcon = statusInfo.icon;
                            return (
                                <div key={incident.id} className="incident-card">
                                    <div className="priority-bar" style={{ background: PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS[3] }} />
                                    <div className="incident-content">
                                        <div className="incident-header">
                                            <span className="incident-number">{incident.number || `EVT-${incident.id.slice(0, 8)}`}</span>
                                            <span className="status-badge" style={{ background: statusInfo.color }}>
                                                <StatusIcon size={12} />
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <h4 className="incident-title">{incident.title || incident.name}</h4>
                                        <div className="incident-meta">
                                            {incident.location && <span><MapPin size={12} /> {incident.location}</span>}
                                            <span><Clock size={12} /> {incident.reportedAt || (incident.createdAt ? new Date(incident.createdAt).toLocaleString('zh-TW') : '-')}</span>
                                            {incident.assignedTeams != null && <span><Users size={12} /> {incident.assignedTeams} 小隊</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageTemplate>
    );
}
