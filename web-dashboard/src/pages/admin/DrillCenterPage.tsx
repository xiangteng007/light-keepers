/**
 * 演練導播台 (Drill Center Page)
 * 模組 A 前端
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import { LEGACY } from '../../api/paths';
import './DrillCenterPage.css';

interface DrillEvent {
    time: string;
    offsetMinutes: number;
    type: string;
    description: string;
    location?: { lat: number; lng: number };
    payload: Record<string, any>;
}

interface DrillScenario {
    id: string;
    title: string;
    description: string;
    events: DrillEvent[];
    status: string;
    result?: {
        totalEvents: number;
        respondedEvents: number;
        averageResponseTime: number;
        resourceAllocationScore: number;
        aiRecommendations: string[];
    };
}

interface DrillState {
    isDrillMode: boolean;
    activeScenarioId: string | null;
    startTime: string | null;
}

const DrillCenterPage: React.FC = () => {
    const [scenarios, setScenarios] = useState<DrillScenario[]>([]);
    const [drillState, setDrillState] = useState<DrillState | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<DrillScenario | null>(null);
    const [loading, setLoading] = useState(true);
    const [, setShowEditor] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadDrillStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        await Promise.all([loadScenarios(), loadDrillStatus(), loadTemplates()]);
        setLoading(false);
    };

    const loadScenarios = async () => {
        try {
            const { data } = await api.get(`${LEGACY.drill}/scenarios`);
            setScenarios(data.data || []);
        } catch (error) {
            console.error('Failed to load scenarios:', getApiErrorMessage(error, '載入演練腳本失敗'));
        }
    };

    const loadDrillStatus = async () => {
        try {
            const { data } = await api.get(`${LEGACY.drill}/status`);
            setDrillState(data.data);
        } catch (error) {
            console.error('Failed to load drill status:', getApiErrorMessage(error, '載入演練狀態失敗'));
        }
    };

    const loadTemplates = async () => {
        try {
            await api.get(`${LEGACY.drill}/templates`);
            // Templates loaded, can be used for quick scenario creation
        } catch (error) {
            console.error('Failed to load templates:', getApiErrorMessage(error, '載入演練範本失敗'));
        }
    };

    const startDrill = async (scenarioId: string) => {
        if (!confirm('確定要開始演練嗎？系統將進入演練模式。')) return;

        try {
            const { data } = await api.post(`${LEGACY.drill}/start/${scenarioId}`);
            if (data.success) {
                alert(data.message);
                loadDrillStatus();
            }
        } catch (error) {
            console.error('Failed to start drill:', getApiErrorMessage(error, '開始演練失敗'));
        }
    };

    const stopDrill = async () => {
        if (!confirm('確定要結束演練嗎？')) return;

        try {
            const { data } = await api.post(`${LEGACY.drill}/stop`);
            if (data.success) {
                alert('演練已結束');
                loadDrillStatus();
                loadScenarios();
            }
        } catch (error) {
            console.error('Failed to stop drill:', getApiErrorMessage(error, '結束演練失敗'));
        }
    };

    const getEventTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            SOS: '🚨',
            REPORT: '📝',
            RESOURCE_REQUEST: '📦',
            COMMUNICATION_FAILURE: '📡',
            EVACUATION: '🏃',
            CUSTOM: '⚡',
        };
        return icons[type] || '📌';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            DRAFT: '#6b7280',
            ACTIVE: '#3b82f6',
            RUNNING: '#ef4444',
            COMPLETED: '#10b981',
        };
        return colors[status] || '#6b7280';
    };

    if (loading) {
        return <div className="drill-loading">載入演練資料...</div>;
    }

    return (
        <div className={`drill-center-page ${drillState?.isDrillMode ? 'drill-mode' : ''}`}>
            {/* 演練模式警告條 */}
            {drillState?.isDrillMode && (
                <div className="drill-mode-banner">
                    <span>🔴 演練模式進行中</span>
                    <button onClick={stopDrill}>結束演練</button>
                </div>
            )}

            <header className="drill-header">
                <h1>🎮 演練導播台</h1>
                <div className="header-actions">
                    <button className="create-btn" onClick={() => setShowEditor(true)}>
                        ➕ 建立腳本
                    </button>
                </div>
            </header>

            <div className="drill-content">
                {/* 腳本列表 */}
                <section className="scenarios-section">
                    <h2>演練腳本</h2>
                    <div className="scenarios-grid">
                        {scenarios.map(scenario => (
                            <div
                                key={scenario.id}
                                className={`scenario-card ${selectedScenario?.id === scenario.id ? 'selected' : ''}`}
                                onClick={() => setSelectedScenario(scenario)}
                            >
                                <div className="scenario-header">
                                    <h3>{scenario.title}</h3>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(scenario.status) }}
                                    >
                                        {scenario.status}
                                    </span>
                                </div>
                                <p>{scenario.description}</p>
                                <div className="scenario-meta">
                                    <span>⏱️ {scenario.events.length} 個事件</span>
                                    <span>⏳ {Math.max(...scenario.events.map(e => e.offsetMinutes))} 分鐘</span>
                                </div>
                                {!drillState?.isDrillMode && scenario.status !== 'RUNNING' && (
                                    <button
                                        className="start-btn"
                                        onClick={(e) => { e.stopPropagation(); startDrill(scenario.id); }}
                                    >
                                        ▶️ 開始演練
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 腳本詳情 */}
                {selectedScenario && (
                    <section className="scenario-detail">
                        <h2>📋 {selectedScenario.title}</h2>

                        {/* 事件時間軸 */}
                        <div className="events-timeline">
                            <h3>事件時間軸</h3>
                            <div className="timeline">
                                {selectedScenario.events.map((event, index) => (
                                    <div key={index} className="timeline-event">
                                        <div className="event-time">{event.time}</div>
                                        <div className="event-marker">
                                            {getEventTypeIcon(event.type)}
                                        </div>
                                        <div className="event-content">
                                            <strong>{event.type}</strong>
                                            <p>{event.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 演練結果 */}
                        {selectedScenario.result && (
                            <div className="drill-result">
                                <h3>📊 演練結果</h3>
                                <div className="result-grid">
                                    <div className="result-card">
                                        <span className="result-value">
                                            {selectedScenario.result.respondedEvents}/{selectedScenario.result.totalEvents}
                                        </span>
                                        <span className="result-label">回應率</span>
                                    </div>
                                    <div className="result-card">
                                        <span className="result-value">
                                            {Math.round(selectedScenario.result.averageResponseTime / 60)}m
                                        </span>
                                        <span className="result-label">平均回應時間</span>
                                    </div>
                                    <div className="result-card">
                                        <span className="result-value">
                                            {selectedScenario.result.resourceAllocationScore}%
                                        </span>
                                        <span className="result-label">資源分配分數</span>
                                    </div>
                                </div>
                                <div className="ai-recommendations">
                                    <h4>🤖 AI 改進建議</h4>
                                    <ul>
                                        {selectedScenario.result.aiRecommendations.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};

export default DrillCenterPage;
