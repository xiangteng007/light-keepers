import { useState, useEffect } from 'react';

interface StatData { label: string; value: number; change: number; }
interface ChartData { name: string; value: number; }

export default function AnalyticsPage() {
    const [stats, setStats] = useState<StatData[]>([]);
    const [missionData, setMissionData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

    useEffect(() => {
        setStats([
            { label: 'Total Missions', value: 156, change: 12 },
            { label: 'Volunteers Deployed', value: 892, change: 45 },
            { label: 'Resources Distributed', value: 12450, change: 820 },
            { label: 'Response Time (avg)', value: 23, change: -5 },
        ]);
        setMissionData([
            { name: 'Flood', value: 45 },
            { name: 'Earthquake', value: 28 },
            { name: 'Fire', value: 32 },
            { name: 'Typhoon', value: 51 },
        ]);
        setLoading(false);
    }, [timeRange]);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1><p className="text-gray-400">Platform performance insights</p></div>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    {(['week', 'month', 'year'] as const).map((t) => (
                        <button key={t} onClick={() => setTimeRange(t)} className={`px-4 py-2 rounded capitalize ${timeRange === t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                        <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                        <p className="text-3xl font-bold text-white">{stat.value.toLocaleString()}{stat.label.includes('Time') && 'min'}</p>
                        <p className={`text-sm ${stat.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stat.change > 0 ? '↑' : '↓'} {Math.abs(stat.change)} from last {timeRange}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Missions by Type</h3>
                    <div className="space-y-4">
                        {missionData.map((item) => {
                            const maxVal = Math.max(...missionData.map(d => d.value));
                            const pct = (item.value / maxVal) * 100;
                            return (
                                <div key={item.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-300">{item.name}</span>
                                        <span className="text-white font-medium">{item.value}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Response Time Trend</h3>
                    <div className="flex items-end h-48 gap-2">
                        {[35, 28, 32, 25, 23, 20, 18].map((val, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div className="w-full bg-amber-500/80 rounded-t" style={{ height: `${(val / 40) * 100}%` }}></div>
                                <span className="text-gray-400 text-xs mt-2">D{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Recent Activity</h3>
                    <button className="text-amber-400 text-sm hover:text-amber-300">View All</button>
                </div>
                <div className="space-y-3">
                    {[
                        { action: 'Mission completed', detail: 'TW-KHH-330-001', time: '2h ago' },
                        { action: 'New volunteers deployed', detail: '12 members to Zone B', time: '3h ago' },
                        { action: 'Resource transfer', detail: '500 water bottles to South Station', time: '5h ago' },
                    ].map((activity, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                            <div><p className="text-white">{activity.action}</p><p className="text-gray-400 text-sm">{activity.detail}</p></div>
                            <span className="text-gray-400 text-sm">{activity.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
