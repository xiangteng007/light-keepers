/**
 * 志工排行榜
 *
 * FE-4 遷移範本（3.1 示範頁 1/3）：utils/api → src/api/client + react-query
 * 見 docs/architecture/API_CLIENT_CONSOLIDATION.md §「遷移模式 A：單一 GET 清單」
 *
 * R3b 視覺重建：archetype = List（排名清單，rank/hours/missions/points 皆
 * tabular-nums）。原本整頁依賴專案未啟用 PostCSS 的 Tailwind className，
 * 改為語義 token；領獎台（Top 3）維持自訂視覺，獎牌色為裝飾色（非狀態色），
 * 取自品牌 gold/brown 色階，不挪用 danger/warning/success token。
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SyncIcon, TrophyIcon } from '../../../design-system/icons';
import api from '../../../api/client';
import { getApiErrorMessage } from '../../../api/errors';
import { Alert, Button } from '../../../design-system';
import EmptyState from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import './LeaderboardPage.css';

interface LeaderboardEntry {
    rank: number;
    volunteerId: string;
    name: string;
    hours: number;
    missions: number;
    points: number;
}

type Timeframe = 'week' | 'month' | 'year' | 'all';

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
    week: '本週',
    month: '本月',
    year: '本年',
    all: '全部',
};

/** query key 慣例：[領域, 資源, ...參數] */
const leaderboardKeys = {
    ranking: (timeframe: Timeframe) => ['volunteer-points', 'ranking', timeframe] as const,
};

export default function LeaderboardPage() {
    const [timeframe, setTimeframe] = useState<Timeframe>('month');

    const {
        data: entries = [],
        isFetching: loading,
        error: queryError,
        refetch: fetchLeaderboard,
    } = useQuery({
        queryKey: leaderboardKeys.ranking(timeframe),
        queryFn: async ({ signal }): Promise<LeaderboardEntry[]> => {
            const response = await api.get('/volunteer-points/ranking', {
                params: { timeframe, limit: 20 },
                signal,
            });
            const data = response.data?.data || response.data || [];
            const items = Array.isArray(data) ? data : (data.items || data.ranking || []);
            return items.map((item: any, index: number) => ({
                rank: item.rank || index + 1,
                volunteerId: item.volunteerId || item.id || String(index),
                name: item.name || item.volunteerName || '未知',
                hours: item.hours || item.totalHours || 0,
                missions: item.missions || item.missionCount || 0,
                points: item.points || item.totalPoints || 0,
            }));
        },
    });

    const error = queryError ? getApiErrorMessage(queryError, '無法載入排行榜') : null;

    const getRankModifier = (rank: number) => {
        switch (rank) {
            case 1: return 'leaderboard-rank--gold';
            case 2: return 'leaderboard-rank--silver';
            case 3: return 'leaderboard-rank--bronze';
            default: return 'leaderboard-rank--default';
        }
    };

    const topThree = entries.slice(0, 3);

    return (
        <div className="leaderboard-page">
            <div className="page-header">
                <div className="page-header__titles">
                    <h1>志工排行榜</h1>
                    <p className="page-header__subtitle">表現優異的志工排名</p>
                </div>
                <div className="leaderboard-page__actions">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fetchLeaderboard()}
                        disabled={loading}
                        icon={<SyncIcon size={16} aria-hidden="true" />}
                        aria-label="重新整理"
                    />
                    <div className="leaderboard-timeframe" role="tablist" aria-label="時間範圍">
                        {(['week', 'month', 'year', 'all'] as const).map((t) => (
                            <button
                                key={t}
                                role="tab"
                                aria-selected={timeframe === t}
                                onClick={() => setTimeframe(t)}
                                className={`leaderboard-timeframe__btn ${timeframe === t ? 'is-active' : ''}`}
                            >
                                {TIMEFRAME_LABELS[t]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="danger" title="載入失敗" className="leaderboard-page__alert">
                    <div className="leaderboard-page__alert-body">
                        <span>{error}</span>
                        <Button variant="secondary" size="sm" onClick={() => fetchLeaderboard()}>重試</Button>
                    </div>
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <div className="leaderboard-skeleton" role="status" aria-label="載入排行榜中">
                    <Skeleton variant="card" height={48} count={5} />
                </div>
            )}

            {!loading && entries.length > 0 && (
                <>
                    {/* 領獎台（Top 3，裝飾視覺） */}
                    <div className="leaderboard-podium">
                        {topThree[1] && (
                            <div className="leaderboard-podium__slot leaderboard-podium__slot--2">
                                <div className="leaderboard-podium__avatar leaderboard-rank--silver">{topThree[1].name.charAt(0)}</div>
                                <p className="leaderboard-podium__name">{topThree[1].name}</p>
                                <p className="leaderboard-podium__points">{topThree[1].points} 分</p>
                                <div className="leaderboard-podium__bar leaderboard-podium__bar--2">2</div>
                            </div>
                        )}
                        {topThree[0] && (
                            <div className="leaderboard-podium__slot leaderboard-podium__slot--1">
                                <div className="leaderboard-podium__avatar leaderboard-podium__avatar--lg leaderboard-rank--gold">{topThree[0].name.charAt(0)}</div>
                                <p className="leaderboard-podium__name leaderboard-podium__name--lg">{topThree[0].name}</p>
                                <p className="leaderboard-podium__points leaderboard-podium__points--accent">{topThree[0].points} 分</p>
                                <div className="leaderboard-podium__bar leaderboard-podium__bar--1">1</div>
                            </div>
                        )}
                        {topThree[2] && (
                            <div className="leaderboard-podium__slot leaderboard-podium__slot--3">
                                <div className="leaderboard-podium__avatar leaderboard-rank--bronze">{topThree[2].name.charAt(0)}</div>
                                <p className="leaderboard-podium__name">{topThree[2].name}</p>
                                <p className="leaderboard-podium__points">{topThree[2].points} 分</p>
                                <div className="leaderboard-podium__bar leaderboard-podium__bar--3">3</div>
                            </div>
                        )}
                    </div>

                    {/* 桌機：完整排名表格 */}
                    <div className="leaderboard-table-wrapper">
                        <table className="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>名次</th>
                                    <th>志工</th>
                                    <th>時數</th>
                                    <th>任務</th>
                                    <th>積分</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.volunteerId}>
                                        <td>
                                            <span className={`leaderboard-rank ${getRankModifier(entry.rank)}`}>{entry.rank}</span>
                                        </td>
                                        <td className="leaderboard-table__name">{entry.name}</td>
                                        <td className="leaderboard-table__num">{entry.hours}h</td>
                                        <td className="leaderboard-table__num">{entry.missions}</td>
                                        <td className="leaderboard-table__num leaderboard-table__points">{entry.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 行動端：Card 直列 */}
                    <div className="leaderboard-card-list">
                        {entries.map((entry) => (
                            <div key={entry.volunteerId} className="leaderboard-record-card">
                                <span className={`leaderboard-rank ${getRankModifier(entry.rank)}`}>{entry.rank}</span>
                                <div className="leaderboard-record-card__main">
                                    <span className="leaderboard-record-card__name">{entry.name}</span>
                                    <span className="leaderboard-record-card__meta">{entry.hours}h · {entry.missions} 任務</span>
                                </div>
                                <span className="leaderboard-record-card__points">{entry.points} 分</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!loading && entries.length === 0 && !error && (
                <EmptyState icon={TrophyIcon} variant="minimal" title="暫無排行資料" description="請選擇其他時間範圍，或稍後再試" />
            )}
        </div>
    );
}
