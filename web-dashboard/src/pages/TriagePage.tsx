/**
 * Triage Page - E-Triage 檢傷分類頁面
 * 基於 START 檢傷法
 *
 * R5/T2 戰術化重排（owner 核准構圖：public/design-mockups/r5-b3c-deep.html §c6）：
 * 頂部事件條（stencil kicker＋mono 現地時鐘）→ 紅黃綠黑合計讀數帶（分級色章＋mono
 * 數字）→ 四欄 START 看板（IMMEDIATE 紅／DELAYED 黃／MINOR 綠／EXPECTANT 黑）→
 * 後送讀數帶。傷票卡＝mono 票號＋4px 左緣分級色閂＋stencil 分級小標＋生命徵象
 * mono 讀數（RR／P／CRT，來自既有 Victim 欄位）。
 *
 * 資料層（fetchVictims/fetchStats/handleCreateVictim/handleStartTransport/
 * handleConfirmArrival）與 useParams 邏輯完全未變動；紅色僅用於 IMMEDIATE 生命
 * 分級（DESIGN_LANGUAGE v2 §D 紅色憲法允許）。c6 構圖中的 MCI 名稱／開設時間／
 * 經過時間／EVAC 序號在現況資料模型沒有對應欄位，一律不顯示、不造假；計時槽
 * 改放「現地時鐘＋最後更新時刻」（皆為真實資料）。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import {
    triageStampRegistry,
    OutlineSquareStamp,
    SolidSquareStamp,
    CheckStamp,
} from '../design-system/icons/pictograms';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Button, Modal, InputField } from '../design-system';
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

// c6 看板欄序：IMMEDIATE 紅 → DELAYED 黃 → MINOR 綠 → EXPECTANT 黑
const LEVELS: TriageLevel[] = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

// START 分級（stencil 拉丁代號＋中文標籤；語意見 DESIGN_LANGUAGE v2 §D）
const LEVEL_META: Record<TriageLevel, { code: string; zh: string }> = {
    RED: { code: 'IMMEDIATE', zh: '立即 · 紅' },
    YELLOW: { code: 'DELAYED', zh: '延遲 · 黃' },
    GREEN: { code: 'MINOR', zh: '輕傷 · 綠' },
    BLACK: { code: 'EXPECTANT', zh: '瀕危 · 黑' },
};

// ============ Helpers (pure, no data-layer impact) ============

const getLevelLabel = (level: string) =>
    (LEVEL_META as Record<string, { code: string; zh: string } | undefined>)[level]?.zh ?? level;

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
};

const formatClock = (d: Date) =>
    d.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

const pad2 = (n: number) => String(n).padStart(2, '0');

// 分級章（R5/T5：triageStampRegistry 章元件——形狀雙編碼：紅＝■ 實心、黃＝◧ 半填、
// 綠＝□ 描邊、黑＝方框帶 ×。章只畫形，色仍由 triage-sq--* 分級 class 控制）
function LevelSquare({ level }: { level: TriageLevel }) {
    const Stamp = triageStampRegistry[level];
    return (
        <i className={`triage-sq triage-sq--${level.toLowerCase()}`} aria-hidden="true">
            <Stamp size={14} />
        </i>
    );
}

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

// ============ Victim Card（c6 傷票卡：mono 票號＋左緣色閂＋stencil 小標＋vitals） ============

interface VictimCardProps {
    victim: Victim;
    onSelect: (victim: Victim) => void;
    onTransport: (victimId: string) => void;
    onArrived: (victimId: string) => void;
}

function VictimCard({ victim, onSelect, onTransport, onArrived }: VictimCardProps) {
    const identifier = victim.braceletId || `#${victim.id.slice(-6)}`;
    // a11y：卡片本身不再用 role="button"/tabIndex 包住整張卡（footer 內有真正的
    // <Button>，兩層互動元素疊在一起會觸發 axe nested-interactive）。改用明確的
    // 票號按鈕承載鍵盤可達性，卡片 onClick 保留給滑鼠使用者做為額外捷徑。
    return (
        <article
            className={`victim-card victim-card--${victim.triageLevel.toLowerCase()}`}
            onClick={() => onSelect(victim)}
        >
            <div className="victim-card__row1">
                <button
                    type="button"
                    className="victim-card__tag u-mono"
                    onClick={(e) => { e.stopPropagation(); onSelect(victim); }}
                    aria-label={`查看傷患 ${identifier} 詳情`}
                >
                    {identifier}
                </button>
                <span className="victim-card__level u-stencil">{LEVEL_META[victim.triageLevel].code}</span>
                <time className="victim-card__time u-mono">{formatTime(victim.createdAt)}</time>
            </div>

            <p className="victim-card__desc">{victim.description || '無描述'}</p>
            <p className="victim-card__location">
                <MapPin size={14} aria-hidden="true" /> {victim.locationDescription || '未知位置'}
            </p>
            {victim.injuries && <p className="victim-card__injuries">{victim.injuries}</p>}

            {/* 生命徵象 mono 讀數：只顯示模型裡真的有的欄位（RR/CRT 選填、P 必有） */}
            <div className="victim-card__vitals u-mono" role="group" aria-label="生命徵象">
                {victim.respiratoryRate != null && (
                    <span><em className="u-stencil">RR</em>{victim.respiratoryRate}</span>
                )}
                <span><em className="u-stencil">P</em>{victim.hasRadialPulse ? '+' : '-'}</span>
                {victim.capillaryRefillTime != null && (
                    <span><em className="u-stencil">CRT</em>{victim.capillaryRefillTime}s</span>
                )}
            </div>

            <div className="victim-card__footer">
                <span className={`victim-card__transport victim-card__transport--${victim.transportStatus.toLowerCase()}`}>
                    {victim.transportStatus === 'PENDING' && <><OutlineSquareStamp size={12} /> 待送</>}
                    {victim.transportStatus === 'IN_TRANSIT' && <><SolidSquareStamp size={12} /> 運送中 → {victim.hospitalName}</>}
                    {victim.transportStatus === 'ARRIVED' && <><CheckStamp size={12} /> 已到院</>}
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

    // c6 事件條計時槽（純顯示，不影響資料層）：現地時鐘＋最後更新時刻
    const [now, setNow] = useState(() => new Date());
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

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
            setLastUpdatedAt(new Date()); // 純顯示用時間戳，接線未變
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

    // c6-top 事件條：kicker＋標題（左）／mono 時鐘（右）／主要動作
    const renderEventBar = (isLoading: boolean) => (
        <header className="triage-eventbar">
            <div className="triage-eventbar__id">
                <div className="triage-eventbar__kicker">
                    <span className="u-stencil">E-TRIAGE · START PROTOCOL</span>
                </div>
                <h1 className="triage-eventbar__title">
                    檢傷分類
                    {missionSessionId && (
                        <small> 場次 <span className="u-mono">#{missionSessionId.slice(-6)}</span></small>
                    )}
                </h1>
            </div>
            <div className="triage-eventbar__clock">
                <div className="triage-eventbar__clock-label">
                    <span className="u-stencil">TIME</span> 現地時間
                </div>
                <time className="triage-eventbar__time u-mono">{formatClock(now)}</time>
                {lastUpdatedAt && (
                    <div className="triage-eventbar__sub u-mono">最後更新 {formatClock(lastUpdatedAt)}</div>
                )}
            </div>
            <Button
                variant="primary"
                icon={<Plus size={16} />}
                disabled={isLoading}
                onClick={() => setShowNewForm(true)}
            >
                新增傷患
            </Button>
        </header>
    );

    if (loading) {
        return (
            <div className="triage-page">
                {renderEventBar(true)}
                <TriageSkeleton />
            </div>
        );
    }

    return (
        <div className="triage-page">
            {renderEventBar(false)}

            {/* c6-tally 分流合計讀數帶：分級色章＋mono 數字＋總數 */}
            {stats && (
                <div className="triage-tally" role="group" aria-label="檢傷分流合計">
                    <span className="triage-tally__label"><span className="u-stencil">TRIAGE COUNT</span> 分流合計</span>
                    <span className="triage-tally__item"><LevelSquare level="RED" />紅 <b className="u-mono">{pad2(stats.red)}</b></span>
                    <span className="triage-tally__item"><LevelSquare level="YELLOW" />黃 <b className="u-mono">{pad2(stats.yellow)}</b></span>
                    <span className="triage-tally__item"><LevelSquare level="GREEN" />綠 <b className="u-mono">{pad2(stats.green)}</b></span>
                    <span className="triage-tally__item"><LevelSquare level="BLACK" />黑 <b className="u-mono">{pad2(stats.black)}</b></span>
                    <span className="triage-tally__total">傷患總數 <b className="u-mono">{pad2(stats.total)}</b></span>
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

            {/* c6-board 四欄 START 看板：桌機四欄並列；行動端只顯示 mobileVisibleLevels 內的欄 */}
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
                                <LevelSquare level={level} />
                                <span className="board-column__code u-stencil">{LEVEL_META[level].code}</span>
                                <h2 className="board-column__title">{LEVEL_META[level].zh}</h2>
                                <b className="board-column__count u-mono">{pad2(levelVictims.length)}</b>
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

            {/* c6-foot 後送讀數帶：欄位皆來自既有 stats（待送/運送中/已到院） */}
            {stats && (
                <div className="triage-foot" role="group" aria-label="後送狀態合計">
                    <span className="triage-foot__label"><span className="u-stencil">EVAC</span> 後送狀態</span>
                    <span className="triage-foot__item"><OutlineSquareStamp size={12} /> 待送 <b className="u-mono">{pad2(stats.pendingTransport)}</b></span>
                    <span className="triage-foot__item"><SolidSquareStamp size={12} /> 運送中 <b className="u-mono">{pad2(stats.inTransit)}</b></span>
                    <span className="triage-foot__item"><CheckStamp size={12} /> 已到院 <b className="u-mono">{pad2(stats.arrived)}</b></span>
                </div>
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
