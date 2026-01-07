import { Link } from 'react-router-dom';

interface StatCard { icon: string; value: string | number; label: string; change?: string; }
interface Mission { id: string; title: string; severity: 'critical' | 'high' | 'medium'; progress: number; teams: number; }

const stats: StatCard[] = [
    { icon: '🚨', value: 3, label: 'Active Missions', change: '+2 today' },
    { icon: '👥', value: 156, label: 'Active Volunteers', change: '+12 online' },
    { icon: '📦', value: 2847, label: 'Resources Available' },
    { icon: '✅', value: 89, label: 'Tasks Completed', change: '+15 today' },
];

const activeMissions: Mission[] = [
    { id: 'TW-KHH-330-001', title: '高雄三民區淹水救援', severity: 'critical', progress: 25, teams: 12 },
    { id: 'TW-TPE-110-002', title: '臺北信義區建物搜救', severity: 'high', progress: 40, teams: 8 },
    { id: 'TW-NTP-220-003', title: '新北新店土石流疏散', severity: 'medium', progress: 15, teams: 5 },
];

export default function DashboardPage() {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'medium': return 'bg-yellow-500';
            default: return 'bg-green-500';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Command Center Dashboard</h1>
                    <p className="text-gray-400">Light Keepers Disaster Response System</p>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-sm">SYSTEM OPERATIONAL</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 hover:border-amber-500/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">{stat.icon}</div>
                            <div><p className="text-2xl font-bold text-white">{stat.value}</p><p className="text-gray-400 text-sm">{stat.label}</p>{stat.change && <p className="text-green-400 text-xs">{stat.change}</p>}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-white">Active Missions</h2>
                        <Link to="/mission-command" className="text-amber-400 text-sm hover:text-amber-300">View All →</Link>
                    </div>
                    <div className="space-y-3">
                        {activeMissions.map((mission) => (
                            <div key={mission.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                <div className="flex justify-between items-start mb-2">
                                    <div><p className="text-white font-medium">{mission.title}</p><p className="text-gray-400 text-sm">{mission.id}</p></div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase text-white ${getSeverityColor(mission.severity)}`}>{mission.severity}</span>
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-gray-400 text-sm">{mission.teams} teams deployed</span>
                                    <span className="text-amber-400 text-sm">{mission.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-600 rounded-full h-1.5 mt-2"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${mission.progress}%` }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-white">Quick Actions</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Link to="/emergency-response" className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center hover:bg-red-500/30 transition-colors">
                            <span className="text-2xl block mb-2">🚨</span>
                            <span className="text-red-400 font-medium">Emergency Launch</span>
                        </Link>
                        <Link to="/volunteers" className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg text-center hover:bg-amber-500/30 transition-colors">
                            <span className="text-2xl block mb-2">👥</span>
                            <span className="text-amber-400 font-medium">Manage Volunteers</span>
                        </Link>
                        <Link to="/resources" className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-center hover:bg-blue-500/30 transition-colors">
                            <span className="text-2xl block mb-2">📦</span>
                            <span className="text-blue-400 font-medium">Resources</span>
                        </Link>
                        <Link to="/map" className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center hover:bg-green-500/30 transition-colors">
                            <span className="text-2xl block mb-2">🗺️</span>
                            <span className="text-green-400 font-medium">Map Overview</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
