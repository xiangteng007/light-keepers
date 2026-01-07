import { useState, useEffect } from 'react';

interface Report { id: string; name: string; type: 'mission' | 'resource' | 'volunteer' | 'analytics'; generatedAt: string; status: 'ready' | 'generating' | 'failed'; size: string; }

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setReports([
            { id: '1', name: 'Monthly Mission Summary - December 2024', type: 'mission', generatedAt: '2024-12-08 14:30', status: 'ready', size: '2.4 MB' },
            { id: '2', name: 'Resource Inventory Report Q4', type: 'resource', generatedAt: '2024-12-07 09:15', status: 'ready', size: '1.8 MB' },
            { id: '3', name: 'Volunteer Performance Analysis', type: 'volunteer', generatedAt: '2024-12-06 16:45', status: 'ready', size: '3.2 MB' },
            { id: '4', name: 'Weekly Analytics Dashboard', type: 'analytics', generatedAt: '2024-12-08 08:00', status: 'generating', size: '-' },
        ]);
        setLoading(false);
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) { case 'mission': return 'bg-red-500/20 text-red-400'; case 'resource': return 'bg-blue-500/20 text-blue-400'; case 'volunteer': return 'bg-green-500/20 text-green-400'; case 'analytics': return 'bg-purple-500/20 text-purple-400'; default: return 'bg-gray-500/20 text-gray-400'; }
    };

    const getStatusBadge = (status: string) => {
        switch (status) { case 'ready': return 'bg-green-500'; case 'generating': return 'bg-yellow-500 animate-pulse'; case 'failed': return 'bg-red-500'; default: return 'bg-gray-500'; }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Reports Center</h1><p className="text-gray-400">Generate and download reports</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">+ Generate Report</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['mission', 'resource', 'volunteer', 'analytics'].map((type) => (
                    <div key={type} className={`rounded-lg p-4 border ${getTypeColor(type).replace('text-', 'border-').replace('/20', '/50')}`}>
                        <p className={`text-sm capitalize ${getTypeColor(type).split(' ')[1]}`}>{type} Reports</p>
                        <p className="text-2xl font-bold text-white">{reports.filter(r => r.type === type).length}</p>
                    </div>
                ))}
            </div>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Report Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Generated</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Size</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {reports.map((report) => (
                            <tr key={report.id} className="hover:bg-slate-700/50">
                                <td className="px-6 py-4 text-white font-medium">{report.name}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs capitalize ${getTypeColor(report.type)}`}>{report.type}</span></td>
                                <td className="px-6 py-4 text-gray-300">{report.generatedAt}</td>
                                <td className="px-6 py-4 text-gray-300">{report.size}</td>
                                <td className="px-6 py-4"><span className={`w-2 h-2 rounded-full inline-block ${getStatusBadge(report.status)}`}></span><span className="ml-2 text-gray-300 capitalize">{report.status}</span></td>
                                <td className="px-6 py-4">
                                    {report.status === 'ready' ? (
                                        <button className="text-amber-400 hover:text-amber-300 text-sm">Download</button>
                                    ) : (
                                        <span className="text-gray-500 text-sm">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
