/**
 * DrillsPage.tsx
 * 
 * C2 Domain - 演練模擬頁面
 * 管理災害演練計劃與執行
 */
import React, { useState } from 'react';
import { Target, Calendar, Users, Clock, Play, CheckCircle, PauseCircle } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import './DrillsPage.css';

interface Drill {
    id: string;
    title: string;
    type: 'earthquake' | 'fire' | 'flood' | 'typhoon';
    status: 'planned' | 'in_progress' | 'completed';
    scheduledDate: string;
    duration: string;
    participants: number;
    location: string;
}

const MOCK_DRILLS: Drill[] = [
    { id: '1', title: '年度地震避難演練', type: 'earthquake', status: 'planned', scheduledDate: '2026/01/20', duration: '2 小時', participants: 150, location: '全區' },
    { id: '2', title: '消防疏散演練', type: 'fire', status: 'in_progress', scheduledDate: '2026/01/12', duration: '3 小時', participants: 80, location: '信義區' },
    { id: '3', title: '颱風應變演練', type: 'typhoon', status: 'completed', scheduledDate: '2026/01/05', duration: '4 小時', participants: 120, location: '大安區' },
];

const TYPE_LABELS: Record<string, string> = {
    earthquake: '地震',
    fire: '火災',
    flood: '水災',
    typhoon: '颱風',
};

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    planned: { label: '已排程', color: '#3b82f6', icon: Calendar },
    in_progress: { label: '進行中', color: '#f59e0b', icon: Play },
    completed: { label: '已完成', color: '#22c55e', icon: CheckCircle },
};

export default function DrillsPage() {
    const [filter, setFilter] = useState<string>('all');

    return (
        <PageTemplate
            title="演練模擬"
            subtitle="災害演練計劃與執行管理"
            icon={Target}
            domain="C2 指揮控制"
        >
            <div className="drills-page">
                {/* Filter Tabs */}
                <div className="filter-tabs">
                    {[['all', '全部'], ['planned', '已排程'], ['in_progress', '進行中'], ['completed', '已完成']].map(([key, label]) => (
                        <button
                            key={key}
                            className={`tab ${filter === key ? 'active' : ''}`}
                            onClick={() => setFilter(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Drill Cards */}
                <div className="drill-grid">
                    {MOCK_DRILLS.filter(d => filter === 'all' || d.status === filter).map(drill => {
                        const statusInfo = STATUS_INFO[drill.status];
                        const StatusIcon = statusInfo.icon;
                        return (
                            <div key={drill.id} className="drill-card">
                                <div className="drill-header">
                                    <span className="drill-type">{TYPE_LABELS[drill.type]}</span>
                                    <span className="drill-status" style={{ background: statusInfo.color }}>
                                        <StatusIcon size={12} />
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <h4 className="drill-title">{drill.title}</h4>
                                <div className="drill-info">
                                    <div className="info-item">
                                        <Calendar size={14} />
                                        <span>{drill.scheduledDate}</span>
                                    </div>
                                    <div className="info-item">
                                        <Clock size={14} />
                                        <span>{drill.duration}</span>
                                    </div>
                                    <div className="info-item">
                                        <Users size={14} />
                                        <span>{drill.participants} 人</span>
                                    </div>
                                </div>
                                <div className="drill-actions">
                                    {drill.status === 'planned' && (
                                        <button className="btn-start"><Play size={14} /> 開始</button>
                                    )}
                                    {drill.status === 'in_progress' && (
                                        <button className="btn-pause"><PauseCircle size={14} /> 暫停</button>
                                    )}
                                    {drill.status === 'completed' && (
                                        <button className="btn-view">查看報告</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </PageTemplate>
    );
}
