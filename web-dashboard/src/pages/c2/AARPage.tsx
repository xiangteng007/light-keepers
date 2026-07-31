/**
 * AARPage.tsx
 * 
 * C2 Domain - AAR (After Action Review) 檢討頁面
 * 任務後檢討與經驗學習 — connected to real API
 */
import React, { useState, useEffect, useCallback } from 'react';
import { FileCheck, Calendar, Users, Lightbulb, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import './AARPage.css';

interface AARReport {
    id: string;
    title: string;
    name?: string;
    incidentNumber?: string;
    sessionId?: string;
    date?: string;
    createdAt?: string;
    facilitator?: string;
    participants: number;
    lessonsLearned: number;
    actionItems: number;
}

export default function AARPage() {
    const [aars, setAars] = useState<AARReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAAR, setSelectedAAR] = useState<string | null>(null);

    const fetchAARs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // ⚠️ 後端目前沒有「跨任務的 AAR 列表」端點。
            // 現有 AAR 路由只有 `@Controller('api/missions/:sessionId/aar')`
            // （疊加 global prefix 後為 /api/v1/api/missions/:sessionId/aar），需要 sessionId。
            // 因此本呼叫必定失敗並落入下方 catch 顯示錯誤訊息。
            // 這不是路徑重複 bug（該模組後端本來就帶 `api/` 前綴），而是缺少後端端點，
            // 需在 Phase 3 補 GET /aar 列表端點後再一併調整。
            const response = await api.get('/api/aar');
            const data = response.data?.data || response.data || [];
            const items = Array.isArray(data) ? data : (data.items || data.reports || []);
            setAars(items);
        } catch (err: any) {
            console.error('Failed to fetch AARs:', err);
            setError(getApiErrorMessage(err, '無法載入 AAR 列表'));
            setAars([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAARs();
    }, [fetchAARs]);

    return (
        <PageTemplate
            title="AAR 檢討"
            subtitle="After Action Review - 任務後檢討與經驗學習"
            icon={FileCheck}
            domain="C2 指揮控制"
        >
            <div className="aar-page">
                {/* AAR List */}
                <div className="aar-list">
                    <div className="list-header">
                        <h3>檢討報告列表</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-new" onClick={fetchAARs} disabled={loading} title="重新整理" style={{ padding: '0.25rem 0.5rem' }}>
                                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                            </button>
                            <button className="btn-new">+ 新增 AAR</button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', gap: '0.5rem', color: '#94a3b8' }}>
                            <Loader2 size={20} className="spin" />
                            <span>載入中...</span>
                        </div>
                    )}

                    {/* List */}
                    {!loading && aars.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            暫無 AAR 報告
                        </div>
                    )}
                    {!loading && aars.map(aar => (
                        <div
                            key={aar.id}
                            className={`aar-item ${selectedAAR === aar.id ? 'selected' : ''}`}
                            onClick={() => setSelectedAAR(aar.id)}
                        >
                            <div className="aar-main">
                                <h4>{aar.title || aar.name || `AAR-${aar.id.slice(0, 8)}`}</h4>
                                <span className="incident-ref">{aar.incidentNumber || aar.sessionId || '-'}</span>
                            </div>
                            <div className="aar-meta">
                                <span><Calendar size={12} /> {aar.date || (aar.createdAt ? new Date(aar.createdAt).toLocaleDateString('zh-TW') : '-')}</span>
                                <span><Users size={12} /> {aar.participants || 0} 人</span>
                            </div>
                            <div className="aar-stats">
                                <span className="stat lessons">
                                    <Lightbulb size={14} />
                                    {aar.lessonsLearned || 0} 經驗
                                </span>
                                <span className="stat actions">
                                    <FileCheck size={14} />
                                    {aar.actionItems || 0} 行動項目
                                </span>
                            </div>
                            <ChevronRight size={16} className="chevron" />
                        </div>
                    ))}
                </div>

                {/* AAR Framework Guide */}
                <div className="aar-guide">
                    <h3>AAR 四大問題框架</h3>
                    <div className="framework-cards">
                        <div className="framework-card">
                            <div className="card-icon planned">1</div>
                            <div className="card-content">
                                <h4>我們原本計劃做什麼？</h4>
                                <p>回顧任務目標、預期成果、行動計劃</p>
                            </div>
                        </div>
                        <div className="framework-card">
                            <div className="card-icon actual">2</div>
                            <div className="card-content">
                                <h4>實際發生了什麼事？</h4>
                                <p>客觀描述事件經過，不做評價</p>
                            </div>
                        </div>
                        <div className="framework-card">
                            <div className="card-icon why">3</div>
                            <div className="card-content">
                                <h4>為什麼會這樣？</h4>
                                <p>分析成功與失敗的根本原因</p>
                            </div>
                        </div>
                        <div className="framework-card">
                            <div className="card-icon improve">4</div>
                            <div className="card-content">
                                <h4>下次如何改進？</h4>
                                <p>制定具體可執行的改進行動</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageTemplate>
    );
}
