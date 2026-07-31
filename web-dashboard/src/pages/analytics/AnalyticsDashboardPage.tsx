/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * Analytics Dashboard Page
 * AI-powered analytics and insights visualization
 */

import React, { useState, useEffect } from 'react';
import './AnalyticsDashboardPage.css';

interface RiskPrediction {
    area: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: string[];
    confidence: number;
}

interface TrendAnalysis {
    metric: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}

interface Anomaly {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: string;
}

const AnalyticsDashboardPage: React.FC = () => {
    const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
    const [trends, setTrends] = useState<TrendAnalysis[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'predictions' | 'trends' | 'anomalies'>('predictions');

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    const loadAnalyticsData = async () => {
        try {
            const [predRes, trendRes, anomalyRes] = await Promise.all([
                fetch('/api/analytics/predictions'),
                fetch('/api/analytics/trends'),
                fetch('/api/analytics/anomalies'),
            ]);

            if (predRes.ok) {
                const data = await predRes.json();
                setPredictions(data.data || []);
            }

            if (trendRes.ok) {
                const data = await trendRes.json();
                setTrends(data.data || []);
            }

            if (anomalyRes.ok) {
                const data = await anomalyRes.json();
                setAnomalies(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        const colors: Record<string, string> = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444',
            critical: '#dc2626',
        };
        return colors[level] || '#6b7280';
    };

    const getTrendIcon = (trend: string) => {
        if (trend === 'increasing') return '📈';
        if (trend === 'decreasing') return '📉';
        return '➡️';
    };

    const getMetricLabel = (metric: string) => {
        const labels: Record<string, string> = {
            incidents: '事件報告',
            sosSignals: 'SOS 信號',
            taskCompletion: '任務完成率',
        };
        return labels[metric] || metric;
    };

    if (loading) {
        return <div className="analytics-loading">載入分析資料中...</div>;
    }

    return (
        <div className="analytics-dashboard-page">
            <header className="analytics-header">
                <h1>🤖 AI 分析儀表板</h1>
                <p>智慧預測與異常檢測</p>
                <button className="refresh-btn" onClick={loadAnalyticsData}>
                    🔄 重新分析
                </button>
            </header>

            <div className="analytics-tabs">
                <button
                    className={activeTab === 'predictions' ? 'active' : ''}
                    onClick={() => setActiveTab('predictions')}
                >
                    🎯 風險預測
                </button>
                <button
                    className={activeTab === 'trends' ? 'active' : ''}
                    onClick={() => setActiveTab('trends')}
                >
                    📊 趨勢分析
                </button>
                <button
                    className={activeTab === 'anomalies' ? 'active' : ''}
                    onClick={() => setActiveTab('anomalies')}
                >
                    ⚠️ 異常檢測
                </button>
            </div>

            <div className="analytics-content">
                {activeTab === 'predictions' && (
                    <div className="predictions-panel">
                        <h2>高風險區域預測</h2>
                        {predictions.length === 0 ? (
                            <div className="empty-state">
                                <span>✅</span>
                                <p>目前無高風險區域</p>
                            </div>
                        ) : (
                            <div className="predictions-grid">
                                {predictions.map((pred, index) => (
                                    <div
                                        key={index}
                                        className="prediction-card"
                                        style={{ borderLeftColor: getRiskColor(pred.riskLevel) }}
                                    >
                                        <div className="prediction-header">
                                            <h3>{pred.area}</h3>
                                            <span
                                                className="risk-badge"
                                                style={{ backgroundColor: getRiskColor(pred.riskLevel) }}
                                            >
                                                {pred.riskLevel.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="risk-score">
                                            <div
                                                className="score-bar"
                                                style={{ width: `${pred.riskScore}%`, backgroundColor: getRiskColor(pred.riskLevel) }}
                                            />
                                            <span>{pred.riskScore}%</span>
                                        </div>
                                        <div className="prediction-factors">
                                            <strong>風險因素：</strong>
                                            {pred.factors.map((f, i) => (
                                                <span key={i} className="factor-tag">{f}</span>
                                            ))}
                                        </div>
                                        <div className="confidence">
                                            信心度：{(pred.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trends' && (
                    <div className="trends-panel">
                        <h2>關鍵指標趨勢</h2>
                        <div className="trends-grid">
                            {trends.map((trend, index) => (
                                <div key={index} className="trend-card">
                                    <div className="trend-header">
                                        <span className="trend-icon">{getTrendIcon(trend.trend)}</span>
                                        <h3>{getMetricLabel(trend.metric)}</h3>
                                    </div>
                                    <div className="trend-values">
                                        <span className="current-value">{trend.currentValue}</span>
                                        <span className={`change ${trend.trend}`}>
                                            {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                                        </span>
                                    </div>
                                    <div className="trend-comparison">
                                        前期：{trend.previousValue}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'anomalies' && (
                    <div className="anomalies-panel">
                        <h2>異常檢測結果</h2>
                        {anomalies.length === 0 ? (
                            <div className="empty-state">
                                <span>✅</span>
                                <p>未檢測到異常</p>
                            </div>
                        ) : (
                            <div className="anomalies-list">
                                {anomalies.map(anomaly => (
                                    <div
                                        key={anomaly.id}
                                        className={`anomaly-item severity-${anomaly.severity}`}
                                    >
                                        <div className="anomaly-icon">⚠️</div>
                                        <div className="anomaly-content">
                                            <div className="anomaly-header">
                                                <span className={`severity-badge ${anomaly.severity}`}>
                                                    {anomaly.severity.toUpperCase()}
                                                </span>
                                                <span className="anomaly-type">{anomaly.type}</span>
                                            </div>
                                            <p>{anomaly.description}</p>
                                            <span className="anomaly-time">
                                                {new Date(anomaly.detectedAt).toLocaleString('zh-TW')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboardPage;
