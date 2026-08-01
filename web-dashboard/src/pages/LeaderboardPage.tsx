/**
 * 志工表揚/排行榜頁面
 * Volunteer Recognition & Leaderboard Page
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getVolunteerLeaderboard,
    getVolunteerRecognitions,
    type VolunteerLeaderboardEntry,
    type VolunteerRecognition,
} from '../api/services';
import {
    Trophy,
    Award,
    Star,
    Medal,
    Crown,
    TrendingUp,
    Clock,
    Calendar,
    Users,
    ChevronRight,
} from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './LeaderboardPage.css';

// 時間區間選項
const TIME_PERIODS = [
    { value: 'week', label: '本週' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季' },
    { value: 'year', label: '本年' },
    { value: 'all', label: '全部' },
];

// 排名對應獎牌（金/銅為 --color-warning-light/-dark 精確對應；銀牌無語義 token，保留品牌裝飾色）
const RANK_MEDALS: Record<number, { icon: typeof Crown; color: string }> = {
    1: { icon: Crown, color: 'var(--color-warning-light, #fbbf24)' },
    2: { icon: Medal, color: '#94a3b8' },
    3: { icon: Medal, color: 'var(--color-warning-dark, #d97706)' },
};

export default function LeaderboardPage() {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'leaderboard' | 'recognitions'>('leaderboard');
    const [timePeriod, setTimePeriod] = useState('month');
    const [leaderboard, setLeaderboard] = useState<VolunteerLeaderboardEntry[]>([]);
    const [recognitions, setRecognitions] = useState<VolunteerRecognition[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRank, setMyRank] = useState<number | null>(null);

    // 載入排行榜
    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const res = await getVolunteerLeaderboard({ period: timePeriod, limit: 50 });
            setLeaderboard(res.data.data || []);

            // 找到當前用戶排名
            if (user) {
                const myIndex = (res.data.data || []).findIndex(
                    (entry: VolunteerLeaderboardEntry) => entry.volunteerId === user.id
                );
                setMyRank(myIndex >= 0 ? myIndex + 1 : null);
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // 載入表揚記錄
    const loadRecognitions = async () => {
        try {
            setLoading(true);
            const res = await getVolunteerRecognitions({ limit: 50 });
            setRecognitions(res.data.data || []);
        } catch (error) {
            console.error('Failed to load recognitions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            loadLeaderboard();
        } else {
            loadRecognitions();
        }
    }, [activeTab, timePeriod]);

    // 格式化時數
    const formatHours = (hours: number) => {
        if (hours >= 100) return `${Math.floor(hours)}`;
        return hours.toFixed(1);
    };

    // 格式化日期
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="leaderboard-page">
            {/* 頁面標題 */}
            <header className="leaderboard-header">
                <div className="leaderboard-header__title">
                    <h1><Trophy size={24} aria-hidden="true" /> 志工表揚</h1>
                    <p>服務時數排行榜與表揚紀錄</p>
                </div>
            </header>

            {/* 我的排名卡片 */}
            {user && myRank && (
                <div className="my-rank-card">
                    <div className="my-rank-card__icon" aria-hidden="true">
                        <Star size={24} />
                    </div>
                    <div className="my-rank-card__content">
                        <span className="label">我的排名</span>
                        <span className="rank tabular-nums">第 {myRank} 名</span>
                    </div>
                    <ChevronRight size={20} aria-hidden="true" />
                </div>
            )}

            {/* Tab 切換 */}
            <div className="leaderboard-tabs" role="tablist" aria-label="檢視切換">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'leaderboard'}
                    className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leaderboard')}
                >
                    <Trophy size={16} aria-hidden="true" />
                    排行榜
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'recognitions'}
                    className={`tab-btn ${activeTab === 'recognitions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recognitions')}
                >
                    <Award size={16} aria-hidden="true" />
                    表揚紀錄
                </button>
            </div>

            {activeTab === 'leaderboard' && (
                <>
                    {/* 時間篩選 */}
                    <div className="time-filter" role="group" aria-label="時間區間篩選">
                        <Clock size={16} aria-hidden="true" />
                        {TIME_PERIODS.map(period => (
                            <button
                                key={period.value}
                                type="button"
                                aria-pressed={timePeriod === period.value}
                                className={`filter-btn ${timePeriod === period.value ? 'active' : ''}`}
                                onClick={() => setTimePeriod(period.value)}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>

                    {/* 排行榜前三名 */}
                    {leaderboard.length >= 3 && (
                        <div className="top-three">
                            {[1, 0, 2].map(idx => {
                                const entry = leaderboard[idx];
                                if (!entry) return null;
                                const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                                const RankIcon = RANK_MEDALS[rank].icon;

                                return (
                                    <div
                                        key={entry.volunteerId}
                                        className={`top-card rank-${rank}`}
                                    >
                                        <div
                                            className="top-card__medal"
                                            style={{ color: RANK_MEDALS[rank].color }}
                                        >
                                            <RankIcon size={rank === 1 ? 32 : 24} />
                                        </div>
                                        <div className="top-card__avatar">
                                            {entry.volunteerName.charAt(0)}
                                        </div>
                                        <span className="top-card__name">{entry.volunteerName}</span>
                                        <span className="top-card__hours tabular-nums">
                                            {formatHours(entry.totalHours)} 小時
                                        </span>
                                        <span className="top-card__events tabular-nums">
                                            {entry.eventCount} 場活動
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 排行榜列表 */}
                    <div className="leaderboard-list">
                        {loading ? (
                            <Skeleton variant="text" count={5} height={56} />
                        ) : leaderboard.length === 0 ? (
                            <EmptyState icon={Trophy} title="尚無服務記錄" />
                        ) : (
                            leaderboard.slice(3).map((entry, idx) => (
                                <div
                                    key={entry.volunteerId}
                                    className={`leaderboard-item ${entry.volunteerId === user?.id ? 'is-me' : ''}`}
                                >
                                    <span className="leaderboard-item__rank tabular-nums">{idx + 4}</span>
                                    <div className="leaderboard-item__avatar" aria-hidden="true">
                                        {entry.volunteerName.charAt(0)}
                                    </div>
                                    <div className="leaderboard-item__info">
                                        <span className="name">{entry.volunteerName}</span>
                                        <span className="meta">
                                            <Users size={12} aria-hidden="true" /> <span className="tabular-nums">{entry.eventCount}</span> 場活動
                                        </span>
                                    </div>
                                    <div className="leaderboard-item__hours tabular-nums">
                                        <TrendingUp size={14} aria-hidden="true" />
                                        {formatHours(entry.totalHours)} 小時
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {activeTab === 'recognitions' && (
                <div className="recognitions-list">
                    {loading ? (
                        <Skeleton variant="card" count={3} height={110} />
                    ) : recognitions.length === 0 ? (
                        <EmptyState icon={Award} title="尚無表揚紀錄" />
                    ) : (
                        recognitions.map(rec => (
                            <article key={rec.id} className="recognition-card">
                                <div className={`recognition-card__badge ${rec.badgeType}`} aria-hidden="true">
                                    <Award size={24} />
                                </div>
                                <div className="recognition-card__content">
                                    <h3>{rec.volunteerName}</h3>
                                    <p className="recognition-card__title">{rec.title}</p>
                                    <p className="recognition-card__reason">{rec.reason}</p>
                                    <div className="recognition-card__meta">
                                        <span><Calendar size={12} aria-hidden="true" /> {formatDate(rec.awardedAt)}</span>
                                        {rec.awardedBy && <span>頒發人：{rec.awardedBy}</span>}
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
