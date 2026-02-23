import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';

interface Equipment {
    id: string;
    name: string;
    category: string;
    serialNumber: string;
    qrCode?: string;
    status: string;
    batteryLevel?: number;
    currentHolderName?: string;
    assignedTaskId?: string;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    updatedAt: string;
}

interface EquipmentStats {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    lowBattery: number;
    maintenanceDue: number;
}

export default function EquipmentPage() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [stats, setStats] = useState<EquipmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [eqRes, statsRes] = await Promise.all([
                api.get('/equipment'),
                api.get('/equipment/stats'),
            ]);
            setEquipment(eqRes.data || []);
            setStats(statsRes.data || null);
        } catch (err: any) {
            console.error('Failed to fetch equipment:', err);
            setError(err.response?.data?.message || err.message || '無法載入設備資料');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-green-500';
            case 'IN_USE': return 'bg-blue-500';
            case 'MAINTENANCE': return 'bg-yellow-500';
            case 'CHARGING': return 'bg-cyan-500';
            case 'DAMAGED': return 'bg-red-500';
            case 'RETIRED': return 'bg-gray-600';
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return '可用';
            case 'IN_USE': return '使用中';
            case 'MAINTENANCE': return '維護中';
            case 'CHARGING': return '充電中';
            case 'DAMAGED': return '損壞';
            case 'RETIRED': return '報廢';
            default: return status;
        }
    };

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            RADIO: '無線電', GPS: 'GPS', TABLET: '平板',
            DRONE: '無人機', FIRST_AID: '急救包',
            LIGHT: '照明', POWER_BANK: '行動電源', OTHER: '其他',
        };
        return labels[cat] || cat;
    };

    const filteredEquipment = statusFilter === 'all'
        ? equipment
        : equipment.filter(e => e.status === statusFilter);

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
                    <h1 className="text-2xl font-bold text-white">設備追蹤</h1>
                    <p className="text-gray-400">管理與追蹤裝備資產</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600"
                >
                    ↻ 重新整理
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-gray-400 text-xs">總數</p>
                    <p className="text-xl font-bold text-white">{stats?.total ?? equipment.length}</p>
                </div>
                <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/50">
                    <p className="text-green-400 text-xs">可用</p>
                    <p className="text-xl font-bold text-green-400">{stats?.available ?? 0}</p>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/50">
                    <p className="text-blue-400 text-xs">使用中</p>
                    <p className="text-xl font-bold text-blue-400">{stats?.inUse ?? 0}</p>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/50">
                    <p className="text-yellow-400 text-xs">維護中</p>
                    <p className="text-xl font-bold text-yellow-400">{stats?.maintenance ?? 0}</p>
                </div>
                <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-500/50">
                    <p className="text-orange-400 text-xs">低電量</p>
                    <p className="text-xl font-bold text-orange-400">{stats?.lowBattery ?? 0}</p>
                </div>
                <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/50">
                    <p className="text-red-400 text-xs">需維護</p>
                    <p className="text-xl font-bold text-red-400">{stats?.maintenanceDue ?? 0}</p>
                </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'CHARGING', 'DAMAGED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                        }`}
                    >
                        {s === 'all' ? '全部' : getStatusLabel(s)}
                    </button>
                ))}
            </div>

            {/* Equipment Cards */}
            {filteredEquipment.length === 0 ? (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8 text-center text-gray-400">
                    {statusFilter === 'all' ? '尚無設備資料' : `此狀態暫無設備`}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredEquipment.map((eq) => (
                        <div key={eq.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 hover:border-amber-500/50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(eq.status)}`}>
                                    {getStatusLabel(eq.status)}
                                </span>
                                <span className="text-gray-400 text-xs font-mono">{eq.serialNumber}</span>
                            </div>
                            <h3 className="text-white font-medium mb-1">{eq.name}</h3>
                            <p className="text-gray-400 text-sm mb-3">{getCategoryLabel(eq.category)}</p>
                            <div className="text-sm space-y-1">
                                <p className="text-gray-400">
                                    持有者: <span className="text-white">{eq.currentHolderName || '無'}</span>
                                </p>
                                {eq.assignedTaskId && (
                                    <p className="text-gray-400">
                                        任務: <span className="text-amber-400 text-xs">{eq.assignedTaskId.slice(0, 8)}…</span>
                                    </p>
                                )}
                                {eq.batteryLevel !== undefined && eq.batteryLevel !== null && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">電量:</span>
                                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${eq.batteryLevel > 50 ? 'bg-green-500' : eq.batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${eq.batteryLevel}%` }}
                                            />
                                        </div>
                                        <span className="text-white text-xs">{eq.batteryLevel}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
