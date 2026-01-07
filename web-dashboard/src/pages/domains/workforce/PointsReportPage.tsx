import { useState, useEffect } from 'react';

interface PointsRecord { id: string; volunteerId: string; volunteerName: string; points: number; reason: string; date: string; type: 'earned' | 'redeemed'; }
interface VolunteerPoints { volunteerId: string; name: string; totalPoints: number; thisMonth: number; rank: number; }

export default function PointsReportPage() {
    const [leaderboard, setLeaderboard] = useState<VolunteerPoints[]>([]);
    const [records, setRecords] = useState<PointsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');

    useEffect(() => {
        setLeaderboard([
            { volunteerId: '1', name: 'Wang Daming', totalPoints: 2450, thisMonth: 320, rank: 1 },
            { volunteerId: '2', name: 'Lin Xiaohua', totalPoints: 2180, thisMonth: 280, rank: 2 },
            { volunteerId: '3', name: 'Chen Zhiqiang', totalPoints: 1920, thisMonth: 250, rank: 3 },
        ]);
        setRecords([
            { id: '1', volunteerId: '1', volunteerName: 'Wang Daming', points: 50, reason: 'Mission completed', date: '2024-12-08', type: 'earned' },
            { id: '2', volunteerId: '2', volunteerName: 'Lin Xiaohua', points: 30, reason: 'Training attendance', date: '2024-12-07', type: 'earned' },
            { id: '3', volunteerId: '1', volunteerName: 'Wang Daming', points: -50, reason: 'Gift redemption', date: '2024-12-05', type: 'redeemed' },
        ]);
        setLoading(false);
    }, []);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Points Report</h1><p className="text-gray-400">Volunteer recognition tracking</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Export Report</button>
            </div>
            <div className="flex gap-4 border-b border-slate-700">
                <button onClick={() => setActiveTab('leaderboard')} className={`pb-3 px-1 font-medium ${activeTab === 'leaderboard' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}`}>Leaderboard</button>
                <button onClick={() => setActiveTab('history')} className={`pb-3 px-1 font-medium ${activeTab === 'history' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}`}>History</button>
            </div>
            {activeTab === 'leaderboard' && (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Volunteer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">This Month</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-700">
                            {leaderboard.map((v) => (
                                <tr key={v.volunteerId} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4"><span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${v.rank === 1 ? 'bg-yellow-500 text-black' : v.rank === 2 ? 'bg-gray-400 text-black' : 'bg-amber-700 text-white'}`}>{v.rank}</span></td>
                                    <td className="px-6 py-4 text-white font-medium">{v.name}</td>
                                    <td className="px-6 py-4 text-green-400">+{v.thisMonth}</td>
                                    <td className="px-6 py-4 text-amber-400 font-bold">{v.totalPoints.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'history' && (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Volunteer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reason</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Points</th></tr></thead>
                        <tbody className="divide-y divide-slate-700">
                            {records.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4 text-gray-300">{r.date}</td>
                                    <td className="px-6 py-4 text-white">{r.volunteerName}</td>
                                    <td className="px-6 py-4 text-gray-300">{r.reason}</td>
                                    <td className={`px-6 py-4 font-medium ${r.type === 'earned' ? 'text-green-400' : 'text-red-400'}`}>{r.type === 'earned' ? '+' : ''}{r.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
