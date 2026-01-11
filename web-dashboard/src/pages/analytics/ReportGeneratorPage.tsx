/**
 * ReportGeneratorPage.tsx
 * 
 * Analytics Domain - 報表產生器頁面
 * 提供報表生成、匯出、排程功能
 */
import React, { useState } from 'react';
import {
    FileText, Download, Calendar, Clock, BarChart2,
    PieChart, TrendingUp, Filter, Play, Settings
} from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import './ReportGeneratorPage.css';

const REPORT_TEMPLATES = [
    { id: '1', name: '事件摘要報告', description: '所有事件的統計摘要與趨勢分析', icon: BarChart2, category: 'incident' },
    { id: '2', name: '資源消耗報告', description: '物資使用與庫存變動追蹤', icon: PieChart, category: 'resource' },
    { id: '3', name: '人員績效報告', description: '志工任務完成率與時數統計', icon: TrendingUp, category: 'personnel' },
    { id: '4', name: '社區狀態報告', description: '受災戶、收容所、重建進度', icon: FileText, category: 'community' },
];

const RECENT_REPORTS = [
    { id: '1', name: '2026年1月週報', template: '事件摘要報告', generatedAt: '2026/01/10 14:30', status: 'completed' },
    { id: '2', name: '資源月報 - 12月', template: '資源消耗報告', generatedAt: '2026/01/01 09:00', status: 'completed' },
    { id: '3', name: '績效季報 Q4', template: '人員績效報告', generatedAt: '2026/01/05 16:45', status: 'pending' },
];

export default function ReportGeneratorPage() {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    return (
        <PageTemplate
            title="報表產生器"
            subtitle="生成、匯出與排程各類統計報表"
            icon={FileText}
            domain="Analytics 分析報表"
        >
            <div className="report-generator">
                {/* Report Templates */}
                <section className="templates-section">
                    <h3>報表模板</h3>
                    <div className="templates-grid">
                        {REPORT_TEMPLATES.map(template => {
                            const Icon = template.icon;
                            return (
                                <div
                                    key={template.id}
                                    className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedTemplate(template.id)}
                                >
                                    <div className="template-icon">
                                        <Icon size={24} />
                                    </div>
                                    <div className="template-info">
                                        <h4>{template.name}</h4>
                                        <p>{template.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Configuration Panel */}
                <section className="config-section">
                    <h3><Settings size={18} /> 報表設定</h3>
                    <div className="config-form">
                        <div className="form-group">
                            <label>報表名稱</label>
                            <input type="text" placeholder="輸入報表名稱..." />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label><Calendar size={14} /> 開始日期</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label><Calendar size={14} /> 結束日期</label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label><Filter size={14} /> 資料篩選</label>
                            <select>
                                <option>全部資料</option>
                                <option>僅重大事件</option>
                                <option>僅本區域</option>
                            </select>
                        </div>
                        <div className="form-actions">
                            <button className="btn-generate" disabled={!selectedTemplate}>
                                <Play size={16} />
                                產生報表
                            </button>
                            <button className="btn-schedule">
                                <Clock size={16} />
                                設定排程
                            </button>
                        </div>
                    </div>
                </section>

                {/* Recent Reports */}
                <section className="recent-section">
                    <h3>近期報表</h3>
                    <div className="reports-list">
                        {RECENT_REPORTS.map(report => (
                            <div key={report.id} className="report-item">
                                <FileText size={18} className="report-icon" />
                                <div className="report-info">
                                    <span className="report-name">{report.name}</span>
                                    <span className="report-meta">{report.template} · {report.generatedAt}</span>
                                </div>
                                <span className={`report-status ${report.status}`}>
                                    {report.status === 'completed' ? '已完成' : '處理中'}
                                </span>
                                <button className="btn-download">
                                    <Download size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </PageTemplate>
    );
}
