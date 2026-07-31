import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api'; // eslint-disable-line no-restricted-imports -- FE-4 遷移待辦（工作項 3.2）：改用 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md

interface Resource {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    location: string;
    status: 'available' | 'low' | 'depleted';
    minQuantity: number;
    expiresAt?: string;
    updatedAt: string;
}

interface ResourceStats {
    total: number;
    byCategory: Record<string, number>;
    lowStock: number;
    expiringSoon: number;
}

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [stats, setStats] = useState<ResourceStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [resRes, statsRes] = await Promise.all([
                api.get('/resources'),
                api.get('/resources/stats'),
            ]);
            setResources(resRes.data?.data || []);
            setStats(statsRes.data?.data || null);
        } catch (err: any) {
            console.error('Failed to fetch resources:', err);
            setError(err.response?.data?.message || err.message || '無法載入物資資料');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-500';
            case 'low': return 'bg-yellow-500';
            case 'depleted': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'available': return '充足';
            case 'low': return '偏低';
            case 'depleted': return '耗盡';
            default: return status;
        }
    };

    const categories = ['all', ...new Set(resources.map(r => r.category))];
    const filteredResources = filter === 'all' ? resources : resources.filter(r => r.category === filter);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffH = Math.floor(diffMs / 3600000);
        if (diffH < 1) return `${Math.floor(diffMs / 60000)}m ago`;
        if (diffH < 24) return `${diffH}h ago`;
        return d.toLocaleDateString('zh-TW');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                    <p className="font-medium">載入失敗</p>
                    <p className="text-sm mt-1">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                        重試
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">物資管理</h1>
                    <p className="text-gray-400">追蹤與管理災害救援物資</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 mr-2"
                >
                    ↻ 重新整理
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-gray-400 text-sm">物資品項</p>
                    <p className="text-2xl font-bold text-white">{stats?.total ?? resources.length}</p>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/50">
                    <p className="text-green-400 text-sm">充足</p>
                    <p className="text-2xl font-bold text-green-400">
                        {resources.filter(r => r.status === 'available').length}
                    </p>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/50">
                    <p className="text-yellow-400 text-sm">偏低</p>
                    <p className="text-2xl font-bold text-yellow-400">
                        {stats?.lowStock ?? resources.filter(r => r.status === 'low').length}
                    </p>
                </div>
                <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/50">
                    <p className="text-red-400 text-sm">即將到期</p>
                    <p className="text-2xl font-bold text-red-400">
                        {stats?.expiringSoon ?? 0}
                    </p>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 rounded-lg capitalize ${filter === cat
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                        }`}
                    >
                        {cat === 'all' ? '全部' : cat}
                        {cat !== 'all' && stats?.byCategory?.[cat] ? ` (${stats.byCategory[cat]})` : ''}
                    </button>
                ))}
            </div>

            {/* Resources Table */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">物資名稱</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">分類</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">數量</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">存放位置</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">狀態</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredResources.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                    {filter === 'all' ? '尚無物資資料' : `此分類暫無物資`}
                                </td>
                            </tr>
                        ) : (
                            filteredResources.map((resource) => (
                                <tr key={resource.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4">
                                        <p className="text-white font-medium">{resource.name}</p>
                                        <p className="text-gray-400 text-xs">更新於 {formatDate(resource.updatedAt)}</p>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">{resource.category}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-white font-medium">
                                            {resource.quantity.toLocaleString()}
                                        </span>
                                        <span className="text-gray-400 ml-1">{resource.unit || '個'}</span>
                                        {resource.minQuantity > 0 && (
                                            <span className="text-gray-500 text-xs ml-2">
                                                (安全量: {resource.minQuantity})
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">{resource.location || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(resource.status)}`}>
                                            {getStatusLabel(resource.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
