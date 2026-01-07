import { useState, useEffect } from 'react';

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
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('month');

    useEffect(() => {
        const mockData: LeaderboardEntry[] = [
            { rank: 1, volunteerId: '1', name: 'Wang Daming', hours: 156, missions: 23, points: 2450 },
            { rank: 2, volunteerId: '2', name: 'Lin Xiaohua', hours: 142, missions: 19, points: 2180 },
            { rank: 3, volunteerId: '3', name: 'Chen Zhiqiang', hours: 128, missions: 17, points: 1920 },
            { rank: 4, volunteerId: '4', name: 'Zhang Wei', hours: 98, missions: 14, points: 1650 },
            { rank: 5, volunteerId: '5', name: 'Liu Ming', hours: 87, missions: 12, points: 1420 },
        ];
        setEntries(mockData);
        setLoading(false);
    }, [timeframe]);

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-yellow-500 text-black';
            case 2: return 'bg-gray-400 text-black';
            case 3: return 'bg-amber-700 text-white';
            default: return 'bg-slate-600 text-white';
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    const topThree = entries.slice(0, 3);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Volunteer Leaderboard</h1><p className="text-gray-400">Top performing volunteers</p></div>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    {(['week', 'month', 'year', 'all'] as const).map((t) => (
                        <button key={t} onClick={() => setTimeframe(t)} className={`px-4 py-2 rounded capitalize ${timeframe === t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                            {t === 'all' ? 'All Time' : `This ${t}`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-center items-end gap-4 py-8">
                {topThree[1] && <div className="text-center"><div className="w-20 h-20 rounded-full bg-gray-400 mx-auto mb-2 flex items-center justify-center text-black text-2xl font-bold">{topThree[1].name.charAt(0)}</div><p className="text-white font-medium">{topThree[1].name}</p><p className="text-gray-400 text-sm">{topThree[1].points} pts</p><div className="h-24 w-24 bg-gray-400/20 rounded-t-lg mt-2 flex items-center justify-center"><span className="text-3xl font-bold text-gray-400">2</span></div></div>}
                {topThree[0] && <div className="text-center"><div className="w-24 h-24 rounded-full bg-yellow-500 mx-auto mb-2 flex items-center justify-center text-black text-3xl font-bold">{topThree[0].name.charAt(0)}</div><p className="text-white font-medium text-lg">{topThree[0].name}</p><p className="text-amber-400">{topThree[0].points} pts</p><div className="h-32 w-28 bg-yellow-500/20 rounded-t-lg mt-2 flex items-center justify-center"><span className="text-4xl font-bold text-yellow-500">1</span></div></div>}
                {topThree[2] && <div className="text-center"><div className="w-20 h-20 rounded-full bg-amber-700 mx-auto mb-2 flex items-center justify-center text-white text-2xl font-bold">{topThree[2].name.charAt(0)}</div><p className="text-white font-medium">{topThree[2].name}</p><p className="text-gray-400 text-sm">{topThree[2].points} pts</p><div className="h-16 w-24 bg-amber-700/20 rounded-t-lg mt-2 flex items-center justify-center"><span className="text-3xl font-bold text-amber-700">3</span></div></div>}
            </div>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Volunteer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hours</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Missions</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Points</th></tr></thead>
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
        </div>
    );
}
