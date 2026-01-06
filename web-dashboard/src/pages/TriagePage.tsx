/**
 * Triage Page - E-Triage 檢傷分類頁面
 * 基於 START 檢傷法
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
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

    // ============ Filtering ============

    const filteredVictims = filterLevel === 'ALL'
        ? victims
        : victims.filter(v => v.triageLevel === filterLevel);

    // ============ Render ============

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'BLACK': return '#1a1a1a';
            case 'RED': return '#ef4444';
            case 'YELLOW': return '#f59e0b';
            case 'GREEN': return '#22c55e';
            default: return '#888';
        }
    };

    const getLevelLabel = (level: string) => {
        switch (level) {
            case 'BLACK': return '黑 (死亡)';
            case 'RED': return '紅 (危急)';
            case 'YELLOW': return '黃 (延遲)';
            case 'GREEN': return '綠 (輕傷)';
            default: return level;
        }
    };

    if (loading) {
        return <div className="triage-page loading">載入中...</div>;
    }

    return (
        <div className="triage-page">
            <header className="triage-header">
                <h1>🏥 E-Triage 檢傷分類</h1>
                <button className="btn-new" onClick={() => setShowNewForm(true)}>
                    + 新增傷患
                </button>
            </header>

            {/* Stats Panel */}
            {stats && (
                <div className="stats-panel">
                    <div className="stat-card total">
                        <span className="label">總人數</span>
                        <span className="value">{stats.total}</span>
                    </div>
                    <div className="stat-card black">
                        <span className="label">黑</span>
                        <span className="value">{stats.black}</span>
                    </div>
                    <div className="stat-card red">
                        <span className="label">紅</span>
                        <span className="value">{stats.red}</span>
                    </div>
                    <div className="stat-card yellow">
                        <span className="label">黃</span>
                        <span className="value">{stats.yellow}</span>
                    </div>
                    <div className="stat-card green">
                        <span className="label">綠</span>
                        <span className="value">{stats.green}</span>
                    </div>
                    <div className="stat-card transport">
                        <span className="label">待送</span>
                        <span className="value">{stats.pendingTransport}</span>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="filter-bar">
                {['ALL', 'BLACK', 'RED', 'YELLOW', 'GREEN'].map(level => (
                    <button
                        key={level}
                        className={`filter-btn ${filterLevel === level ? 'active' : ''}`}
                        onClick={() => setFilterLevel(level)}
                        style={level !== 'ALL' ? { borderColor: getLevelColor(level) } : {}}
                    >
                        {level === 'ALL' ? '全部' : getLevelLabel(level)}
                    </button>
                ))}
            </div>

            {/* Victim List */}
            <div className="victim-list">
                {filteredVictims.map(victim => (
                    <div
                        key={victim.id}
                        className="victim-card"
                        style={{ borderLeftColor: getLevelColor(victim.triageLevel) }}
                        onClick={() => setSelectedVictim(victim)}
                    >
                        <div className="victim-header">
                            <span
                                className="level-badge"
                                style={{ backgroundColor: getLevelColor(victim.triageLevel) }}
                            >
                                {victim.triageLevel}
                            </span>
                            {victim.braceletId && (
                                <span className="bracelet-id">🏷️ {victim.braceletId}</span>
                            )}
                        </div>
                        <p className="description">{victim.description || '無描述'}</p>
                        <p className="location">📍 {victim.locationDescription || '未知位置'}</p>
                        <div className="victim-footer">
                            <span className="transport-status">
                                {victim.transportStatus === 'PENDING' && '⏳ 待送'}
                                {victim.transportStatus === 'IN_TRANSIT' && `🚑 運送中 → ${victim.hospitalName}`}
                                {victim.transportStatus === 'ARRIVED' && '✅ 已到院'}
                            </span>
                            {victim.transportStatus === 'PENDING' && (
                                <button
                                    className="btn-transport"
                                    onClick={(e) => { e.stopPropagation(); handleStartTransport(victim.id); }}
                                >
                                    開始運送
                                </button>
                            )}
                            {victim.transportStatus === 'IN_TRANSIT' && (
                                <button
                                    className="btn-arrived"
                                    onClick={(e) => { e.stopPropagation(); handleConfirmArrival(victim.id); }}
                                >
                                    確認到達
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* New Victim Modal */}
            {showNewForm && (
                <div className="modal-overlay" onClick={() => setShowNewForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>START 檢傷評估</h2>

                        <div className="start-flow">
                            <div className="question">
                                <label>1. 傷患能行走嗎？</label>
                                <div className="btn-group">
                                    <button
                                        className={formData.canWalk ? 'active yes' : ''}
                                        onClick={() => setFormData({ ...formData, canWalk: true })}
                                    >是 → 綠色</button>
                                    <button
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
                                                className={formData.breathing ? 'active yes' : ''}
                                                onClick={() => setFormData({ ...formData, breathing: true })}
                                            >有</button>
                                            <button
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
                                                        className={formData.hasRadialPulse ? 'active yes' : ''}
                                                        onClick={() => setFormData({ ...formData, hasRadialPulse: true })}
                                                    >有</button>
                                                    <button
                                                        className={!formData.hasRadialPulse ? 'active no' : ''}
                                                        onClick={() => setFormData({ ...formData, hasRadialPulse: false })}
                                                    >無 → 紅色</button>
                                                </div>
                                            </div>

                                            <div className="question">
                                                <label>5. 能遵從簡單指令？</label>
                                                <div className="btn-group">
                                                    <button
                                                        className={formData.canFollowCommands ? 'active yes' : ''}
                                                        onClick={() => setFormData({ ...formData, canFollowCommands: true })}
                                                    >能 → 黃色</button>
                                                    <button
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
                            <label>傷患描述 (年齡/性別/特徵)</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="例: 約50歲男性，穿藍色外套"
                            />
                        </div>

                        <div className="form-section">
                            <label>發現位置</label>
                            <input
                                type="text"
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
                            <label>手環 ID (選填)</label>
                            <input
                                type="text"
                                value={formData.braceletId}
                                onChange={e => setFormData({ ...formData, braceletId: e.target.value })}
                                placeholder="NFC/QR 掃描"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowNewForm(false)}>取消</button>
                            <button className="btn-save" onClick={handleCreateVictim}>儲存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TriagePage;
