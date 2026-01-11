/**
 * AISummaryPage.tsx
 * 
 * AI 彙整頁面 - Analytics Domain
 * 功能：自動災情摘要、趨勢分析、預測報告
 */
import { useState } from 'react';
import { Brain, TrendingUp, FileText, RefreshCw, Download, Clock, Zap, BarChart3 } from 'lucide-react';
import './AISummaryPage.css';

const MOCK_SUMMARIES = [
    {
        id: 1,
        title: '每日災情彙整報告',
        generatedAt: '2026-01-12 06:00',
        type: 'daily',
        summary: '過去24小時共接獲15件災情通報，其中3件為高優先級。主要集中於信義區（6件）和大安區（4件）。水災相關通報佔60%，建議加強排水系統巡查。',
        keyMetrics: { incidents: 15, volunteers: 45, resolved: 12 },
        confidence: 94
    },
    {
        id: 2,
        title: '資源調度建議',
        generatedAt: '2026-01-12 05:30',
        type: 'recommendation',
        summary: '根據過去7天數據分析，建議將內湖倉庫20%的飲用水調撥至信義區避難所。預計未來48小時信義區需求將增加25%。',
        keyMetrics: { resources: 150, matches: 12, efficiency: 88 },
        confidence: 87
    },
    {
        id: 3,
        title: '志工動員效率分析',
        generatedAt: '2026-01-12 04:00',
        type: 'analysis',
        summary: '本週志工平均響應時間為23分鐘，較上週改善15%。A組表現最佳（平均18分鐘），建議將其調度策略推廣至其他組別。',
        keyMetrics: { avgResponse: 23, improvement: 15, topTeam: 'A組' },
        confidence: 91
    }
];

const TREND_DATA = [
    { label: '事件數量', trend: 'down', value: -12, prediction: '預計持續下降' },
    { label: '響應時間', trend: 'down', value: -15, prediction: '效率持續改善' },
    { label: '資源需求', trend: 'up', value: 8, prediction: '需增加備品' },
    { label: '志工出勤', trend: 'stable', value: 2, prediction: '維持穩定' },
];

export default function AISummaryPage() {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 2000);
    };

    return (
        <div className="ai-summary-page">
            <header className="ai-header">
                <div className="header-left">
                    <Brain size={28} className="ai-icon" />
                    <div>
                        <h1>AI 智慧彙整</h1>
                        <p>自動生成災情摘要與趨勢預測</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-generate" onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? <RefreshCw size={16} className="spinning" /> : <Zap size={16} />}
                        {isGenerating ? '生成中...' : '生成新報告'}
                    </button>
                    <button className="btn-export">
                        <Download size={16} />
                        匯出
                    </button>
                </div>
            </header>

            <div className="ai-content">
                <section className="trends-section">
                    <h2><TrendingUp size={18} /> 趨勢預測</h2>
                    <div className="trends-grid">
                        {TREND_DATA.map((item, idx) => (
                            <div key={idx} className={`trend-card ${item.trend}`}>
                                <div className="trend-label">{item.label}</div>
                                <div className="trend-value">
                                    {item.trend === 'up' && '↑'}
                                    {item.trend === 'down' && '↓'}
                                    {item.trend === 'stable' && '→'}
                                    {Math.abs(item.value)}%
                                </div>
                                <div className="trend-prediction">{item.prediction}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="summaries-section">
                    <h2><FileText size={18} /> AI 生成報告</h2>
                    <div className="summaries-list">
                        {MOCK_SUMMARIES.map(report => (
                            <div key={report.id} className="summary-card">
                                <div className="summary-header">
                                    <span className={`type-badge ${report.type}`}>
                                        {report.type === 'daily' && '每日報告'}
                                        {report.type === 'recommendation' && '建議'}
                                        {report.type === 'analysis' && '分析'}
                                    </span>
                                    <span className="timestamp">
                                        <Clock size={12} /> {report.generatedAt}
                                    </span>
                                </div>
                                <h3>{report.title}</h3>
                                <p className="summary-text">{report.summary}</p>
                                <div className="summary-metrics">
                                    {Object.entries(report.keyMetrics).map(([key, val]) => (
                                        <div key={key} className="metric">
                                            <span className="metric-label">{key}</span>
                                            <span className="metric-value">{val}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="summary-footer">
                                    <div className="confidence">
                                        <BarChart3 size={14} />
                                        信心度: {report.confidence}%
                                    </div>
                                    <button className="btn-detail">查看詳情</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
