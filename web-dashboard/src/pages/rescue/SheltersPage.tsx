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
 *
 * R3a：依 docs/architecture/DESIGN_LANGUAGE.md §7.1（列表頁 archetype）重建。
 * 全部使用語義 token（--bg-* / --surface-* / --text-* / --border-* / --color-*），
 * light / dark / tactical 三態自動生效，本檔不寫任何主題分支；狀態徽章一律用
 * design-system Badge（§3 語意對照）；空狀態用 components/shared/EmptyState；
 * 載入用 skeleton row（§7.1）。
 */
import { useState, useEffect, useCallback } from 'react';
// 保留 lucide（R5/T6 誠實清單）：Bed（床位，無 B3c 對應）
import { Bed } from 'lucide-react';
import {
    ShelterIcon,
    TeamsIcon,
    WarningIcon,
    LocationIcon,
    PlusIcon,
    SearchIcon,
    FilterIcon,
    SyncIcon,
} from '../../design-system/icons';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import { Alert, Badge, Button } from '../../design-system';
import type { BadgeProps } from '../../design-system';
import EmptyState from '../../components/shared/EmptyState';
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

// 狀態語意對照 DESIGN_LANGUAGE §3：success=安全、warning=需注意、
// info=中性進行中、default=中性非活躍。FULL（已滿）是「需注意」而非「危急」，
// 因為滿載本身不等於生命安全危急，故用 warning 而非 danger。
const STATUS_MAP: Record<string, { variant: NonNullable<BadgeProps['variant']>; label: string }> = {
    OPEN: { variant: 'success', label: '運作中' },
    STANDBY: { variant: 'info', label: '待命' },
    CLOSED: { variant: 'default', label: '已關閉' },
    INACTIVE: { variant: 'default', label: '未啟用' },
    FULL: { variant: 'warning', label: '已滿' },
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
            setError(getApiErrorMessage(err, '無法載入避難所資料'));
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
        return <Badge variant={style.variant} size="sm">{style.label}</Badge>;
    };

    const getOccupancyColor = (current: number, capacity: number) => {
        if (capacity <= 0) return 'green';
        const ratio = current / capacity;
        if (ratio >= 0.9) return 'red';
        if (ratio >= 0.7) return 'orange';
        return 'green';
    };

    return (
        <div className="page shelters-page">
            {/* page-header：h1 ＋ 主要動作（DESIGN_LANGUAGE §7.1） */}
            <header className="shelters-page__header">
                <h1 className="shelters-page__title">
                    <ShelterIcon size={24} aria-hidden="true" />
                    避難所管理
                </h1>
                <div className="shelters-page__actions">
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={fetchShelters}
                        disabled={loading}
                        icon={<SyncIcon size={16} className={loading ? 'spin' : ''} aria-hidden="true" />}
                    >
                        重新整理
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        disabled
                        title="表單建置中"
                        icon={<PlusIcon size={16} aria-hidden="true" />}
                    >
                        新增避難所
                    </Button>
                </div>
            </header>

            {error && (
                <Alert variant="danger" icon={<WarningIcon size={16} aria-hidden="true" />}>{error}</Alert>
            )}

            {/* 統計摘要列（4 個，§7.1） */}
            <div className="shelters-stats">
                <div className="shelters-stat-card">
                    <span className="shelters-stat-card__icon" aria-hidden="true">
                        <ShelterIcon size={20} aria-hidden="true" />
                    </span>
                    <div className="shelters-stat-card__content">
                        <span className="shelters-stat-card__value">{activeShelters}</span>
                        <span className="shelters-stat-card__label">運作中</span>
                    </div>
                </div>
                <div className="shelters-stat-card">
                    <span className="shelters-stat-card__icon" aria-hidden="true">
                        <TeamsIcon size={20} aria-hidden="true" />
                    </span>
                    <div className="shelters-stat-card__content">
                        <span className="shelters-stat-card__value">{totalOccupancy}</span>
                        <span className="shelters-stat-card__label">收容人數</span>
                    </div>
                </div>
                <div className="shelters-stat-card">
                    <span className="shelters-stat-card__icon" aria-hidden="true">
                        <Bed size={20} />
                    </span>
                    <div className="shelters-stat-card__content">
                        <span className="shelters-stat-card__value">{totalCapacity - totalOccupancy}</span>
                        <span className="shelters-stat-card__label">剩餘容量</span>
                    </div>
                </div>
                <div className="shelters-stat-card shelters-stat-card--warning">
                    <span className="shelters-stat-card__icon" aria-hidden="true">
                        <WarningIcon size={20} aria-hidden="true" />
                    </span>
                    <div className="shelters-stat-card__content">
                        <span className="shelters-stat-card__value">
                            {shelters.filter(s => s.status === 'FULL').length}
                        </span>
                        <span className="shelters-stat-card__label">已滿警示</span>
                    </div>
                </div>
            </div>

            {/* panel: toolbar（搜尋＋篩選，§7.1） */}
            <div className="panel shelters-toolbar">
                <div className="shelters-search">
                    <SearchIcon size={20} aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="搜尋避難所..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        aria-label="搜尋避難所"
                    />
                </div>
                <div className="shelters-filter">
                    <FilterIcon size={20} aria-hidden="true" />
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

            {/* panel: content（避難所卡片列表，§7.1） */}
            <div className="panel shelters-content">
                {loading ? (
                    <div className="shelters-skeleton" role="status" aria-label="載入避難所資料中">
                        {Array.from({ length: 4 }, (_, i) => (
                            <div key={i} className="shelters-skeleton__row" />
                        ))}
                    </div>
                ) : filteredShelters.length === 0 ? (
                    <EmptyState
                        variant={shelters.length === 0 ? 'default' : 'search'}
                        title={shelters.length === 0 ? '目前尚無避難所資料' : '沒有符合條件的避難所'}
                        description={shelters.length === 0
                            ? '尚未有任何避難所資料建立。'
                            : '請調整搜尋字詞或篩選條件後再試一次。'}
                    />
                ) : (
                    <div className="shelters-list">
                        {filteredShelters.map(shelter => (
                            <div key={shelter.id} className="shelter-card">
                                <div className="shelter-card__header">
                                    <h3 className="shelter-card__name">{shelter.name}</h3>
                                    {getStatusBadge(shelter.status)}
                                </div>

                                <div className="shelter-card__body">
                                    <div className="shelter-card__address">
                                        <LocationIcon size={16} aria-hidden="true" />
                                        <span>{shelter.address}</span>
                                    </div>

                                    <div className="shelter-occupancy">
                                        <div className="shelter-occupancy__header">
                                            <span>收容人數</span>
                                            <span className="shelter-occupancy__count">
                                                {shelter.currentOccupancy} / {shelter.capacity}
                                            </span>
                                        </div>
                                        <div className="shelter-occupancy__bar">
                                            <div
                                                className={`shelter-occupancy__fill shelter-occupancy__fill--${getOccupancyColor(shelter.currentOccupancy, shelter.capacity)}`}
                                                style={{ width: `${Math.min(shelter.occupancyRate, 100)}%` }}
                                                role="progressbar"
                                                aria-label={`收容佔用率 ${Math.round(Math.min(shelter.occupancyRate, 100))}%`}
                                                aria-valuenow={Math.min(shelter.occupancyRate, 100)}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="shelter-card__footer">
                                    <Button variant="secondary" size="sm" disabled title="功能建置中">
                                        報到入住
                                    </Button>
                                    <Button variant="primary" size="sm" disabled title="功能建置中">
                                        詳細資訊
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
