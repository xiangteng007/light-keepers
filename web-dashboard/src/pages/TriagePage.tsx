/**
 * Triage Page - E-Triage 檢傷分類頁面
 * 基於 START 檢傷法
 *
 * R3a 重建（DESIGN_LANGUAGE.md §7.3 看板頁 Board archetype）：
 * BLACK/RED/YELLOW/GREEN 四種 START 檢傷分類即看板欄位，桌機四欄橫向並列，
 * 行動端以頂部 segmented tabs 切換單欄檢視（§7.3 行動端規則）。
 * 資料層（fetchVictims/fetchStats/handleCreateVictim/handleStartTransport/
 * handleConfirmArrival）與 useParams 邏輯完全未變動。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Tag as TagIcon, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Badge, Button, Modal, InputField, type BadgeProps } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import './TriagePage.css';

// ============ Types ============

interface Victim {
    id: string;
    braceletId?: string;
    missionSessionId: string;
    triageLevel: 'BLACK' | 'RED' | 'YELLOW' | 'GREEN';
    canWalk: boolean;
    breathing: boolean;
    respiratoryRate?: number;
    hasRadialPulse: boolean;
    capillaryRefillTime?: number;
    canFollowCommands: boolean;
    description?: string;
    locationDescription?: string;
    injuries?: string;
    transportStatus: 'PENDING' | 'IN_TRANSIT' | 'ARRIVED';
    hospitalName?: string;
    createdAt: string;
}

interface TriageStats {
    total: number;
    black: number;
    red: number;
    yellow: number;
    green: number;
    pendingTransport: number;
    inTransit: number;
    arrived: number;
}

type TriageLevel = Victim['triageLevel'];

const LEVELS: TriageLevel[] = ['BLACK', 'RED', 'YELLOW', 'GREEN'];

// ============ Helpers (pure, no data-layer impact) ============

const getLevelLabel = (level: string) => {
    switch (level) {
        case 'BLACK': return '黑 (死亡)';
        case 'RED': return '紅 (危急)';
        case 'YELLOW': return '黃 (延遲)';
        case 'GREEN': return '綠 (輕傷)';
        default: return level;
    }
};

// 狀態色語意對照 DESIGN_LANGUAGE.md §3；BLACK 為 START 檢傷法標準色但無對應語意
// token（危急/警戒/安全都不合適，見 TriagePage.css 對 --text-primary 的說明），
// Badge 用最接近的中性 variant。
const getLevelBadgeVariant = (level: string): BadgeProps['variant'] => {
    switch (level) {
        case 'RED': return 'danger';
        case 'YELLOW': return 'warning';
        case 'GREEN': return 'success';
        case 'BLACK': return 'default';
        default: return 'default';
    }
};

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
};

// ============ Skeleton (§7.1 loading skeleton, ≥3 列，本地版本) ============

function TriageSkeleton() {
    return (
        <div className="triage-skeleton" role="status" aria-label="載入中">
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="triage-skeleton__column">
                    {Array.from({ length: 3 }, (_, j) => (
                        <div key={j} className="triage-skeleton__card" />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ============ Victim Card（Board 卡片：識別+檢傷等級+位置+傷勢+後送+快速操作） ============

interface VictimCardProps {
    victim: Victim;
    onSelect: (victim: Victim) => void;
    onTransport: (victimId: string) => void;
    onArrived: (victimId: string) => void;
}

function VictimCard({ victim, onSelect, onTransport, onArrived }: VictimCardProps) {
    const identifier = victim.braceletId || `#${victim.id.slice(-6)}`;
    return (
        <article
            className={`victim-card victim-card--${victim.triageLevel.toLowerCase()}`}
            onClick={() => onSelect(victim)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(victim);
            }}
        >
            <div className="victim-card__header">
                <Badge variant={getLevelBadgeVariant(victim.triageLevel)} size="sm">
                    {victim.triageLevel}
                </Badge>
                <span className="victim-card__identifier">
                    <TagIcon size={12} aria-hidden="true" /> {identifier}
                </span>
                <span className="victim-card__time">{formatTime(victim.createdAt)}</span>
            </div>

            <p className="victim-card__desc">{victim.description || '無描述'}</p>
            <p className="victim-card__location">
                <MapPin size={14} aria-hidden="true" /> {victim.locationDescription || '未知位置'}
            </p>
            {victim.injuries && <p className="victim-card__injuries">{victim.injuries}</p>}

            <div className="victim-card__footer">
                <span className={`victim-card__transport victim-card__transport--${victim.transportStatus.toLowerCase()}`}>
                    {victim.transportStatus === 'PENDING' && '待送'}
                    {victim.transportStatus === 'IN_TRANSIT' && `運送中 → ${victim.hospitalName}`}
                    {victim.transportStatus === 'ARRIVED' && '已到院'}
                </span>
                {victim.transportStatus === 'PENDING' && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); onTransport(victim.id); }}
                    >
                        開始運送
                    </Button>
                )}
                {victim.transportStatus === 'IN_TRANSIT' && (
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => { e.stopPropagation(); onArrived(victim.id); }}
                    >
                        確認到達
                    </Button>
                )}
            </div>
        </article>
    );
}

// ============ Component ============

export const TriagePage: React.FC = () => {
    const { missionSessionId } = useParams<{ missionSessionId: string }>();
    const { user } = useAuth();

    const [victims, setVictims] = useState<Victim[]>([]);
    const [stats, setStats] = useState<TriageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [selectedVictim, setSelectedVictim] = useState<Victim | null>(null);
    const [filterLevel, setFilterLevel] = useState<string>('ALL');

    // ============ Form State ============
    const [formData, setFormData] = useState({
        canWalk: false,
        breathing: true,
        respiratoryRate: undefined as number | undefined,
        hasRadialPulse: true,
        capillaryRefillTime: undefined as number | undefined,
        canFollowCommands: true,
        description: '',
        locationDescription: '',
        injuries: '',
        braceletId: '',
    });

    // ============ Data Fetching ============

    const fetchVictims = useCallback(async () => {
        if (!missionSessionId) return;
        try {
            const response = await api.get(`/triage/missions/${missionSessionId}/victims`);
            setVictims(response.data);
        } catch (error) {
            console.error('Failed to fetch victims:', error);
        }
    }, [missionSessionId]);

    const fetchStats = useCallback(async () => {
        if (!missionSessionId) return;
        try {
            const response = await api.get(`/triage/missions/${missionSessionId}/stats`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, [missionSessionId]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchVictims(), fetchStats()]);
            setLoading(false);
        };
        loadData();
    }, [fetchVictims, fetchStats]);

    // ============ Handlers ============

    const handleCreateVictim = async () => {
        if (!missionSessionId) return;
        try {
            await api.post('/triage/victims', {
                missionSessionId,
                ...formData,
                assessorId: user?.id,
                assessorName: user?.displayName || user?.email,
            });
            setShowNewForm(false);
            setFormData({
                canWalk: false,
                breathing: true,
                respiratoryRate: undefined,
                hasRadialPulse: true,
                capillaryRefillTime: undefined,
                canFollowCommands: true,
                description: '',
                locationDescription: '',
                injuries: '',
                braceletId: '',
            });
            await Promise.all([fetchVictims(), fetchStats()]);
        } catch (error) {
            console.error('Failed to create victim:', error);
        }
    };

    const handleStartTransport = async (victimId: string) => {
        const hospitalName = prompt('請輸入目的地醫院名稱:');
        if (!hospitalName) return;

        try {
            await api.post(`/triage/victims/${victimId}/transport`, {
                hospitalId: 'manual',
                hospitalName,
            });
            await fetchVictims();
        } catch (error) {
            console.error('Failed to start transport:', error);
        }
    };

    const handleConfirmArrival = async (victimId: string) => {
        try {
            await api.post(`/triage/victims/${victimId}/arrived`);
            await fetchVictims();
        } catch (error) {
            console.error('Failed to confirm arrival:', error);
        }
    };

    // ============ Filtering (mobile 單欄檢視用；桌機四欄各自過濾) ============

    const mobileVisibleLevels: TriageLevel[] = filterLevel === 'ALL'
        ? LEVELS
        : [filterLevel as TriageLevel];

    // ============ Render ============

    if (loading) {
        return (
            <div className="triage-page">
                <header className="triage-header">
                    <h1>E-Triage 檢傷分類</h1>
                    <Button variant="primary" icon={<Plus size={16} />} disabled>
                        新增傷患
                    </Button>
                </header>
                <TriageSkeleton />
            </div>
        );
    }

    return (
        <div className="triage-page">
            <header className="triage-header">
                <h1>E-Triage 檢傷分類</h1>
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowNewForm(true)}>
                    新增傷患
                </Button>
            </header>

            {/* Stats Panel */}
            {stats && (
                <div className="stats-panel">
                    <div className="stat-card stat-card--total">
                        <span className="label">總人數</span>
                        <span className="value">{stats.total}</span>
                    </div>
                    <div className="stat-card stat-card--black">
                        <span className="label">黑</span>
                        <span className="value">{stats.black}</span>
                    </div>
                    <div className="stat-card stat-card--red">
                        <span className="label">紅</span>
                        <span className="value">{stats.red}</span>
                    </div>
                    <div className="stat-card stat-card--yellow">
                        <span className="label">黃</span>
                        <span className="value">{stats.yellow}</span>
                    </div>
                    <div className="stat-card stat-card--green">
                        <span className="label">綠</span>
                        <span className="value">{stats.green}</span>
                    </div>
                    <div className="stat-card stat-card--transport">
                        <span className="label">待送</span>
                        <span className="value">{stats.pendingTransport}</span>
                    </div>
                </div>
            )}

            {/* 行動端 segmented tabs（§7.3 行動端規則：欄切換用頂部 tabs，不做水平多欄） */}
            <div className="board-tabs" role="tablist" aria-label="檢傷分類篩選">
                {['ALL', ...LEVELS].map(level => (
                    <button
                        key={level}
                        role="tab"
                        aria-selected={filterLevel === level}
                        className={`board-tab board-tab--${level.toLowerCase()} ${filterLevel === level ? 'is-active' : ''}`}
                        onClick={() => setFilterLevel(level)}
                    >
                        {level === 'ALL' ? '全部' : getLevelLabel(level)}
                    </button>
                ))}
            </div>

            {/* 看板欄位：桌機四欄橫向並列；行動端只顯示 mobileVisibleLevels 內的欄 */}
            <div className="board-columns">
                {LEVELS.map(level => {
                    const levelVictims = victims.filter(v => v.triageLevel === level);
                    const isMobileVisible = mobileVisibleLevels.includes(level);
                    return (
                        <section
                            key={level}
                            className={`board-column board-column--${level.toLowerCase()} ${isMobileVisible ? 'is-active' : ''}`}
                            aria-label={getLevelLabel(level)}
                        >
                            <header className="board-column__header">
                                <span className={`board-column__dot board-column__dot--${level.toLowerCase()}`} aria-hidden="true" />
                                <h2 className="board-column__title">{getLevelLabel(level)}</h2>
                                <Badge variant={getLevelBadgeVariant(level)} size="sm">{levelVictims.length}</Badge>
                            </header>
                            <div className="board-column__body">
                                {levelVictims.length === 0 ? (
                                    <EmptyState variant="minimal" title="此分類目前無傷患" />
                                ) : (
                                    levelVictims.map(victim => (
                                        <VictimCard
                                            key={victim.id}
                                            victim={victim}
                                            onSelect={setSelectedVictim}
                                            onTransport={handleStartTransport}
                                            onArrived={handleConfirmArrival}
                                        />
                                    ))
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>

            {victims.length === 0 && (
                <EmptyState
                    title="尚無傷患紀錄"
                    description="點擊右上角「新增傷患」開始 START 檢傷評估"
                    variant="default"
                />
            )}

            {/* New Victim Modal（§4：必須中斷目前工作的決策流程 → design-system Modal） */}
            <Modal
                isOpen={showNewForm}
                onClose={() => setShowNewForm(false)}
                title="START 檢傷評估"
                size="md"
                footer={(
                    <>
                        <Button variant="secondary" onClick={() => setShowNewForm(false)}>取消</Button>
                        <Button variant="primary" onClick={handleCreateVictim}>儲存</Button>
                    </>
                )}
            >
                <div className="start-flow">
                    <div className="question">
                        <label>1. 傷患能行走嗎？</label>
                        <div className="btn-group">
                            <button
                                type="button"
                                className={formData.canWalk ? 'active yes' : ''}
                                onClick={() => setFormData({ ...formData, canWalk: true })}
                            >是 → 綠色</button>
                            <button
                                type="button"
                                className={!formData.canWalk ? 'active no' : ''}
                                onClick={() => setFormData({ ...formData, canWalk: false })}
                            >否</button>
                        </div>
                    </div>

                    {!formData.canWalk && (
                        <>
                            <div className="question">
                                <label>2. 傷患有呼吸嗎？</label>
                                <div className="btn-group">
                                    <button
                                        type="button"
                                        className={formData.breathing ? 'active yes' : ''}
                                        onClick={() => setFormData({ ...formData, breathing: true })}
                                    >有</button>
                                    <button
                                        type="button"
                                        className={!formData.breathing ? 'active no' : ''}
                                        onClick={() => setFormData({ ...formData, breathing: false })}
                                    >無 → 黑色</button>
                                </div>
                            </div>

                            {formData.breathing && (
                                <>
                                    <div className="question">
                                        <label>3. 呼吸頻率 (次/分鐘)</label>
                                        <input
                                            type="number"
                                            value={formData.respiratoryRate || ''}
                                            onChange={e => setFormData({ ...formData, respiratoryRate: parseInt(e.target.value) || undefined })}
                                            placeholder="10-30 正常"
                                        />
                                        <span className="hint">&gt;30 或 &lt;10 → 紅色</span>
                                    </div>

                                    <div className="question">
                                        <label>4. 橈動脈可觸及？</label>
                                        <div className="btn-group">
                                            <button
                                                type="button"
                                                className={formData.hasRadialPulse ? 'active yes' : ''}
                                                onClick={() => setFormData({ ...formData, hasRadialPulse: true })}
                                            >有</button>
                                            <button
                                                type="button"
                                                className={!formData.hasRadialPulse ? 'active no' : ''}
                                                onClick={() => setFormData({ ...formData, hasRadialPulse: false })}
                                            >無 → 紅色</button>
                                        </div>
                                    </div>

                                    <div className="question">
                                        <label>5. 能遵從簡單指令？</label>
                                        <div className="btn-group">
                                            <button
                                                type="button"
                                                className={formData.canFollowCommands ? 'active yes' : ''}
                                                onClick={() => setFormData({ ...formData, canFollowCommands: true })}
                                            >能 → 黃色</button>
                                            <button
                                                type="button"
                                                className={!formData.canFollowCommands ? 'active no' : ''}
                                                onClick={() => setFormData({ ...formData, canFollowCommands: false })}
                                            >不能 → 紅色</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className="form-section">
                    <InputField
                        label="傷患描述 (年齡/性別/特徵)"
                        type="text"
                        fullWidth
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="例: 約50歲男性，穿藍色外套"
                    />
                </div>

                <div className="form-section">
                    <InputField
                        label="發現位置"
                        type="text"
                        fullWidth
                        value={formData.locationDescription}
                        onChange={e => setFormData({ ...formData, locationDescription: e.target.value })}
                        placeholder="例: A 大樓 3 樓走廊"
                    />
                </div>

                <div className="form-section">
                    <label>傷勢描述</label>
                    <textarea
                        value={formData.injuries}
                        onChange={e => setFormData({ ...formData, injuries: e.target.value })}
                        placeholder="例: 右腿骨折，頭部輕微擦傷"
                    />
                </div>

                <div className="form-section">
                    <InputField
                        label="手環 ID (選填)"
                        type="text"
                        fullWidth
                        value={formData.braceletId}
                        onChange={e => setFormData({ ...formData, braceletId: e.target.value })}
                        placeholder="NFC/QR 掃描"
                    />
                </div>
            </Modal>

            {/* Victim Detail（點卡片開啟，僅檢視，避免另建第二份 modal 樣式） */}
            <Modal
                isOpen={!!selectedVictim}
                onClose={() => setSelectedVictim(null)}
                title={selectedVictim ? `傷患詳情 · ${selectedVictim.braceletId || selectedVictim.id.slice(-6)}` : undefined}
                size="sm"
                footer={<Button variant="secondary" onClick={() => setSelectedVictim(null)}>關閉</Button>}
            >
                {selectedVictim && (
                    <div className="victim-detail">
                        <p><strong>檢傷等級：</strong>{getLevelLabel(selectedVictim.triageLevel)}</p>
                        <p><strong>描述：</strong>{selectedVictim.description || '無描述'}</p>
                        <p><strong>位置：</strong>{selectedVictim.locationDescription || '未知位置'}</p>
                        <p><strong>傷勢：</strong>{selectedVictim.injuries || '無記錄'}</p>
                        <p><strong>後送狀態：</strong>
                            {selectedVictim.transportStatus === 'PENDING' && '待送'}
                            {selectedVictim.transportStatus === 'IN_TRANSIT' && `運送中 → ${selectedVictim.hospitalName}`}
                            {selectedVictim.transportStatus === 'ARRIVED' && '已到院'}
                        </p>
                        <p><strong>建立時間：</strong>{formatTime(selectedVictim.createdAt)}</p>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TriagePage;
