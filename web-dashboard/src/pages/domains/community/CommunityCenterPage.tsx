/**
 * CommunityCenterPage.tsx
 * 
 * Community Domain - 社區中心頁面
 * 展示社區聯絡點、受災戶追蹤、社區活動 — connected to real API
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Home, Users, Heart, MapPin, Phone, Calendar,
    AlertTriangle, CheckCircle, Clock, ChevronRight, Loader2, RefreshCw
} from 'lucide-react';
import { PageTemplate } from '../../../components/PageTemplate';
import { Alert } from '../../../design-system';
import api from '../../../utils/api';
import './CommunityCenterPage.css';

interface Community {
    id: string;
    name: string;
    households: number;
    affected: number;
    sheltered: number;
    contactPerson?: string;
    phone?: string;
    status: string;
}

interface Activity {
    id: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
    participants: number;
    createdAt?: string;
}

export default function CommunityCenterPage() {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [postsRes, statsRes] = await Promise.allSettled([
                api.get('/community/posts', { params: { limit: '50' } }),
                api.get('/community/stats'),
            ]);

            // Try to get community data from posts or stats
            if (statsRes.status === 'fulfilled') {
                const statsData = statsRes.value.data?.data || statsRes.value.data || {};
                if (Array.isArray(statsData.communities)) {
                    setCommunities(statsData.communities);
                } else if (statsData.communities) {
                    setCommunities([statsData.communities]);
                }
                if (Array.isArray(statsData.activities)) {
                    setActivities(statsData.activities);
                }
            }

            // Posts can serve as activities too
            if (postsRes.status === 'fulfilled') {
                const postsData = postsRes.value.data?.data || postsRes.value.data || [];
                const posts = Array.isArray(postsData) ? postsData : (postsData.items || []);
                if (posts.length > 0 && activities.length === 0) {
                    setActivities(posts.slice(0, 10).map((p: any) => ({
                        id: p.id,
                        title: p.title || p.content?.slice(0, 30) || '活動',
                        date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-TW') : undefined,
                        location: p.location,
                        participants: p.likeCount || p.commentCount || 0,
                    })));
                }
            }

            // If both failed
            if (postsRes.status === 'rejected' && statsRes.status === 'rejected') {
                setError('無法載入社區資料');
            }
        } catch (err: any) {
            console.error('Failed to fetch community data:', err);
            setError(err?.response?.data?.message || '無法載入資料');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalStats = {
        communities: communities.length,
        affected: communities.reduce((sum, c) => sum + (c.affected || 0), 0),
        sheltered: communities.reduce((sum, c) => sum + (c.sheltered || 0), 0),
        households: communities.reduce((sum, c) => sum + (c.households || 0), 0),
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <AlertTriangle className="status-icon warning" />;
            case 'monitoring': return <Clock className="status-icon monitoring" />;
            case 'normal': return <CheckCircle className="status-icon normal" />;
            default: return null;
        }
    };

    return (
        <PageTemplate
            title="社區中心"
            subtitle="社區聯絡網絡與受災戶追蹤"
            icon={Home}
            domain="Community 社區治理"
        >
            <div className="community-center">
                {/* Refresh */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'transparent', border: '1px solid var(--border-default, #334155)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer' }}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} /> 重新整理
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ marginBottom: '1rem' }}>
                        <Alert variant="danger" icon={<AlertTriangle size={16} />}>{error}</Alert>
                    </div>
                )}

                {/* Summary Stats */}
                <div className="summary-stats">
                    <div className="summary-card">
                        <Home className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.communities}</span>
                            <span className="summary-label">聯繫社區</span>
                        </div>
                    </div>
                    <div className="summary-card warning">
                        <AlertTriangle className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.affected}</span>
                            <span className="summary-label">受災戶</span>
                        </div>
                    </div>
                    <div className="summary-card info">
                        <Users className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.sheltered}</span>
                            <span className="summary-label">收容中</span>
                        </div>
                    </div>
                    <div className="summary-card">
                        <Heart className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.households.toLocaleString()}</span>
                            <span className="summary-label">總戶數</span>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '0.5rem', color: 'var(--text-secondary, #94a3b8)' }}>
                        <Loader2 size={24} className="spin" />
                        <span>載入社區資料中...</span>
                    </div>
                )}

                {!loading && (
                    <div className="two-column">
                        {/* Community List */}
                        <div className="community-list">
                            <h3>社區清單</h3>
                            {communities.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #64748b)' }}>
                                    暫無社區資料
                                </div>
                            ) : communities.map(community => (
                                <div
                                    key={community.id}
                                    className={`community-item ${selectedCommunity === community.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedCommunity(community.id)}
                                >
                                    <div className="item-header">
                                        {getStatusIcon(community.status)}
                                        <span className="item-name">{community.name}</span>
                                        <ChevronRight size={16} />
                                    </div>
                                    <div className="item-stats">
                                        <span>總戶數: {community.households}</span>
                                        <span className={community.affected > 0 ? 'warning' : ''}>
                                            受災: {community.affected}
                                        </span>
                                        <span>收容: {community.sheltered}</span>
                                    </div>
                                    {(community.contactPerson || community.phone) && (
                                        <div className="item-contact">
                                            {community.contactPerson && <span><Users size={12} /> {community.contactPerson}</span>}
                                            {community.phone && <span><Phone size={12} /> {community.phone}</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Upcoming Activities */}
                        <div className="activities-panel">
                            <h3><Calendar size={18} /> 近期活動</h3>
                            {activities.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #64748b)' }}>
                                    暫無活動
                                </div>
                            ) : activities.map(activity => (
                                <div key={activity.id} className="activity-card">
                                    <div className="activity-header">
                                        <span className="activity-title">{activity.title}</span>
                                    </div>
                                    <div className="activity-details">
                                        {(activity.date || activity.time) && (
                                            <span><Calendar size={12} /> {activity.date} {activity.time || ''}</span>
                                        )}
                                        {activity.location && (
                                            <span><MapPin size={12} /> {activity.location}</span>
                                        )}
                                        {activity.participants > 0 && (
                                            <span><Users size={12} /> 已報名 {activity.participants} 人</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PageTemplate>
    );
}
