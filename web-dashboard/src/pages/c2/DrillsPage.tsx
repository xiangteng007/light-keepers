/**
 * DrillsPage.tsx
 * 
 * C2 Domain - 演練模擬頁面
 * 管理災害演練計劃與執行 — connected to real API
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Target, Calendar, Users, Clock, Play, CheckCircle, PauseCircle, Loader2, RefreshCw } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import './DrillsPage.css';

interface Drill {
    id: string;
    title: string;
    name?: string;
    type: string;
    status: string;
    scheduledDate?: string;
    createdAt?: string;
    duration: string;
    participants: number;
    location?: string;
}

const TYPE_LABELS: Record<string, string> = {
    earthquake: '地震',
    fire: '火災',
    flood: '水災',
    typhoon: '颱風',
};

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    planned: { label: '已排程', color: '#3b82f6', icon: Calendar },
    draft: { label: '草稿', color: '#6b7280', icon: Calendar },
    in_progress: { label: '進行中', color: '#f59e0b', icon: Play },
    active: { label: '進行中', color: '#f59e0b', icon: Play },
    completed: { label: '已完成', color: '#22c55e', icon: CheckCircle },
};

export default function DrillsPage() {
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const fetchDrills = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // ⚠️ 這裡的 `/api` 前綴看似重複，實際上是正確的：後端該模組寫成
            // `@Controller('api/drill')`，疊加 global prefix `api/v1` 後真實路由是
            // /api/v1/api/drill/scenarios。請勿「順手」移除 `/api`，會直接 404。
            // 後端路由命名不一致的問題留待 Phase 3 統一整理。
            const response = await api.get('/api/drill/scenarios');
            const data = response.data?.data || response.data || [];
            const items = Array.isArray(data) ? data : (data.scenarios || data.items || []);
            setDrills(items);
        } catch (err: any) {
            console.error('Failed to fetch drills:', err);
            setError(getApiErrorMessage(err, '無法載入演練列表'));
            setDrills([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDrills();
    }, [fetchDrills]);

    const filteredDrills = filter === 'all' ? drills : drills.filter(d => d.status === filter);

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
                    <button className="tab refresh-btn" onClick={fetchDrills} disabled={loading} title="重新整理">
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '0.5rem', color: '#94a3b8' }}>
                        <Loader2 size={24} className="spin" />
                        <span>載入演練資料中...</span>
                    </div>
                )}

                {/* Drill Cards */}
                {!loading && (
                    <div className="drill-grid">
                        {filteredDrills.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', gridColumn: '1 / -1' }}>
                                {error ? '載入失敗' : '暫無演練資料'}
                            </div>
                        ) : filteredDrills.map(drill => {
                            const statusInfo = STATUS_INFO[drill.status] || STATUS_INFO.planned;
                            const StatusIcon = statusInfo.icon;
                            return (
                                <div key={drill.id} className="drill-card">
                                    <div className="drill-header">
                                        <span className="drill-type">{TYPE_LABELS[drill.type] || drill.type}</span>
                                        <span className="drill-status" style={{ background: statusInfo.color }}>
                                            <StatusIcon size={12} />
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <h4 className="drill-title">{drill.title || drill.name}</h4>
                                    <div className="drill-info">
                                        <div className="info-item">
                                            <Calendar size={14} />
                                            <span>{drill.scheduledDate || (drill.createdAt ? new Date(drill.createdAt).toLocaleDateString('zh-TW') : '-')}</span>
                                        </div>
                                        <div className="info-item">
                                            <Clock size={14} />
                                            <span>{drill.duration || '-'}</span>
                                        </div>
                                        <div className="info-item">
                                            <Users size={14} />
                                            <span>{drill.participants || 0} 人</span>
                                        </div>
                                    </div>
                                    <div className="drill-actions">
                                        {(drill.status === 'planned' || drill.status === 'draft') && (
                                            <button className="btn-start"><Play size={14} /> 開始</button>
                                        )}
                                        {(drill.status === 'in_progress' || drill.status === 'active') && (
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
                )}
            </div>
        </PageTemplate>
    );
}
