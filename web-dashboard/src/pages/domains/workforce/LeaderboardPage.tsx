/**
 * 志工表揚/排行榜頁�?
 * Volunteer Recognition & Leaderboard Page
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
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
import './LeaderboardPage.css';

// 時間區間選�?
const TIME_PERIODS = [
    { value: 'week', label: '本�? },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季' },
    { value: 'year', label: '本年' },
    { value: 'all', label: '全部' },
];

// 排名對應獎牌
const RANK_MEDALS: Record<number, { icon: typeof Crown; color: string }> = {
    1: { icon: Crown, color: '#fbbf24' },
    2: { icon: Medal, color: '#94a3b8' },
    3: { icon: Medal, color: '#d97706' },
};

export default function LeaderboardPage() {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'leaderboard' | 'recognitions'>('leaderboard');
    const [timePeriod, setTimePeriod] = useState('month');
    const [leaderboard, setLeaderboard] = useState<VolunteerLeaderboardEntry[]>([]);
    const [recognitions, setRecognitions] = useState<VolunteerRecognition[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRank, setMyRank] = useState<number | null>(null);

    // 載入排行�?
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

    // 格式化時�?
    const formatHours = (hours: number) => {
        if (hours >= 100) return `${Math.floor(hours)}`;
        return hours.toFixed(1);
    };

    // 格式化日�?
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
                    <h1>🏆 志工表揚</h1>
                    <p>服務時數排行榜與表揚紀�?/p>
                </div>
            </header>

            {/* 我的排名卡片 */}
            {user && myRank && (
                <div className="my-rank-card">
                    <div className="my-rank-card__icon">
                        <Star size={24} />
                    </div>
                    <div className="my-rank-card__content">
                        <span className="label">我的排名</span>
                        <span className="rank">�?{myRank} �?/span>
                    </div>
                    <ChevronRight size={20} />
                </div>
            )}

            {/* Tab 切換 */}
            <div className="leaderboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leaderboard')}
                >
                    <Trophy size={16} />
                    排行�?
                </button>
                <button
                    className={`tab-btn ${activeTab === 'recognitions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recognitions')}
                >
                    <Award size={16} />
                    表揚紀�?
                </button>
            </div>

            {activeTab === 'leaderboard' && (
                <>
                    {/* 時間篩選 */}
                    <div className="time-filter">
                        <Clock size={16} />
                        {TIME_PERIODS.map(period => (
                            <button
                                key={period.value}
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
                                        <span className="top-card__hours">
                                            {formatHours(entry.totalHours)} 小時
                                        </span>
                                        <span className="top-card__events">
                                            {entry.eventCount} 場活�?
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 排行榜列�?*/}
                    <div className="leaderboard-list">
                        {loading ? (
                            <div className="loading">載入�?..</div>
                        ) : leaderboard.length === 0 ? (
                            <div className="empty">
                                <Trophy size={48} />
                                <p>尚無服務記錄</p>
                            </div>
                        ) : (
                            leaderboard.slice(3).map((entry, idx) => (
                                <div
                                    key={entry.volunteerId}
                                    className={`leaderboard-item ${entry.volunteerId === user?.id ? 'is-me' : ''}`}
                                >
                                    <span className="leaderboard-item__rank">{idx + 4}</span>
                                    <div className="leaderboard-item__avatar">
                                        {entry.volunteerName.charAt(0)}
                                    </div>
                                    <div className="leaderboard-item__info">
                                        <span className="name">{entry.volunteerName}</span>
                                        <span className="meta">
                                            <Users size={12} /> {entry.eventCount} 場活�?
                                        </span>
                                    </div>
                                    <div className="leaderboard-item__hours">
                                        <TrendingUp size={14} />
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
                        <div className="loading">載入�?..</div>
                    ) : recognitions.length === 0 ? (
                        <div className="empty">
                            <Award size={48} />
                            <p>尚無表揚紀�?/p>
                        </div>
                    ) : (
                        recognitions.map(rec => (
                            <article key={rec.id} className="recognition-card">
                                <div className={`recognition-card__badge ${rec.badgeType}`}>
                                    <Award size={24} />
                                </div>
                                <div className="recognition-card__content">
                                    <h3>{rec.volunteerName}</h3>
                                    <p className="recognition-card__title">{rec.title}</p>
                                    <p className="recognition-card__reason">{rec.reason}</p>
                                    <div className="recognition-card__meta">
                                        <span><Calendar size={12} /> {formatDate(rec.awardedAt)}</span>
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
