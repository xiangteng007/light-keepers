/**
 * AARPage.tsx
 * 
 * C2 Domain - AAR (After Action Review) 檢討頁面
 * 任務後檢討與經驗學習 — connected to real API
 */
import React, { useState, useEffect, useCallback } from 'react';
import { FileCheck, Calendar, Users, Lightbulb, ChevronRight, RefreshCw } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import { Button, Badge, Tag, Alert } from '../../design-system';
import EmptyState from '../../components/shared/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton/Skeleton';
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
                {/* AAR 列表（List archetype：本頁無單一 AAR 詳情端點/資料，
                    覆核判定改用列表骨架而非 Detail —— 見批次報告說明） */}
                <section className="panel aar-panel-list" aria-labelledby="aar-list-heading">
                    <div className="aar-toolbar">
                        <h2 id="aar-list-heading" className="aar-panel-title">檢討報告列表</h2>
                        <div className="aar-toolbar-actions">
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={<RefreshCw size={14} className={loading ? 'spin' : ''} aria-hidden="true" />}
                                onClick={fetchAARs}
                                disabled={loading}
                                aria-label="重新整理檢討報告列表"
                            >
                                重新整理
                            </Button>
                            <Button variant="primary" size="sm">+ 新增 AAR</Button>
                        </div>
                    </div>

                    {error && !loading && (
                        <Alert variant="danger" title="載入失敗" className="aar-alert">
                            <p className="aar-alert__message">{error}</p>
                            <Button variant="secondary" size="sm" onClick={fetchAARs}>重試</Button>
                        </Alert>
                    )}

                    {loading ? (
                        <SkeletonList count={4} />
                    ) : error ? null : aars.length === 0 ? (
                        <EmptyState
                            variant="default"
                            title="暫無 AAR 報告"
                            description="尚未建立任何任務後檢討報告。"
                            action={{ label: '重新整理', onClick: fetchAARs }}
                        />
                    ) : (
                        <ul className="aar-list" role="list">
                            {aars.map(aar => {
                                const isSelected = selectedAAR === aar.id;
                                const dateLabel = aar.date || (aar.createdAt ? new Date(aar.createdAt).toLocaleDateString('zh-TW') : '-');
                                return (
                                    <li key={aar.id}>
                                        <button
                                            type="button"
                                            className={`aar-item ${isSelected ? 'aar-item--selected' : ''}`}
                                            onClick={() => setSelectedAAR(aar.id)}
                                            aria-pressed={isSelected}
                                        >
                                            <div className="aar-item__main">
                                                <span className="aar-item__title">{aar.title || aar.name || `AAR-${aar.id.slice(0, 8)}`}</span>
                                                <Tag size="sm" color="default">{aar.incidentNumber || aar.sessionId || '-'}</Tag>
                                            </div>
                                            <div className="aar-item__meta">
                                                <span><Calendar size={12} aria-hidden="true" /> <time dateTime={aar.createdAt}>{dateLabel}</time></span>
                                                <span><Users size={12} aria-hidden="true" /> {aar.participants || 0} 人</span>
                                            </div>
                                            <div className="aar-item__stats">
                                                <Badge variant="warning" size="sm" icon={<Lightbulb size={12} aria-hidden="true" />}>
                                                    {aar.lessonsLearned || 0} 經驗
                                                </Badge>
                                                <Badge variant="info" size="sm" icon={<FileCheck size={12} aria-hidden="true" />}>
                                                    {aar.actionItems || 0} 行動項目
                                                </Badge>
                                            </div>
                                            <ChevronRight size={16} className="aar-item__chevron" aria-hidden="true" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* AAR 四大問題框架（歷程可審計性參考：時間戳＋操作者＋對象由上方列表項目呈現） */}
                <section className="panel aar-panel-guide" aria-labelledby="aar-guide-heading">
                    <h2 id="aar-guide-heading" className="aar-panel-title">AAR 四大問題框架</h2>
                    <ol className="aar-framework">
                        <li className="aar-framework__item">
                            <span className="aar-framework__num" data-tone="planned" aria-hidden="true">1</span>
                            <div>
                                <h3>我們原本計劃做什麼？</h3>
                                <p>回顧任務目標、預期成果、行動計劃</p>
                            </div>
                        </li>
                        <li className="aar-framework__item">
                            <span className="aar-framework__num" data-tone="actual" aria-hidden="true">2</span>
                            <div>
                                <h3>實際發生了什麼事？</h3>
                                <p>客觀描述事件經過，不做評價</p>
                            </div>
                        </li>
                        <li className="aar-framework__item">
                            <span className="aar-framework__num" data-tone="why" aria-hidden="true">3</span>
                            <div>
                                <h3>為什麼會這樣？</h3>
                                <p>分析成功與失敗的根本原因</p>
                            </div>
                        </li>
                        <li className="aar-framework__item">
                            <span className="aar-framework__num" data-tone="improve" aria-hidden="true">4</span>
                            <div>
                                <h3>下次如何改進？</h3>
                                <p>制定具體可執行的改進行動</p>
                            </div>
                        </li>
                    </ol>
                </section>
            </div>
        </PageTemplate>
    );
}
