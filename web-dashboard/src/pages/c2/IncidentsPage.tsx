/**
 * IncidentsPage.tsx
 * 
 * C2 Domain - 事件中心頁面
 * 管理所有事件的列表與狀態追蹤 — connected to real API
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, CheckCircle, Plus, MapPin, Users, RefreshCw, Inbox } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import { Badge, Button, Alert } from '../../design-system';
import type { BadgeProps } from '../../design-system';
import EmptyState from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
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

// 狀態資訊：color 供統計磚塊強調色使用（維持既有配色映射）；
// badgeVariant 對照 DESIGN_LANGUAGE.md §3 供 Badge 元件使用（狀態徽章一律用 Badge）。
const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType; badgeVariant: BadgeProps['variant'] }> = {
    reported: { label: '已通報', color: '#6b7280', icon: Clock, badgeVariant: 'default' },
    confirmed: { label: '已確認', color: 'var(--color-info, #3b82f6)', icon: AlertTriangle, badgeVariant: 'info' },
    active: { label: '進行中', color: 'var(--color-warning, #f59e0b)', icon: AlertTriangle, badgeVariant: 'warning' },
    in_progress: { label: '處理中', color: 'var(--color-warning, #f59e0b)', icon: AlertTriangle, badgeVariant: 'warning' },
    resolved: { label: '已解決', color: 'var(--color-success, #22c55e)', icon: CheckCircle, badgeVariant: 'success' },
    closed: { label: '已結案', color: 'var(--color-success-dark, #10b981)', icon: CheckCircle, badgeVariant: 'success' },
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
            setError(getApiErrorMessage(err, '無法載入事件列表'));
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
                {/* toolbar：統計摘要列（可點擊篩選）＋ 主要動作 */}
                <div className="incidents-toolbar">
                    <div className="stats-bar" role="group" aria-label="依狀態篩選事件">
                        {Object.entries(STATUS_INFO).map(([key, info]) => {
                            const count = incidents.filter(i => i.status === key).length;
                            if (count === 0 && key !== statusFilter) return null;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className={`stat-item ${statusFilter === key ? 'is-active' : ''}`}
                                    onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                                    aria-pressed={statusFilter === key}
                                    style={{ '--stat-color': info.color } as React.CSSProperties}
                                >
                                    <span className="stat-count tabular-nums">{count}</span>
                                    <span className="stat-label">{info.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="page-actions">
                        <button
                            type="button"
                            className="btn-icon"
                            onClick={fetchIncidents}
                            disabled={loading}
                            aria-label="重新整理事件列表"
                            title="重新整理"
                        >
                            <RefreshCw size={16} className={loading ? 'spin' : ''} aria-hidden="true" />
                        </button>
                        <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />}>
                            新增事件
                        </Button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <Alert variant="danger" title="載入失敗">
                        {error}
                        <div className="incidents-page__retry">
                            <Button variant="secondary" size="sm" onClick={fetchIncidents}>重試</Button>
                        </div>
                    </Alert>
                )}

                {/* Loading */}
                {loading && (
                    <div className="incident-list" aria-busy="true" aria-label="載入事件中">
                        <Skeleton variant="card" height={88} count={4} />
                    </div>
                )}

                {/* Incident List */}
                {!loading && (
                    <div className="incident-list">
                        {filtered.length === 0 ? (
                            <EmptyState
                                icon={error ? AlertTriangle : Inbox}
                                title={error ? '載入失敗' : '暫無事件'}
                                variant={error ? 'error' : 'default'}
                            />
                        ) : filtered.map(incident => {
                            const statusInfo = STATUS_INFO[incident.status] || STATUS_INFO.reported;
                            return (
                                <div key={incident.id} className="incident-card">
                                    <div className="priority-bar" style={{ background: PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS[3] }} />
                                    <div className="incident-content">
                                        <div className="incident-header">
                                            <span className="incident-number tabular-nums">{incident.number || `EVT-${incident.id.slice(0, 8)}`}</span>
                                            <Badge variant={statusInfo.badgeVariant} size="sm" icon={<statusInfo.icon size={12} aria-hidden="true" />}>
                                                {statusInfo.label}
                                            </Badge>
                                        </div>
                                        <h4 className="incident-title">{incident.title || incident.name}</h4>
                                        <div className="incident-meta">
                                            {incident.location && <span><MapPin size={12} aria-hidden="true" /> {incident.location}</span>}
                                            <span className="tabular-nums"><Clock size={12} aria-hidden="true" /> {incident.reportedAt || (incident.createdAt ? new Date(incident.createdAt).toLocaleString('zh-TW') : '-')}</span>
                                            {incident.assignedTeams != null && <span className="tabular-nums"><Users size={12} aria-hidden="true" /> {incident.assignedTeams} 小隊</span>}
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
