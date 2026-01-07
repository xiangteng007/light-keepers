import { useState, useEffect } from 'react';

interface Resource { id: string; name: string; category: string; quantity: number; unit: string; location: string; status: 'available' | 'low' | 'critical'; lastUpdated: string; }

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        setResources([
            { id: '1', name: 'Drinking Water', category: 'Water', quantity: 5000, unit: 'bottles', location: 'Warehouse A', status: 'available', lastUpdated: '2h ago' },
            { id: '2', name: 'Emergency Food Kits', category: 'Food', quantity: 350, unit: 'kits', location: 'Warehouse A', status: 'available', lastUpdated: '4h ago' },
            { id: '3', name: 'First Aid Kits', category: 'Medical', quantity: 45, unit: 'kits', location: 'Warehouse B', status: 'low', lastUpdated: '1h ago' },
            { id: '4', name: 'Blankets', category: 'Shelter', quantity: 800, unit: 'pcs', location: 'Warehouse A', status: 'available', lastUpdated: '6h ago' },
            { id: '5', name: 'Flashlights', category: 'Equipment', quantity: 12, unit: 'pcs', location: 'Warehouse C', status: 'critical', lastUpdated: '30m ago' },
        ]);
        setLoading(false);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) { case 'available': return 'bg-green-500'; case 'low': return 'bg-yellow-500'; case 'critical': return 'bg-red-500'; default: return 'bg-gray-500'; }
    };

    const categories = ['all', ...new Set(resources.map(r => r.category))];
    const filteredResources = filter === 'all' ? resources : resources.filter(r => r.category === filter);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Resource Management</h1><p className="text-gray-400">Track and manage disaster relief supplies</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">+ Add Resource</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Total Items</p><p className="text-2xl font-bold text-white">{resources.length}</p></div>
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/50"><p className="text-green-400 text-sm">Available</p><p className="text-2xl font-bold text-green-400">{resources.filter(r => r.status === 'available').length}</p></div>
                <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/50"><p className="text-yellow-400 text-sm">Low Stock</p><p className="text-2xl font-bold text-yellow-400">{resources.filter(r => r.status === 'low').length}</p></div>
                <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/50"><p className="text-red-400 text-sm">Critical</p><p className="text-2xl font-bold text-red-400">{resources.filter(r => r.status === 'critical').length}</p></div>
            </div>
            <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                    <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-lg capitalize ${filter === cat ? 'bg-amber-500 text-black' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}>
                        {cat}
                    </button>
                ))}
            </div>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Resource</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Quantity</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredResources.map((resource) => (
                            <tr key={resource.id} className="hover:bg-slate-700/50">
                                <td className="px-6 py-4"><p className="text-white font-medium">{resource.name}</p><p className="text-gray-400 text-xs">Updated {resource.lastUpdated}</p></td>
                                <td className="px-6 py-4 text-gray-300">{resource.category}</td>
                                <td className="px-6 py-4 text-white font-medium">{resource.quantity.toLocaleString()} {resource.unit}</td>
                                <td className="px-6 py-4 text-gray-300">{resource.location}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs text-white capitalize ${getStatusColor(resource.status)}`}>{resource.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
