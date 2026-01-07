import { useState, useEffect } from 'react';

interface Equipment { id: string; name: string; type: string; serialNumber: string; status: 'available' | 'in-use' | 'maintenance'; assignedTo: string | null; lastChecked: string; }

export default function EquipmentPage() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setEquipment([
            { id: '1', name: 'Rescue Boat #1', type: 'Vehicle', serialNumber: 'RB-2024-001', status: 'in-use', assignedTo: 'Team Alpha', lastChecked: '2024-12-01' },
            { id: '2', name: 'Medical Kit Set A', type: 'Medical', serialNumber: 'MK-2024-015', status: 'available', assignedTo: null, lastChecked: '2024-12-05' },
            { id: '3', name: 'Radio Transceiver', type: 'Communications', serialNumber: 'RT-2024-042', status: 'in-use', assignedTo: 'Command HQ', lastChecked: '2024-12-08' },
            { id: '4', name: 'Generator 5kW', type: 'Power', serialNumber: 'GN-2024-003', status: 'maintenance', assignedTo: null, lastChecked: '2024-11-25' },
        ]);
        setLoading(false);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) { case 'available': return 'bg-green-500'; case 'in-use': return 'bg-blue-500'; case 'maintenance': return 'bg-yellow-500'; default: return 'bg-gray-500'; }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Equipment Tracking</h1><p className="text-gray-400">Manage and track equipment assets</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">+ Add Equipment</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {equipment.map((eq) => (
                    <div key={eq.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 hover:border-amber-500/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-1 rounded text-xs text-white capitalize ${getStatusColor(eq.status)}`}>{eq.status.replace('-', ' ')}</span>
                            <span className="text-gray-400 text-xs">{eq.serialNumber}</span>
                        </div>
                        <h3 className="text-white font-medium mb-1">{eq.name}</h3>
                        <p className="text-gray-400 text-sm mb-3">{eq.type}</p>
                        <div className="text-sm">
                            <p className="text-gray-400">Assigned: <span className="text-white">{eq.assignedTo || 'None'}</span></p>
                            <p className="text-gray-400">Last Checked: <span className="text-white">{eq.lastChecked}</span></p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
