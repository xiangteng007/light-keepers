/**
 * UnifiedResourcesPage.tsx
 *
 * B3: 資源整合頁面 — 跨組織資源匹配與協調
 * Connects to resource-matching backend APIs
 *
 * R3a 重建（第 2 批）：套用 DESIGN_LANGUAGE.md §7.1 列表頁 archetype
 * （統計摘要 + 排行榜列表變體）。資料層邏輯未變動，僅重建版型與樣式，
 * 修復本頁先前完全依賴已移除的 Tailwind class（無實際樣式效果）的問題。
 */
import { useState, useEffect, useCallback } from 'react';
import {
    InventoryIcon,
    TeamsIcon,
    MergeIcon,
    SyncIcon,
    ClockIcon,
    TrophyIcon,
    TrendUpIcon,
} from '../design-system/icons';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import { Card, Badge, Button, Alert } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import './UnifiedResourcesPage.css';

interface MatchingStats {
    totalDonations: number;
    activeDonations: number;
    totalNeeds: number;
    fulfilledNeeds: number;
    totalMatches: number;
    completedMatches: number;
    averageMatchTime: number;
    topItemTypes: { type: string; count: number }[];
}

interface DonorRanking {
    donorName: string;
    totalDonations: number;
    matchedCount: number;
    topItems: string[];
}

/** 載入骨架：統計卡 + 列表列（DESIGN_LANGUAGE §7.1，載入用 skeleton row ≥3 列） */
function SkeletonBlock() {
    return (
        <div className="ures-skeleton" role="status" aria-label="載入中">
            <div className="ures-skeleton__stats">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="ures-skeleton__stat" />
                ))}
            </div>
            <div className="ures-skeleton__rows">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="ures-skeleton__row" />
                ))}
            </div>
        </div>
    );
}

export default function UnifiedResourcesPage() {
    const [stats, setStats] = useState<MatchingStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<DonorRanking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [statsRes, leaderRes] = await Promise.all([
                api.get('/resource-matching/statistics'),
                api.get('/resource-matching/leaderboard'),
            ]);
            setStats(statsRes.data?.data || statsRes.data || null);
            setLeaderboard(leaderRes.data?.data || leaderRes.data || []);
        } catch (err: any) {
            console.error('Failed to fetch matching data:', err);
            setError(getApiErrorMessage(err, '無法載入資源匹配資料'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const matchRate = stats && stats.totalMatches > 0
        ? ((stats.completedMatches / stats.totalMatches) * 100).toFixed(1)
        : '0';

    const fulfillRate = stats && stats.totalNeeds > 0
        ? ((stats.fulfilledNeeds / stats.totalNeeds) * 100).toFixed(1)
        : '0';

    return (
        <div className="page ures-page">
            <header className="ures-page__header">
                <div>
                    <h1 className="ures-page__title">資源整合</h1>
                    <p className="ures-page__subtitle">跨組織物資協調、資源匹配、調度追蹤</p>
                </div>
                <Button
                    variant="secondary"
                    size="lg"
                    icon={<SyncIcon size={18} aria-hidden="true" />}
                    onClick={fetchData}
                    disabled={loading}
                >
                    重新整理
                </Button>
            </header>

            {loading && <SkeletonBlock />}

            {!loading && error && (
                <Alert variant="danger" title="載入失敗">
                    <p>{error}</p>
                    <Button
                        variant="secondary"
                        size="lg"
                        className="ures-retry-btn"
                        onClick={fetchData}
                    >
                        重試
                    </Button>
                </Alert>
            )}

            {!loading && !error && (
                <>
                    {/* 統計摘要列 */}
                    <section className="ures-stats" aria-label="資源匹配統計摘要">
                        <Card className="ures-stat-card" padding="md">
                            <div className="ures-stat-card__head">
                                <InventoryIcon size={18} aria-hidden="true" />
                                <span>捐贈總數</span>
                            </div>
                            <p className="ures-stat-card__value">{stats?.totalDonations ?? 0}</p>
                            <p className="ures-stat-card__sub">活躍：{stats?.activeDonations ?? 0}</p>
                        </Card>

                        <Card className="ures-stat-card" padding="md">
                            <div className="ures-stat-card__head">
                                <TeamsIcon size={18} aria-hidden="true" />
                                <span>需求總數</span>
                            </div>
                            <p className="ures-stat-card__value">{stats?.totalNeeds ?? 0}</p>
                            <p className="ures-stat-card__sub">
                                已滿足：{stats?.fulfilledNeeds ?? 0}
                                <Badge variant="success" size="xs">{fulfillRate}%</Badge>
                            </p>
                        </Card>

                        <Card className="ures-stat-card" padding="md">
                            <div className="ures-stat-card__head">
                                <MergeIcon size={18} aria-hidden="true" />
                                <span>匹配總數</span>
                            </div>
                            <p className="ures-stat-card__value">{stats?.totalMatches ?? 0}</p>
                            <p className="ures-stat-card__sub">
                                完成率
                                <Badge variant="success" size="xs">{matchRate}%</Badge>
                            </p>
                        </Card>

                        <Card className="ures-stat-card" padding="md">
                            <div className="ures-stat-card__head">
                                <ClockIcon size={18} aria-hidden="true" />
                                <span>平均配對時間</span>
                            </div>
                            <p className="ures-stat-card__value">
                                {stats?.averageMatchTime ? `${(stats.averageMatchTime / 60000).toFixed(0)}` : '—'}
                            </p>
                            <p className="ures-stat-card__sub">分鐘</p>
                        </Card>
                    </section>

                    {/* 熱門物資類型 */}
                    {stats?.topItemTypes && stats.topItemTypes.length > 0 && (
                        <section className="ures-panel">
                            <h2 className="ures-panel__title">
                                <TrendUpIcon size={18} aria-hidden="true" />
                                熱門物資類型
                            </h2>
                            <div className="ures-tag-list">
                                {stats.topItemTypes.map((item) => (
                                    <div key={item.type} className="ures-tag">
                                        <span className="ures-tag__label">{item.type}</span>
                                        <Badge variant="default" size="sm">{item.count}</Badge>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 捐贈者排行榜 */}
                    <section className="ures-panel">
                        <h2 className="ures-panel__title">
                            <TrophyIcon size={18} aria-hidden="true" />
                            捐贈者排行榜
                        </h2>
                        {leaderboard.length === 0 ? (
                            <EmptyState
                                variant="default"
                                title="尚無捐贈記錄"
                                description="目前尚未有捐贈者資料，待有捐贈紀錄後將顯示排行榜。"
                            />
                        ) : (
                            <ol className="ures-leaderboard">
                                {leaderboard.slice(0, 10).map((donor, index) => (
                                    <li key={donor.donorName} className="ures-leaderboard__row">
                                        <span
                                            className={`ures-leaderboard__rank${index < 3 ? ' ures-leaderboard__rank--top' : ''}`}
                                        >
                                            {index + 1}
                                        </span>
                                        <div className="ures-leaderboard__info">
                                            <p className="ures-leaderboard__name">{donor.donorName}</p>
                                            <p className="ures-leaderboard__meta">
                                                {donor.totalDonations} 次捐贈 · {donor.matchedCount} 次配對成功
                                            </p>
                                        </div>
                                        {donor.topItems && donor.topItems.length > 0 && (
                                            <div className="ures-leaderboard__items">
                                                {donor.topItems.slice(0, 3).map((item) => (
                                                    <Badge key={item} variant="default" size="xs">{item}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
