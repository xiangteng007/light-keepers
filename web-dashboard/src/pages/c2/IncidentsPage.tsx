/**
 * IncidentsPage.tsx
 * 
 * C2 Domain - 事件中心頁面
 * 管理所有事件的列表與狀態追蹤
 */
import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Filter, Plus, MapPin, Users } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import './IncidentsPage.css';

interface Incident {
    id: string;
    number: string;
    title: string;
    status: 'reported' | 'confirmed' | 'in_progress' | 'resolved' | 'closed';
    priority: 1 | 2 | 3 | 4 | 5;
    category: string;
    location: string;
    reportedAt: string;
    assignedTeams: number;
}

const MOCK_INCIDENTS: Incident[] = [
    { id: '1', number: 'INC-2026-00123', title: '大安區住宅倒塌', status: 'in_progress', priority: 1, category: '地震', location: '大安區復興南路', reportedAt: '2026/01/11 14:32', assignedTeams: 3 },
    { id: '2', number: 'INC-2026-00122', title: '信義區水管破裂', status: 'confirmed', priority: 2, category: '水災', location: '信義區松仁路', reportedAt: '2026/01/11 12:15', assignedTeams: 1 },
    { id: '3', number: 'INC-2026-00121', title: '中正區道路坍方', status: 'resolved', priority: 3, category: '山崩', location: '中正區汀州路', reportedAt: '2026/01/10 09:45', assignedTeams: 2 },
    { id: '4', number: 'INC-2026-00120', title: '松山區火災通報', status: 'closed', priority: 2, category: '火災', location: '松山區敦化北路', reportedAt: '2026/01/09 18:20', assignedTeams: 4 },
];

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    reported: { label: '已通報', color: '#6b7280', icon: Clock },
    confirmed: { label: '已確認', color: '#3b82f6', icon: AlertTriangle },
    in_progress: { label: '處理中', color: '#f59e0b', icon: AlertTriangle },
    resolved: { label: '已解決', color: '#22c55e', icon: CheckCircle },
    closed: { label: '已結案', color: '#10b981', icon: CheckCircle },
};

const PRIORITY_COLORS = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];

export default function IncidentsPage() {
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filtered = statusFilter === 'all'
        ? MOCK_INCIDENTS
        : MOCK_INCIDENTS.filter(i => i.status === statusFilter);

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
                        const count = MOCK_INCIDENTS.filter(i => i.status === key).length;
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
                    <button className="btn-primary">
                        <Plus size={16} /> 新增事件
                    </button>
                </div>

                {/* Incident List */}
                <div className="incident-list">
                    {filtered.map(incident => {
                        const statusInfo = STATUS_INFO[incident.status];
                        const StatusIcon = statusInfo.icon;
                        return (
                            <div key={incident.id} className="incident-card">
                                <div className="priority-bar" style={{ background: PRIORITY_COLORS[incident.priority] }} />
                                <div className="incident-content">
                                    <div className="incident-header">
                                        <span className="incident-number">{incident.number}</span>
                                        <span className="status-badge" style={{ background: statusInfo.color }}>
                                            <StatusIcon size={12} />
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <h4 className="incident-title">{incident.title}</h4>
                                    <div className="incident-meta">
                                        <span><MapPin size={12} /> {incident.location}</span>
                                        <span><Clock size={12} /> {incident.reportedAt}</span>
                                        <span><Users size={12} /> {incident.assignedTeams} 小隊</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </PageTemplate>
    );
}
