import React, { useState, useEffect } from 'react';
import './SITREPViewerPage.css';

interface KeyEvent {
    time: string;
    description: string;
    severity?: number;
    location?: string;
}

interface ResourceStatus {
    resourceType: string;
    available: number;
    deployed: number;
    requested: number;
}

interface SITREP {
    id: string;
    sequence: number;
    periodStart: string;
    periodEnd: string;
    summary: string;
    keyEvents: KeyEvent[];
    resourceStatus: ResourceStatus[];
    casualties: {
        injured?: number;
        deceased?: number;
        rescued?: number;
        evacuated?: number;
    };
    nextActions: string[];
    status: 'draft' | 'approved' | 'distributed';
    aiGenerated: boolean;
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
}

interface DecisionLog {
    id: string;
    timestamp: string;
    decisionType: string;
    description: string;
    rationale?: string;
    decidedByName?: string;
    aiAssisted: boolean;
}

const SITREPViewerPage: React.FC = () => {
    const [sitreps, setSitreps] = useState<SITREP[]>([]);
    const [selectedSitrep, setSelectedSitrep] = useState<SITREP | null>(null);
    const [decisions, setDecisions] = useState<DecisionLog[]>([]);
    const [activeTab, setActiveTab] = useState<'sitrep' | 'decisions' | 'generate'>('sitrep');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const sessionId = 'current-session';

    useEffect(() => {
        fetchSITREPs();
        fetchDecisions();
    }, []);

    const fetchSITREPs = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/missions/${sessionId}/sitrep`);
            const data = await response.json();
            if (data.success) {
                setSitreps(data.data);
                if (data.data.length > 0) {
                    setSelectedSitrep(data.data[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch SITREPs:', error);
        }
        setLoading(false);
    };

    const fetchDecisions = async () => {
        try {
            const response = await fetch(`/api/missions/${sessionId}/sitrep/decisions`);
            const data = await response.json();
            if (data.success) {
                setDecisions(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch decisions:', error);
        }
    };

    const generateSITREP = async () => {
        setGenerating(true);
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        try {
            const response = await fetch(`/api/missions/${sessionId}/sitrep/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodStart: hourAgo.toISOString(),
                    periodEnd: now.toISOString(),
                }),
            });
            const data = await response.json();
            if (data.success) {
                fetchSITREPs();
                setActiveTab('sitrep');
            }
        } catch (error) {
            console.error('Failed to generate SITREP:', error);
        }
        setGenerating(false);
    };

    const approveSITREP = async (sitrepId: string) => {
        try {
            const response = await fetch(`/api/missions/${sessionId}/sitrep/${sitrepId}/approve`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                fetchSITREPs();
            }
        } catch (error) {
            console.error('Failed to approve SITREP:', error);
        }
    };

    const getSeverityColor = (severity?: number) => {
        if (!severity) return '#8899a6';
        const colors = ['#4ade80', '#facc15', '#fb923c', '#f87171', '#ef4444'];
        return colors[Math.min(severity, 4)];
    };

    const getDecisionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            dispatch: '📋 派遣',
            severity: '⚠️ 嚴重度調整',
            accept_ai: '🤖 採信 AI',
            reject_ai: '❌ 拒絕 AI',
            merge: '🔗 合併',
            close: '✓ 結案',
            escalate: '📢 升級',
            resource: '📦 資源分配',
            sector: '🗺️ 責任區',
            evacuation: '🚨 撤離',
        };
        return labels[type] || type;
    };

    return (
        <div className="sitrep-viewer-page">
            <header className="sitrep-header">
                <div className="header-left">
                    <h1>📊 情勢報告 (SITREP)</h1>
                    <p>即時態勢與決策追蹤</p>
                </div>
                <div className="header-stats">
                    <div className="stat">
                        <span className="value">{sitreps.length}</span>
                        <span className="label">報告</span>
                    </div>
                    <div className="stat">
                        <span className="value">{decisions.length}</span>
                        <span className="label">決策</span>
                    </div>
                </div>
            </header>

            <div className="sitrep-tabs">
                <button
                    className={activeTab === 'sitrep' ? 'active' : ''}
                    onClick={() => setActiveTab('sitrep')}
                >
                    📄 情勢報告
                </button>
                <button
                    className={activeTab === 'decisions' ? 'active' : ''}
                    onClick={() => setActiveTab('decisions')}
                >
                    📝 決策紀錄
                </button>
                <button
                    className={activeTab === 'generate' ? 'active' : ''}
                    onClick={() => setActiveTab('generate')}
                >
                    🤖 AI 生成
                </button>
            </div>

            <div className="sitrep-content">
                {activeTab === 'sitrep' && (
                    <div className="sitrep-panel">
                        <div className="sitrep-list">
                            {sitreps.map(sitrep => (
                                <div
                                    key={sitrep.id}
                                    className={`sitrep-card ${selectedSitrep?.id === sitrep.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedSitrep(sitrep)}
                                >
                                    <div className="sitrep-card-header">
                                        <span className="sequence">SITREP #{sitrep.sequence}</span>
                                        {sitrep.aiGenerated && <span className="ai-badge">AI</span>}
                                    </div>
                                    <div className="sitrep-time">
                                        {new Date(sitrep.createdAt).toLocaleString('zh-TW')}
                                    </div>
                                    <div className={`sitrep-status ${sitrep.status}`}>
                                        {sitrep.status === 'approved' ? '✓ 已核准' :
                                            sitrep.status === 'distributed' ? '📤 已發布' : '📝 草稿'}
                                    </div>
                                </div>
                            ))}
                            {sitreps.length === 0 && (
                                <div className="empty-state">
                                    <p>尚無 SITREP</p>
                                    <button onClick={() => setActiveTab('generate')}>
                                        AI 自動生成
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedSitrep && (
                            <div className="sitrep-detail">
                                <div className="detail-header">
                                    <h2>SITREP #{selectedSitrep.sequence}</h2>
                                    {selectedSitrep.status === 'draft' && (
                                        <button
                                            className="btn-approve"
                                            onClick={() => approveSITREP(selectedSitrep.id)}
                                        >
                                            ✓ 核准
                                        </button>
                                    )}
                                </div>

                                <div className="time-range">
                                    <span>📅 報告期間：</span>
                                    {new Date(selectedSitrep.periodStart).toLocaleString('zh-TW')} -
                                    {new Date(selectedSitrep.periodEnd).toLocaleString('zh-TW')}
                                </div>

                                <div className="section">
                                    <h3>📋 情勢摘要</h3>
                                    <p className="summary-text">{selectedSitrep.summary}</p>
                                </div>

                                {selectedSitrep.keyEvents.length > 0 && (
                                    <div className="section">
                                        <h3>⚡ 重要事件</h3>
                                        <div className="events-timeline">
                                            {selectedSitrep.keyEvents.map((event, i) => (
                                                <div key={i} className="event-item">
                                                    <div
                                                        className="event-dot"
                                                        style={{ background: getSeverityColor(event.severity) }}
                                                    />
                                                    <div className="event-content">
                                                        <span className="event-time">
                                                            {new Date(event.time).toLocaleTimeString('zh-TW')}
                                                        </span>
                                                        <p>{event.description}</p>
                                                        {event.location && (
                                                            <span className="event-location">📍 {event.location}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {Object.values(selectedSitrep.casualties).some(v => v) && (
                                    <div className="section">
                                        <h3>🏥 傷亡統計</h3>
                                        <div className="casualties-grid">
                                            {selectedSitrep.casualties.injured !== undefined && (
                                                <div className="casualty-item">
                                                    <span className="value">{selectedSitrep.casualties.injured}</span>
                                                    <span className="label">傷患</span>
                                                </div>
                                            )}
                                            {selectedSitrep.casualties.rescued !== undefined && (
                                                <div className="casualty-item success">
                                                    <span className="value">{selectedSitrep.casualties.rescued}</span>
                                                    <span className="label">救出</span>
                                                </div>
                                            )}
                                            {selectedSitrep.casualties.evacuated !== undefined && (
                                                <div className="casualty-item">
                                                    <span className="value">{selectedSitrep.casualties.evacuated}</span>
                                                    <span className="label">撤離</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selectedSitrep.nextActions.length > 0 && (
                                    <div className="section">
                                        <h3>➡️ 下步作為</h3>
                                        <ul className="next-actions">
                                            {selectedSitrep.nextActions.map((action, i) => (
                                                <li key={i}>{action}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'decisions' && (
                    <div className="decisions-panel">
                        <div className="decisions-list">
                            {decisions.map(decision => (
                                <div key={decision.id} className="decision-item">
                                    <div className="decision-header">
                                        <span className="decision-type">
                                            {getDecisionTypeLabel(decision.decisionType)}
                                        </span>
                                        {decision.aiAssisted && <span className="ai-badge">AI</span>}
                                        <span className="decision-time">
                                            {new Date(decision.timestamp).toLocaleString('zh-TW')}
                                        </span>
                                    </div>
                                    <p className="decision-description">{decision.description}</p>
                                    {decision.rationale && (
                                        <p className="decision-rationale">💡 {decision.rationale}</p>
                                    )}
                                    <span className="decision-actor">
                                        👤 {decision.decidedByName || '系統'}
                                    </span>
                                </div>
                            ))}
                            {decisions.length === 0 && (
                                <div className="empty-state">
                                    <p>尚無決策紀錄</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'generate' && (
                    <div className="generate-panel">
                        <div className="generate-card">
                            <div className="generate-icon">🤖</div>
                            <h3>AI 自動生成 SITREP</h3>
                            <p>
                                AI 將根據過去一小時的回報、決策和任務狀態，
                                自動彙整生成情勢報告草稿。
                            </p>
                            <ul className="generate-includes">
                                <li>✓ 重要事件時間軸</li>
                                <li>✓ 回報統計與分類</li>
                                <li>✓ 決策摘要</li>
                                <li>✓ 建議下步作為</li>
                            </ul>
                            <button
                                className="btn-generate"
                                onClick={generateSITREP}
                                disabled={generating}
                            >
                                {generating ? '生成中...' : '🚀 開始生成'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SITREPViewerPage;
