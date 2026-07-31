/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
import React, { useState, useEffect } from 'react';
import './AARPlaybackPage.css';

interface TimelineEvent {
    timestamp: string;
    eventType: 'report' | 'task' | 'decision' | 'sos' | 'dispatch' | 'status_change' | 'other';
    title: string;
    description: string;
    severity?: number;
    actorName?: string;
}

interface LessonLearned {
    id: string;
    category: string;
    observation: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    status: 'identified' | 'in_progress' | 'implemented';
}

interface AAR {
    id: string;
    title: string;
    timeline: TimelineEvent[];
    statistics: {
        duration?: number;
        totalReports?: number;
        totalTasks?: number;
        completedTasks?: number;
        sosCount?: number;
        taskCompletionRate?: number;
    };
    lessonsLearned: LessonLearned[];
    successes: string[];
    challenges: string[];
    executiveSummary?: string;
    status: 'draft' | 'review' | 'finalized';
    aiGenerated: boolean;
}

const AARPlaybackPage: React.FC = () => {
    const [aar, setAAR] = useState<AAR | null>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'timeline' | 'stats' | 'lessons' | 'export'>('timeline');
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const sessionId = 'current-session';

    useEffect(() => {
        fetchAAR();
    }, []);

    useEffect(() => {
        if (isPlaying && aar && playbackIndex < aar.timeline.length - 1) {
            const timer = setTimeout(() => {
                setPlaybackIndex(prev => prev + 1);
            }, 1500);
            return () => clearTimeout(timer);
        } else if (playbackIndex >= (aar?.timeline.length || 0) - 1) {
            setIsPlaying(false);
        }
    }, [isPlaying, playbackIndex, aar]);

    const fetchAAR = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/missions/${sessionId}/aar`);
            const data = await response.json();
            if (data.success && data.data) {
                setAAR(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch AAR:', error);
        }
        setLoading(false);
    };

    const generateAAR = async () => {
        setGenerating(true);
        try {
            const response = await fetch(`/api/missions/${sessionId}/aar/generate`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                setAAR(data.data);
            }
        } catch (error) {
            console.error('Failed to generate AAR:', error);
        }
        setGenerating(false);
    };

    const finalizeAAR = async () => {
        if (!aar) return;
        try {
            const response = await fetch(`/api/missions/${sessionId}/aar/${aar.id}/finalize`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                setAAR(data.data);
            }
        } catch (error) {
            console.error('Failed to finalize AAR:', error);
        }
    };

    const getEventIcon = (type: string) => {
        const icons: Record<string, string> = {
            report: '📝',
            task: '📋',
            decision: '⚖️',
            sos: '🆘',
            dispatch: '🚀',
            status_change: '🔄',
            other: '📌',
        };
        return icons[type] || '📌';
    };

    const getSeverityColor = (severity?: number) => {
        if (severity === undefined) return 'var(--text-secondary)';
        const colors = ['#4ade80', '#facc15', '#fb923c', '#f87171', '#ef4444'];
        return colors[Math.min(severity, 4)];
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    if (loading) {
        return (
            <div className="aar-playback-page">
                <div className="loading-state">載入中...</div>
            </div>
        );
    }

    if (!aar) {
        return (
            <div className="aar-playback-page">
                <div className="no-aar-state">
                    <div className="no-aar-icon">📊</div>
                    <h2>尚無事後復盤報告</h2>
                    <p>任務結束後可生成 AAR 進行檢討與經驗傳承</p>
                    <button
                        className="btn-generate"
                        onClick={generateAAR}
                        disabled={generating}
                    >
                        {generating ? '生成中...' : '🤖 AI 自動生成 AAR'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="aar-playback-page">
            <header className="aar-header">
                <div className="header-left">
                    <h1>📊 事後復盤 (AAR)</h1>
                    <p>{aar.title}</p>
                </div>
                <div className="header-actions">
                    {aar.status !== 'finalized' && (
                        <button className="btn-finalize" onClick={finalizeAAR}>
                            ✓ 定稿
                        </button>
                    )}
                    {aar.status === 'finalized' && (
                        <span className="finalized-badge">✓ 已定稿</span>
                    )}
                </div>
            </header>

            <div className="aar-tabs">
                <button
                    className={activeTab === 'timeline' ? 'active' : ''}
                    onClick={() => setActiveTab('timeline')}
                >
                    ⏱️ 時間軸回放
                </button>
                <button
                    className={activeTab === 'stats' ? 'active' : ''}
                    onClick={() => setActiveTab('stats')}
                >
                    📈 統計數據
                </button>
                <button
                    className={activeTab === 'lessons' ? 'active' : ''}
                    onClick={() => setActiveTab('lessons')}
                >
                    💡 經驗教訓
                </button>
                <button
                    className={activeTab === 'export' ? 'active' : ''}
                    onClick={() => setActiveTab('export')}
                >
                    📤 匯出報告
                </button>
            </div>

            <div className="aar-content">
                {activeTab === 'timeline' && (
                    <div className="timeline-panel">
                        <div className="playback-controls">
                            <button
                                className="btn-play"
                                onClick={() => {
                                    if (playbackIndex >= aar.timeline.length - 1) {
                                        setPlaybackIndex(0);
                                    }
                                    setIsPlaying(!isPlaying);
                                }}
                            >
                                {isPlaying ? '⏸️ 暫停' : '▶️ 播放'}
                            </button>
                            <button
                                className="btn-reset"
                                onClick={() => {
                                    setPlaybackIndex(0);
                                    setIsPlaying(false);
                                }}
                            >
                                ⏮️ 重置
                            </button>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${(playbackIndex / (aar.timeline.length - 1)) * 100}%` }}
                                />
                            </div>
                            <span className="progress-text">
                                {playbackIndex + 1} / {aar.timeline.length}
                            </span>
                        </div>

                        <div className="timeline-view">
                            {aar.timeline.slice(0, playbackIndex + 1).map((event, i) => (
                                <div
                                    key={i}
                                    className={`timeline-item ${i === playbackIndex ? 'current' : ''}`}
                                >
                                    <div className="timeline-marker">
                                        <span
                                            className="event-icon"
                                            style={{ background: getSeverityColor(event.severity) }}
                                        >
                                            {getEventIcon(event.eventType)}
                                        </span>
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-time">
                                            {new Date(event.timestamp).toLocaleString('zh-TW')}
                                        </div>
                                        <h4>{event.title}</h4>
                                        <p>{event.description}</p>
                                        {event.actorName && (
                                            <span className="actor">👤 {event.actorName}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="stats-panel">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-icon">⏱️</span>
                                <span className="stat-value">{formatDuration(aar.statistics.duration)}</span>
                                <span className="stat-label">總時長</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">📝</span>
                                <span className="stat-value">{aar.statistics.totalReports || 0}</span>
                                <span className="stat-label">回報數</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-icon">📋</span>
                                <span className="stat-value">{aar.statistics.totalTasks || 0}</span>
                                <span className="stat-label">任務數</span>
                            </div>
                            <div className="stat-card success">
                                <span className="stat-icon">✓</span>
                                <span className="stat-value">{aar.statistics.taskCompletionRate || 0}%</span>
                                <span className="stat-label">完成率</span>
                            </div>
                            <div className="stat-card warning">
                                <span className="stat-icon">🆘</span>
                                <span className="stat-value">{aar.statistics.sosCount || 0}</span>
                                <span className="stat-label">SOS 數</span>
                            </div>
                        </div>

                        {aar.successes.length > 0 && (
                            <div className="review-section">
                                <h3>✅ 成功事項</h3>
                                <ul>
                                    {aar.successes.map((item, i) => (
                                        <li key={i} className="success-item">{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {aar.challenges.length > 0 && (
                            <div className="review-section">
                                <h3>⚠️ 挑戰與問題</h3>
                                <ul>
                                    {aar.challenges.map((item, i) => (
                                        <li key={i} className="challenge-item">{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'lessons' && (
                    <div className="lessons-panel">
                        {aar.lessonsLearned.length === 0 ? (
                            <div className="empty-lessons">
                                <p>尚未記錄經驗教訓</p>
                                <button className="btn-add-lesson">➕ 新增經驗教訓</button>
                            </div>
                        ) : (
                            <div className="lessons-list">
                                {aar.lessonsLearned.map(lesson => (
                                    <div key={lesson.id} className={`lesson-card priority-${lesson.priority}`}>
                                        <div className="lesson-header">
                                            <span className="lesson-category">{lesson.category}</span>
                                            <span className={`lesson-priority ${lesson.priority}`}>
                                                {lesson.priority === 'high' ? '🔴 高' :
                                                    lesson.priority === 'medium' ? '🟡 中' : '🟢 低'}
                                            </span>
                                        </div>
                                        <div className="lesson-observation">
                                            <strong>觀察：</strong> {lesson.observation}
                                        </div>
                                        <div className="lesson-recommendation">
                                            <strong>建議：</strong> {lesson.recommendation}
                                        </div>
                                        <div className={`lesson-status ${lesson.status}`}>
                                            {lesson.status === 'implemented' ? '✓ 已實施' :
                                                lesson.status === 'in_progress' ? '⏳ 進行中' : '📌 已識別'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'export' && (
                    <div className="export-panel">
                        <div className="export-options">
                            <div className="export-option">
                                <span className="export-icon">📄</span>
                                <h4>PDF 報告</h4>
                                <p>完整 AAR 報告，適合存檔與分享</p>
                                <button className="btn-export">下載 PDF</button>
                            </div>
                            <div className="export-option">
                                <span className="export-icon">📝</span>
                                <h4>Word 文件</h4>
                                <p>可編輯格式，方便後續修改</p>
                                <button className="btn-export">下載 DOCX</button>
                            </div>
                            <div className="export-option">
                                <span className="export-icon">📊</span>
                                <h4>數據匯出</h4>
                                <p>JSON/CSV 格式，適合資料分析</p>
                                <button className="btn-export">下載 JSON</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AARPlaybackPage;
