import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';

interface LeaderboardEntry {
    rank: number;
    volunteerId: string;
    name: string;
    hours: number;
    missions: number;
    points: number;
}

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('month');

    const fetchLeaderboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Try volunteer points ranking endpoint
            const response = await api.get('/volunteer-points/ranking', {
                params: { timeframe, limit: '20' },
            });
            const data = response.data?.data || response.data || [];
            const items = Array.isArray(data) ? data : (data.items || data.ranking || []);
            setEntries(items.map((item: any, index: number) => ({
                rank: item.rank || index + 1,
                volunteerId: item.volunteerId || item.id || String(index),
                name: item.name || item.volunteerName || '未知',
                hours: item.hours || item.totalHours || 0,
                missions: item.missions || item.missionCount || 0,
                points: item.points || item.totalPoints || 0,
            })));
        } catch (err: any) {
            console.error('Failed to fetch leaderboard:', err);
            setError(err?.response?.data?.message || '無法載入排行榜');
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [timeframe]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-yellow-500 text-black';
            case 2: return 'bg-gray-400 text-black';
            case 3: return 'bg-amber-700 text-white';
            default: return 'bg-slate-600 text-white';
        }
    };

    const topThree = entries.slice(0, 3);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">志工排行榜</h1><p className="text-gray-400">表現優異的志工排名</p></div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchLeaderboard} disabled={loading} className="px-3 py-2 text-gray-400 hover:text-white" title="重新整理">
                        {loading ? '⏳' : '🔄'}
                    </button>
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        {(['week', 'month', 'year', 'all'] as const).map((t) => (
                            <button key={t} onClick={() => setTimeframe(t)} className={`px-4 py-2 rounded capitalize ${timeframe === t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                                {t === 'all' ? '全部' : t === 'week' ? '本週' : t === 'month' ? '本月' : '本年'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#94a3b8' }}>
                    載入排行榜中...
                </div>
            )}

            {!loading && entries.length > 0 && (
                <>
                    <div className="flex justify-center items-end gap-4 py-8">
                        {topThree[1] && <div className="text-center"><div className="w-20 h-20 rounded-full bg-gray-400 mx-auto mb-2 flex items-center justify-center text-black text-2xl font-bold">{topThree[1].name.charAt(0)}</div><p className="text-white font-medium">{topThree[1].name}</p><p className="text-gray-400 text-sm">{topThree[1].points} 分</p><div className="h-24 w-24 bg-gray-400/20 rounded-t-lg mt-2 flex items-center justify-center"><span className="text-3xl font-bold text-gray-400">2</span></div></div>}
                        {topThree[0] && <div className="text-center"><div className="w-24 h-24 rounded-full bg-yellow-500 mx-auto mb-2 flex items-center justify-center text-black text-3xl font-bold">{topThree[0].name.charAt(0)}</div><p className="text-white font-medium text-lg">{topThree[0].name}</p><p className="text-amber-400">{topThree[0].points} 分</p><div className="h-32 w-28 bg-yellow-500/20 rounded-t-lg mt-2 flex items-center justify-center"><span className="text-4xl font-bold text-yellow-500">1</span></div></div>}
                        {topThree[2] && <div className="text-center"><div className="w-20 h-20 rounded-full bg-amber-700 mx-auto mb-2 flex items-center justify-center text-white text-2xl font-bold">{topThree[2].name.charAt(0)}</div><p className="text-white font-medium">{topThree[2].name}</p><p className="text-gray-400 text-sm">{topThree[2].points} 分</p><div className="h-16 w-24 bg-amber-700/20 rounded-t-lg mt-2 flex items-center justify-center"><span className="text-3xl font-bold text-amber-700">3</span></div></div>}
                    </div>

                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                        <table className="w-full">
                            <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">名次</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">志工</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">時數</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">任務</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">積分</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">
                                {entries.map((entry) => (
                                    <tr key={entry.volunteerId} className="hover:bg-slate-700/50">
                                        <td className="px-6 py-4"><span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getRankStyle(entry.rank)}`}>{entry.rank}</span></td>
                                        <td className="px-6 py-4 text-white font-medium">{entry.name}</td>
                                        <td className="px-6 py-4 text-gray-300">{entry.hours}h</td>
                                        <td className="px-6 py-4 text-gray-300">{entry.missions}</td>
                                        <td className="px-6 py-4 text-amber-400 font-medium">{entry.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {!loading && entries.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    暫無排行資料
                </div>
            )}
        </div>
    );
}
