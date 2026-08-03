/**
 * CommunityCenterPage.tsx
 *
 * Community Domain - 社區中心頁面
 * 展示社區聯絡點、受災戶追蹤、社區活動 — connected to real API
 *
 * R3b 重建（DESIGN_LANGUAGE.md）：List archetype。
 * page-header（h1 + 次要動作）→ 統計摘要列（StatIndicator）→ content（雙欄清單，桌機 2 欄 / 行動端單欄）。
 */
import { useState, useEffect, useCallback } from 'react';
import {
    BuildingIcon,
    ShelterIcon,
    HomeIcon,
    LocationIcon,
    PhoneIcon,
    CalendarIcon,
    WarningIcon,
    CheckIcon,
    ClockIcon,
    ChevronRightIcon,
    SyncIcon,
    UserIcon,
    TeamsIcon,
    type LkIcon,
} from '../../../design-system/icons';
import { Alert, Badge, Button, Card, StatIndicator } from '../../../design-system';
import EmptyState from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import api from '../../../api/client';
import { getApiErrorMessage } from '../../../api/errors';
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

const STATUS_CONFIG: Record<string, { label: string; icon: LkIcon; variant: 'warning' | 'info' | 'success' }> = {
    active: { label: '需關注', icon: WarningIcon, variant: 'warning' },
    monitoring: { label: '觀察中', icon: ClockIcon, variant: 'info' },
    normal: { label: '正常', icon: CheckIcon, variant: 'success' },
};

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
                if (posts.length > 0) {
                    setActivities((prev) => prev.length > 0 ? prev : posts.slice(0, 10).map((p: any) => ({
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
            setError(getApiErrorMessage(err, '無法載入資料'));
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

    return (
        <div className="community-center">
            {/* page-header */}
            <header className="page-header">
                <div className="page-header__title-group">
                    <h1>社區中心</h1>
                    <p className="page-header__subtitle">社區聯絡網絡與受災戶追蹤</p>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    icon={<SyncIcon size={16} className={loading ? 'spin' : ''} aria-hidden="true" />}
                    onClick={fetchData}
                    disabled={loading}
                    aria-label="重新整理社區資料"
                >
                    重新整理
                </Button>
            </header>

            {error && (
                <Alert variant="danger" icon={<WarningIcon size={16} aria-hidden="true" />}>
                    {error}
                </Alert>
            )}

            {/* 統計摘要列 */}
            <div className="summary-stats">
                <StatIndicator icon={<BuildingIcon size={20} aria-hidden="true" />} value={totalStats.communities} label="聯繫社區" />
                <StatIndicator icon={<WarningIcon size={20} aria-hidden="true" />} value={totalStats.affected} label="受災戶" variant="warning" />
                <StatIndicator icon={<ShelterIcon size={20} aria-hidden="true" />} value={totalStats.sheltered} label="收容中" variant="default" />
                <StatIndicator icon={<HomeIcon size={20} aria-hidden="true" />} value={totalStats.households.toLocaleString()} label="總戶數" />
            </div>

            {loading ? (
                <div className="two-column" aria-busy="true" aria-label="載入中">
                    <div className="panel">
                        <Skeleton variant="title" width="40%" />
                        <Skeleton variant="card" height={72} count={3} className="community-center__skeleton-row" />
                    </div>
                    <div className="panel">
                        <Skeleton variant="title" width="40%" />
                        <Skeleton variant="card" height={72} count={3} className="community-center__skeleton-row" />
                    </div>
                </div>
            ) : (
                <div className="two-column">
                    {/* Community List */}
                    <section className="panel community-list" aria-label="社區清單">
                        <h2>社區清單</h2>
                        {communities.length === 0 ? (
                            <EmptyState
                                variant="minimal"
                                title="暫無社區資料"
                                description="目前沒有已登記的社區聯絡資料。"
                            />
                        ) : communities.map(community => {
                            const status = STATUS_CONFIG[community.status];
                            const StatusIcon = status?.icon;
                            return (
                                <Card
                                    key={community.id}
                                    padding="sm"
                                    hoverable
                                    className={`community-item ${selectedCommunity === community.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedCommunity(community.id)}
                                >
                                    <div className="item-header">
                                        {status && (
                                            <Badge variant={status.variant} size="sm" icon={StatusIcon ? <StatusIcon size={12} aria-hidden="true" /> : undefined}>
                                                {status.label}
                                            </Badge>
                                        )}
                                        <span className="item-name">{community.name}</span>
                                        <ChevronRightIcon size={16} aria-hidden="true" />
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
                                            {community.contactPerson && <span><UserIcon size={12} aria-hidden="true" /> {community.contactPerson}</span>}
                                            {community.phone && <span><PhoneIcon size={12} aria-hidden="true" /> {community.phone}</span>}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </section>

                    {/* Upcoming Activities */}
                    <section className="panel activities-panel" aria-label="近期活動">
                        <h2><CalendarIcon size={20} aria-hidden="true" /> 近期活動</h2>
                        {activities.length === 0 ? (
                            <EmptyState
                                variant="minimal"
                                title="暫無活動"
                                description="目前沒有排定的社區活動。"
                            />
                        ) : activities.map(activity => (
                            <Card key={activity.id} padding="sm" className="activity-card">
                                <div className="activity-header">
                                    <span className="activity-title">{activity.title}</span>
                                </div>
                                <div className="activity-details">
                                    {(activity.date || activity.time) && (
                                        <span><CalendarIcon size={12} aria-hidden="true" /> {activity.date} {activity.time || ''}</span>
                                    )}
                                    {activity.location && (
                                        <span><LocationIcon size={12} aria-hidden="true" /> {activity.location}</span>
                                    )}
                                    {activity.participants > 0 && (
                                        <span><TeamsIcon size={12} aria-hidden="true" /> 已報名 {activity.participants} 人</span>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </section>
                </div>
            )}
        </div>
    );
}
