import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Mission { id: string; missionId: string; title: string; severity: 'critical' | 'high' | 'medium' | 'low'; location: string; coordinates: string; teamsDeployed: number; assets: string; progress: number; timestamp: string; status: 'active' | 'pending' | 'completed'; }

export default function MissionCommandPage() {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMissions([
            { id: '1', missionId: 'TW-KHH-330-001', title: '高雄三民區淹水救援行動', severity: 'critical', location: '高雄市三民區', coordinates: '22°38\'10.9"N 120°18\'45.2"E', teamsDeployed: 12, assets: '3 (RESCUE BOATS, DRONES)', progress: 25, timestamp: '14:30:15', status: 'active' },
            { id: '2', missionId: 'TW-TPE-110-002', title: '臺北市信義區建物倒塌搜救', severity: 'high', location: '臺北市信義區', coordinates: '25°01\'58.4"N 121°33\'49.6"E', teamsDeployed: 8, assets: '5 (09 UNITS, HEAVY LIFT)', progress: 40, timestamp: '13:55:00', status: 'active' },
            { id: '3', missionId: 'TW-NTP-220-003', title: '新北市新店區土石流疏散', severity: 'medium', location: '新北市新店區', coordinates: '24°57\'21.1"N 121°32\'15.8"E', teamsDeployed: 5, assets: '2 (TRANSPORT VEHICLES)', progress: 15, timestamp: '15:15:45', status: 'pending' },
        ]);
        setLoading(false);
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-black';
            case 'low': return 'bg-green-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mission Command</h1>
                    <p className="text-gray-400">Disaster Response Management System</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 text-sm">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })} | {new Date().toLocaleTimeString('en-US', { hour12: false })}</p>
                    <p className="text-green-400 text-sm flex items-center justify-end gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>SYSTEM STATUS: OPERATIONAL</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missions.map((mission) => (
                    <div key={mission.id} className="bg-slate-800/80 rounded-lg border border-slate-700 p-4 hover:border-amber-500/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                <span className="text-gray-400 text-sm">ID: {mission.missionId}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getSeverityColor(mission.severity)}`}>{mission.severity}</span>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">{mission.title}</h3>
                        <p className="text-gray-400 text-sm mb-3">LOC: {mission.coordinates}</p>
                        <div className="text-gray-400 text-sm mb-4">
                            <p>TEAMS DEPLOYED: {mission.teamsDeployed} | ASSETS: {mission.assets}</p>
                            <p>TIMESTAMP: {mission.timestamp}</p>
                        </div>
                        <div className="flex gap-2 mb-3">
                            <Link to={`/missions/${mission.id}`} className="px-4 py-2 bg-transparent border border-amber-500 text-amber-400 rounded text-sm hover:bg-amber-500/10">VIEW DETAILS</Link>
                            <button className="px-4 py-2 bg-amber-500 text-black rounded text-sm font-medium hover:bg-amber-400">DISPATCH</button>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>PROGRESS:</span>
                                <span>{mission.progress}% COMPLETE</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${mission.progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
