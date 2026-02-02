/**
 * SheltersPage.tsx
 * 
 * Expert Council Navigation Design v3.0
 * 避難所管理頁面 - Rescue Operations Group
 * Per expert_council_navigation_design.md §2.2
 */
import { useState } from 'react';
import {
    Building,
    Users,
    Bed,
    AlertTriangle,
    MapPin,
    Phone,
    Clock,
    Plus,
    Search,
    Filter
} from 'lucide-react';
import './SheltersPage.css';

interface Shelter {
    id: string;
    name: string;
    address: string;
    capacity: number;
    currentOccupancy: number;
    status: 'active' | 'standby' | 'closed' | 'full';
    contact: string;
    phone: string;
    lastUpdated: Date;
    facilities: string[];
}

const MOCK_SHELTERS: Shelter[] = [
    {
        id: 'SH001',
        name: '信義區活動中心',
        address: '台北市信義區松仁路100號',
        capacity: 200,
        currentOccupancy: 156,
        status: 'active',
        contact: '陳主任',
        phone: '02-2728-1234',
        lastUpdated: new Date(),
        facilities: ['醫療站', '兒童區', '寵物區', 'WiFi'],
    },
    {
        id: 'SH002',
        name: '大安國小',
        address: '台北市大安區和平東路200號',
        capacity: 300,
        currentOccupancy: 89,
        status: 'active',
        contact: '李校長',
        phone: '02-2755-5678',
        lastUpdated: new Date(),
        facilities: ['醫療站', '兒童區'],
    },
    {
        id: 'SH003',
        name: '中正紀念堂',
        address: '台北市中正區中山南路21號',
        capacity: 500,
        currentOccupancy: 0,
        status: 'standby',
        contact: '王管理員',
        phone: '02-2343-1234',
        lastUpdated: new Date(),
        facilities: ['大型場地', '停車場'],
    },
];

export default function SheltersPage() {
    const [shelters] = useState<Shelter[]>(MOCK_SHELTERS);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filteredShelters = shelters.filter(shelter => {
        const matchesSearch = shelter.name.includes(searchTerm) ||
            shelter.address.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || shelter.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
    const activeShelters = shelters.filter(s => s.status === 'active').length;

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; label: string }> = {
            active: { bg: 'bg-green', text: 'text-green', label: '運作中' },
            standby: { bg: 'bg-blue', text: 'text-blue', label: '待命' },
            closed: { bg: 'bg-gray', text: 'text-gray', label: '已關閉' },
            full: { bg: 'bg-orange', text: 'text-orange', label: '已滿' },
        };
        const style = styles[status] || styles.closed;
        return <span className={`shelter-status ${style.bg}`}>{style.label}</span>;
    };

    const getOccupancyColor = (current: number, capacity: number) => {
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
                <button className="shelters-add-btn">
                    <Plus size={18} />
                    新增避難所
                </button>
            </header>

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
                        <span className="stat-value">{shelters.filter(s => s.status === 'full').length}</span>
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
                        <option value="active">運作中</option>
                        <option value="standby">待命</option>
                        <option value="full">已滿</option>
                        <option value="closed">已關閉</option>
                    </select>
                </div>
            </div>

            {/* Shelter List */}
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
                            <div className="shelter-info-row">
                                <Phone size={14} />
                                <span>{shelter.contact} - {shelter.phone}</span>
                            </div>
                            <div className="shelter-info-row">
                                <Clock size={14} />
                                <span>更新於 {shelter.lastUpdated.toLocaleTimeString('zh-TW')}</span>
                            </div>

                            <div className="shelter-occupancy">
                                <div className="occupancy-header">
                                    <span>收容人數</span>
                                    <span>{shelter.currentOccupancy} / {shelter.capacity}</span>
                                </div>
                                <div className="occupancy-bar">
                                    <div
                                        className={`occupancy-fill ${getOccupancyColor(shelter.currentOccupancy, shelter.capacity)}`}
                                        style={{ width: `${(shelter.currentOccupancy / shelter.capacity) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="shelter-facilities">
                                {shelter.facilities.map(f => (
                                    <span key={f} className="facility-tag">{f}</span>
                                ))}
                            </div>
                        </div>

                        <div className="shelter-card-footer">
                            <button className="btn-secondary">報到入住</button>
                            <button className="btn-primary">詳細資訊</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
