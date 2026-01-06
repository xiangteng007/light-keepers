import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EmergencyResponsePage.css';

interface MissionSession {
    id: string;
    title: string;
    status: 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled';
    commanderName?: string;
    createdAt: string;
    startedAt?: string;
}

interface SessionStats {
    sessionId: string;
    status: string;
    eventsCount: number;
    tasksCount: number;
    completedTasksCount: number;
    duration: number;
}

const EmergencyResponsePage: React.FC = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<MissionSession[]>([]);
    const [activeSession, setActiveSession] = useState<MissionSession | null>(null);
    const [stats, setStats] = useState<SessionStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSessionTitle, setNewSessionTitle] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_URL}/mission-sessions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSessions(response.data);

            // Find active session
            const active = response.data.find((s: MissionSession) => s.status === 'active');
            if (active) {
                setActiveSession(active);
                loadStats(active.id);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to load sessions:', error);
            setLoading(false);
        }
    };

    const loadStats = async (sessionId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_URL}/mission-sessions/${sessionId}/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const createSession = async () => {
        if (!newSessionTitle.trim()) return;

        try {
            const token = localStorage.getItem('accessToken');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            await axios.post(
                `${API_URL}/mission-sessions`,
                {
                    title: newSessionTitle,
                    status: 'preparing',
                    commanderName: user.displayName || user.email,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNewSessionTitle('');
            setShowCreateModal(false);
            loadSessions();
        } catch (error) {
            console.error('Failed to create session:', error);
            alert('建立任務失敗');
        }
    };

    const startSession = async (sessionId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(
                `${API_URL}/mission-sessions/${sessionId}/start`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            loadSessions();
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('啟動任務失敗');
        }
    };

    const endSession = async (sessionId: string) => {
        if (!confirm('確定要結束這個任務嗎？')) return;

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(
                `${API_URL}/mission-sessions/${sessionId}/end`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setActiveSession(null);
            setStats(null);
            loadSessions();
        } catch (error) {
            console.error('Failed to end session:', error);
            alert('結束任務失敗');
        }
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    if (loading) {
        return (
            <div className="emergency-response-page">
                <div className="loading">載入中...</div>
            </div>
        );
    }

    return (
        <div className="emergency-response-page">
            {/* Header */}
            <div className="er-header">
                <h1>🚨 緊急應變任務系統</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    + 新增任務
                </button>
            </div>

            {/* KPI Cards */}
            {activeSession && stats && (
                <div className="kpi-row">
                    <div className="kpi-card">
                        <div className="kpi-icon">📊</div>
                        <div className="kpi-content">
                            <div className="kpi-label">任務狀態</div>
                            <div className="kpi-value">{getStatusText(stats.status)}</div>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">📝</div>
                        <div className="kpi-content">
                            <div className="kpi-label">事件數</div>
                            <div className="kpi-value">{stats.eventsCount}</div>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">✅</div>
                        <div className="kpi-content">
                            <div className="kpi-label">任務進度</div>
                            <div className="kpi-value">
                                {stats.completedTasksCount}/{stats.tasksCount}
                            </div>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">⏱️</div>
                        <div className="kpi-content">
                            <div className="kpi-label">持續時間</div>
                            <div className="kpi-value">{formatDuration(stats.duration)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Session */}
            {activeSession ? (
                <div className="active-session-card">
                    <h2>進行中任務：{activeSession.title}</h2>
                    <p>指揮官：{activeSession.commanderName || '未指定'}</p>

                    {/* Command Tools */}
                    <div className="command-tools">
                        <h4>📋 指揮工具</h4>
                        <div className="tools-grid">
                            <button
                                className="tool-btn"
                                onClick={() => navigate(`/emergency-response/map/${activeSession.id}`)}
                            >
                                <span className="tool-icon">🗺️</span>
                                <span className="tool-label">COP 地圖</span>
                            </button>
                            <button
                                className="tool-btn"
                                onClick={() => navigate(`/mission-command/${activeSession.id}`)}
                            >
                                <span className="tool-icon">📡</span>
                                <span className="tool-label">指揮中心</span>
                            </button>
                            <button
                                className="tool-btn"
                                onClick={() => navigate(`/emergency-response/iap/${activeSession.id}`)}
                            >
                                <span className="tool-icon">📋</span>
                                <span className="tool-label">作戰計畫</span>
                            </button>
                            <button
                                className="tool-btn"
                                onClick={() => navigate(`/emergency-response/sitrep/${activeSession.id}`)}
                            >
                                <span className="tool-icon">📊</span>
                                <span className="tool-label">情勢報告</span>
                            </button>
                        </div>
                    </div>

                    <div className="session-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate(`/emergency-response/${activeSession.id}/events`)}
                        >
                            查看事件
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate(`/emergency-response/${activeSession.id}/tasks`)}
                        >
                            管理任務
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => endSession(activeSession.id)}
                        >
                            結束任務
                        </button>
                    </div>
                </div>
            ) : (
                <div className="no-active-session">
                    <p>目前沒有進行中的任務</p>
                </div>
            )}

            {/* Session List */}
            <div className="session-list">
                <h3>任務歷史</h3>
                <div className="session-grid">
                    {sessions.map(session => (
                        <div key={session.id} className={`session-card status-${session.status}`}>
                            <div className="session-header">
                                <h4>{session.title}</h4>
                                <span className="status-badge">{getStatusText(session.status)}</span>
                            </div>
                            <p className="session-info">
                                指揮官：{session.commanderName || '未指定'}
                            </p>
                            <p className="session-date">
                                建立時間：{new Date(session.createdAt).toLocaleString('zh-TW')}
                            </p>
                            <div className="session-card-actions">
                                {session.status === 'preparing' && (
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => startSession(session.id)}
                                    >
                                        啟動任務
                                    </button>
                                )}
                                {session.status === 'completed' && (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => navigate(`/emergency-response/aar/${session.id}`)}
                                    >
                                        📊 復盤報告
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>新增緊急應變任務</h3>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="任務名稱"
                            value={newSessionTitle}
                            onChange={(e) => setNewSessionTitle(e.target.value)}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={createSession}
                            >
                                建立
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        preparing: '準備中',
        active: '進行中',
        paused: '已暫停',
        completed: '已完成',
        cancelled: '已取消',
    };
    return statusMap[status] || status;
}

export default EmergencyResponsePage;
