import { useState, useEffect } from 'react';

interface Drone { id: string; name: string; model: string; status: 'active' | 'standby' | 'charging' | 'maintenance'; battery: number; altitude: number; speed: number; location: string; mission: string | null; lastUpdate: string; }

export default function DroneControlPage() {
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);

    useEffect(() => {
        setDrones([
            { id: 'UAV-001', name: 'Eagle One', model: 'DJI Matrice 300', status: 'active', battery: 78, altitude: 120, speed: 45, location: 'Zone A', mission: 'TW-KHH-330-001', lastUpdate: '10s ago' },
            { id: 'UAV-002', name: 'Hawk Two', model: 'DJI Mavic 3', status: 'active', battery: 65, altitude: 80, speed: 35, location: 'Zone B', mission: 'TW-TPE-110-002', lastUpdate: '15s ago' },
            { id: 'UAV-003', name: 'Falcon Three', model: 'DJI Phantom 4', status: 'charging', battery: 45, altitude: 0, speed: 0, location: 'HQ Base', mission: null, lastUpdate: '2m ago' },
            { id: 'UAV-004', name: 'Osprey Four', model: 'Autel EVO II', status: 'standby', battery: 100, altitude: 0, speed: 0, location: 'HQ Base', mission: null, lastUpdate: '5m ago' },
        ]);
        setLoading(false);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'standby': return 'bg-blue-500';
            case 'charging': return 'bg-yellow-500';
            case 'maintenance': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getBatteryColor = (battery: number) => battery > 50 ? 'text-green-400' : battery > 20 ? 'text-yellow-400' : 'text-red-400';

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Drone Control Center</h1><p className="text-gray-400">UAV fleet management and monitoring</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Deploy Drone</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/50"><p className="text-green-400 text-sm">Active</p><p className="text-2xl font-bold text-green-400">{drones.filter(d => d.status === 'active').length}</p></div>
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/50"><p className="text-blue-400 text-sm">Standby</p><p className="text-2xl font-bold text-blue-400">{drones.filter(d => d.status === 'standby').length}</p></div>
                <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/50"><p className="text-yellow-400 text-sm">Charging</p><p className="text-2xl font-bold text-yellow-400">{drones.filter(d => d.status === 'charging').length}</p></div>
                <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/50"><p className="text-red-400 text-sm">Maintenance</p><p className="text-2xl font-bold text-red-400">{drones.filter(d => d.status === 'maintenance').length}</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-lg font-medium text-white mb-4">Fleet Overview</h3>
                    <div className="space-y-3">
                        {drones.map((drone) => (
                            <div key={drone.id} onClick={() => setSelectedDrone(drone)} className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedDrone?.id === drone.id ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(drone.status)}`}></div>
                                        <div><p className="text-white font-medium">{drone.name}</p><p className="text-gray-400 text-sm">{drone.id} - {drone.model}</p></div>
                                    </div>
                                    <span className={`text-sm font-medium ${getBatteryColor(drone.battery)}`}>🔋 {drone.battery}%</span>
                                </div>
                                {drone.status === 'active' && (
                                    <div className="flex gap-4 text-sm text-gray-400 mt-2">
                                        <span>Alt: {drone.altitude}m</span>
                                        <span>Speed: {drone.speed}km/h</span>
                                        <span>Location: {drone.location}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-lg font-medium text-white mb-4">{selectedDrone ? 'Drone Details' : 'Select a Drone'}</h3>
                    {selectedDrone ? (
                        <div className="space-y-4">
                            <div className="text-center py-4"><div className="text-6xl mb-2">🛸</div><p className="text-white font-bold text-xl">{selectedDrone.name}</p><p className="text-gray-400">{selectedDrone.model}</p></div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={`capitalize ${getStatusColor(selectedDrone.status).replace('bg-', 'text-')}`}>{selectedDrone.status}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Battery</span><span className={getBatteryColor(selectedDrone.battery)}>{selectedDrone.battery}%</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Location</span><span className="text-white">{selectedDrone.location}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Mission</span><span className="text-white">{selectedDrone.mission || 'None'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Last Update</span><span className="text-gray-300">{selectedDrone.lastUpdate}</span></div>
                            </div>
                            <div className="flex gap-2"><button className="flex-1 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Command</button><button className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">RTH</button></div>
                        </div>
                    ) : <p className="text-gray-400 text-center py-8">Click a drone to view details</p>}
                </div>
            </div>
        </div>
    );
}
