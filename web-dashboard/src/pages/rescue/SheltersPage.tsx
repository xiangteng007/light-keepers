/**
 * SheltersPage.tsx
 *
 * Expert Council Navigation Design v3.0
 * 避難所管理頁面 - Rescue Operations Group
 * Per expert_council_navigation_design.md §2.2
 *
 * FE-4/3.3: 接上真實 API（backend/src/modules/shelters/shelters.controller.ts，GET /shelters）。
 * 後端 ShelterResponseDto 只回傳 id/name/type/address/capacity/currentOccupancy/status/
 * occupancyRate，沒有聯絡人/電話/設施清單/更新時間欄位，故這些欄位在 UI 上省略而非造假資料。
 * 「新增避難所」「報到入住」「詳細資訊」按鈕暫未接動作（後端有對應端點 POST /shelters、
 * POST /shelters/:id/check-in 等，但屬於獨立表單/詳情頁工作，非本次範圍，維持既有按鈕但先不掛動作）。
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Building,
    Users,
    Bed,
    AlertTriangle,
    MapPin,
    Plus,
    Search,
    Filter,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import api from '../../utils/api';
import { Alert } from '../../design-system';
import './SheltersPage.css';

interface Shelter {
    id: string;
    name: string;
    type: string;
    address: string;
    capacity: number;
    currentOccupancy: number;
    status: string;
    occupancyRate: number;
}

const STATUS_MAP: Record<string, { className: string; label: string }> = {
    OPEN: { className: 'bg-green', label: '運作中' },
    STANDBY: { className: 'bg-blue', label: '待命' },
    CLOSED: { className: 'bg-gray', label: '已關閉' },
    INACTIVE: { className: 'bg-gray', label: '未啟用' },
    FULL: { className: 'bg-orange', label: '已滿' },
};

export default function SheltersPage() {
    const [shelters, setShelters] = useState<Shelter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchShelters = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/shelters');
            const data = res.data;
            setShelters(Array.isArray(data) ? data : (data?.data || []));
        } catch (err: any) {
            console.error('Failed to fetch shelters:', err);
            setError(err?.response?.data?.message || '無法載入避難所資料');
            setShelters([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShelters();
    }, [fetchShelters]);

    const filteredShelters = shelters.filter(shelter => {
        const matchesSearch = shelter.name.includes(searchTerm) ||
            shelter.address.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || shelter.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
    const activeShelters = shelters.filter(s => s.status === 'OPEN').length;

    const getStatusBadge = (status: string) => {
        const style = STATUS_MAP[status] || STATUS_MAP.CLOSED;
        return <span className={`shelter-status ${style.className}`}>{style.label}</span>;
    };

    const getOccupancyColor = (current: number, capacity: number) => {
        if (capacity <= 0) return 'green';
        const ratio = current / capacity;
        if (ratio >= 0.9) return 'red';
        if (ratio >= 0.7) return 'orange';
        return 'green';
    };

    return (
        <div className="shelters-page">
            {/* Header */}
            <header className="shelters-header">
                <div className="shelters-title">
                    <Building size={28} />
                    <h1>避難所管理</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="shelters-add-btn"
                        onClick={fetchShelters}
                        disabled={loading}
                        style={{ background: 'transparent' }}
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        重新整理
                    </button>
                    <button className="shelters-add-btn" disabled title="表單建置中">
                        <Plus size={18} />
                        新增避難所
                    </button>
                </div>
            </header>

            {error && (
                <Alert variant="danger" icon={<AlertTriangle size={16} />}>{error}</Alert>
            )}

            {/* Stats Cards */}
            <div className="shelters-stats">
                <div className="stat-card">
                    <Building className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">{activeShelters}</span>
                        <span className="stat-label">運作中</span>
                    </div>
                </div>
                <div className="stat-card">
                    <Users className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">{totalOccupancy}</span>
                        <span className="stat-label">收容人數</span>
                    </div>
                </div>
                <div className="stat-card">
                    <Bed className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">{totalCapacity - totalOccupancy}</span>
                        <span className="stat-label">剩餘容量</span>
                    </div>
                </div>
                <div className="stat-card">
                    <AlertTriangle className="stat-icon warning" />
                    <div className="stat-content">
                        <span className="stat-value">{shelters.filter(s => s.status === 'FULL').length}</span>
                        <span className="stat-label">已滿警示</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="shelters-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="搜尋避難所..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-box">
                    <Filter size={18} />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        aria-label="篩選避難所狀態"
                        title="篩選狀態"
                    >
                        <option value="all">全部狀態</option>
                        <option value="OPEN">運作中</option>
                        <option value="STANDBY">待命</option>
                        <option value="FULL">已滿</option>
                        <option value="CLOSED">已關閉</option>
                    </select>
                </div>
            </div>

            {/* Shelter List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '0.5rem' }}>
                    <Loader2 size={24} className="spin" />
                    <span>載入避難所資料中...</span>
                </div>
            ) : filteredShelters.length === 0 ? (
                <div className="shelters-empty" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                    {shelters.length === 0 ? '目前尚無避難所資料' : '沒有符合條件的避難所'}
                </div>
            ) : (
                <div className="shelters-list">
                    {filteredShelters.map(shelter => (
                        <div key={shelter.id} className="shelter-card">
                            <div className="shelter-card-header">
                                <h3>{shelter.name}</h3>
                                {getStatusBadge(shelter.status)}
                            </div>

                            <div className="shelter-card-body">
                                <div className="shelter-info-row">
                                    <MapPin size={14} />
                                    <span>{shelter.address}</span>
                                </div>

                                <div className="shelter-occupancy">
                                    <div className="occupancy-header">
                                        <span>收容人數</span>
                                        <span>{shelter.currentOccupancy} / {shelter.capacity}</span>
                                    </div>
                                    <div className="occupancy-bar">
                                        <div
                                            className={`occupancy-fill ${getOccupancyColor(shelter.currentOccupancy, shelter.capacity)}`}
                                            style={{ width: `${Math.min(shelter.occupancyRate, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="shelter-card-footer">
                                <button className="btn-secondary" disabled title="功能建置中">報到入住</button>
                                <button className="btn-primary" disabled title="功能建置中">詳細資訊</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
