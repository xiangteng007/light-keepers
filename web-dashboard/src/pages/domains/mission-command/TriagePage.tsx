import { useState, useEffect } from 'react';

interface TriageCase { id: string; patientId: string; location: string; condition: string; triageLevel: 'immediate' | 'delayed' | 'minor' | 'deceased'; responder: string; timestamp: string; notes: string; }

export default function TriagePage() {
    const [cases, setCases] = useState<TriageCase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setCases([
            { id: '1', patientId: 'P-001', location: 'Zone A - Building 3', condition: 'Fractured leg, conscious', triageLevel: 'immediate', responder: 'Medic Team 1', timestamp: '14:32:15', notes: 'Requires immediate evacuation' },
            { id: '2', patientId: 'P-002', location: 'Zone A - Building 5', condition: 'Minor cuts, walking', triageLevel: 'minor', responder: 'Medic Team 2', timestamp: '14:35:22', notes: 'Can wait for transport' },
            { id: '3', patientId: 'P-003', location: 'Zone B - Street', condition: 'Head injury, unconscious', triageLevel: 'immediate', responder: 'Medic Team 1', timestamp: '14:38:45', notes: 'Critical - helicopter requested' },
            { id: '4', patientId: 'P-004', location: 'Zone A - Building 1', condition: 'Smoke inhalation', triageLevel: 'delayed', responder: 'Medic Team 3', timestamp: '14:42:10', notes: 'Stable, oxygen provided' },
        ]);
        setLoading(false);
    }, []);

    const getTriageColor = (level: string) => {
        switch (level) {
            case 'immediate': return 'bg-red-500';
            case 'delayed': return 'bg-yellow-500';
            case 'minor': return 'bg-green-500';
            case 'deceased': return 'bg-black';
            default: return 'bg-gray-500';
        }
    };

    const stats = {
        immediate: cases.filter(c => c.triageLevel === 'immediate').length,
        delayed: cases.filter(c => c.triageLevel === 'delayed').length,
        minor: cases.filter(c => c.triageLevel === 'minor').length,
        deceased: cases.filter(c => c.triageLevel === 'deceased').length,
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">START Triage</h1><p className="text-gray-400">Mass casualty incident triage management</p></div>
                <button className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-400">+ New Case</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/50"><p className="text-red-400 text-sm">IMMEDIATE (Red)</p><p className="text-3xl font-bold text-red-400">{stats.immediate}</p></div>
                <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/50"><p className="text-yellow-400 text-sm">DELAYED (Yellow)</p><p className="text-3xl font-bold text-yellow-400">{stats.delayed}</p></div>
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/50"><p className="text-green-400 text-sm">MINOR (Green)</p><p className="text-3xl font-bold text-green-400">{stats.minor}</p></div>
                <div className="bg-gray-500/20 rounded-lg p-4 border border-gray-500/50"><p className="text-gray-400 text-sm">DECEASED (Black)</p><p className="text-3xl font-bold text-gray-400">{stats.deceased}</p></div>
            </div>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Triage</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Patient ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Condition</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Responder</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th></tr></thead>
                    <tbody className="divide-y divide-slate-700">
                        {cases.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-700/50">
                                <td className="px-6 py-4"><div className={`w-4 h-4 rounded-full ${getTriageColor(c.triageLevel)}`} title={c.triageLevel}></div></td>
                                <td className="px-6 py-4 text-white font-medium">{c.patientId}</td>
                                <td className="px-6 py-4 text-gray-300">{c.location}</td>
                                <td className="px-6 py-4"><p className="text-gray-300">{c.condition}</p><p className="text-gray-500 text-xs">{c.notes}</p></td>
                                <td className="px-6 py-4 text-gray-300">{c.responder}</td>
                                <td className="px-6 py-4 text-gray-400 text-sm">{c.timestamp}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
