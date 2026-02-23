/**
 * UnifiedResourcesPage.tsx
 *
 * B3: 資源整合頁面 — 跨組織資源匹配與協調
 * Connects to resource-matching backend APIs
 */
import { useState, useEffect, useCallback } from 'react';
import { Package, Users, ArrowRightLeft, RefreshCw } from 'lucide-react';
import api from '../utils/api';

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
            setError(err.response?.data?.message || err.message || '無法載入資源匹配資料');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                    <p className="font-medium">載入失敗</p>
                    <p className="text-sm mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                        重試
                    </button>
                </div>
            </div>
        );
    }

    const matchRate = stats && stats.totalMatches > 0
        ? ((stats.completedMatches / stats.totalMatches) * 100).toFixed(1)
        : '0';

    const fulfillRate = stats && stats.totalNeeds > 0
        ? ((stats.fulfilledNeeds / stats.totalNeeds) * 100).toFixed(1)
        : '0';

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">🔗 資源整合</h1>
                    <p className="text-gray-400">跨組織物資協調、資源匹配、調度追蹤</p>
                </div>
                <button onClick={fetchData} className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 flex items-center gap-2">
                    <RefreshCw size={16} /> 重新整理
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/50">
                    <div className="flex items-center gap-2 mb-2">
                        <Package size={18} className="text-blue-400" />
                        <span className="text-blue-400 text-sm">捐贈總數</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{stats?.totalDonations ?? 0}</p>
                    <p className="text-blue-300/60 text-xs mt-1">活躍: {stats?.activeDonations ?? 0}</p>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/50">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={18} className="text-purple-400" />
                        <span className="text-purple-400 text-sm">需求總數</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">{stats?.totalNeeds ?? 0}</p>
                    <p className="text-purple-300/60 text-xs mt-1">已滿足: {stats?.fulfilledNeeds ?? 0} ({fulfillRate}%)</p>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/50">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowRightLeft size={18} className="text-green-400" />
                        <span className="text-green-400 text-sm">匹配總數</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{stats?.totalMatches ?? 0}</p>
                    <p className="text-green-300/60 text-xs mt-1">完成率: {matchRate}%</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-4 border border-amber-500/50">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-amber-400">⏱</span>
                        <span className="text-amber-400 text-sm">平均配對時間</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">
                        {stats?.averageMatchTime ? `${(stats.averageMatchTime / 60000).toFixed(0)}` : '—'}
                    </p>
                    <p className="text-amber-300/60 text-xs mt-1">分鐘</p>
                </div>
            </div>

            {/* Top Item Types */}
            {stats?.topItemTypes && stats.topItemTypes.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-white font-medium mb-3">📊 熱門物資類型</h3>
                    <div className="flex flex-wrap gap-2">
                        {stats.topItemTypes.map((item) => (
                            <div key={item.type} className="bg-slate-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
                                <span className="text-white text-sm">{item.type}</span>
                                <span className="bg-amber-500/30 text-amber-400 text-xs px-2 py-0.5 rounded">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Donor Leaderboard */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-white font-medium mb-3">🏆 捐贈者排行</h3>
                {leaderboard.length === 0 ? (
                    <p className="text-gray-400 text-sm">尚無捐贈記錄</p>
                ) : (
                    <div className="space-y-2">
                        {leaderboard.slice(0, 10).map((donor, index) => (
                            <div key={donor.donorName} className="flex items-center gap-4 bg-slate-700/30 rounded-lg p-3">
                                <span className={`text-lg font-bold w-8 text-center ${index < 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                                    {index + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="text-white text-sm">{donor.donorName}</p>
                                    <p className="text-gray-400 text-xs">
                                        {donor.totalDonations} 次捐贈 · {donor.matchedCount} 次配對成功
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    {donor.topItems?.slice(0, 3).map((item) => (
                                        <span key={item} className="bg-slate-600 text-gray-300 text-xs px-2 py-0.5 rounded">{item}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
