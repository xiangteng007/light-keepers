/**
 * ReportGeneratorPage.tsx
 *
 * Analytics Domain - 報表產生器頁面
 * 提供報表生成、匯出、排程功能
 */
import { useState } from 'react';
import {
    FileText, Download, Calendar, Clock, BarChart2,
    PieChart, TrendingUp, Filter, Play, Settings
} from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import { Button, Badge, InputField } from '../../design-system';
import './ReportGeneratorPage.css';

const REPORT_TEMPLATES = [
    { id: '1', name: '事件摘要報告', description: '所有事件的統計摘要與趨勢分析', icon: BarChart2, category: 'incident' },
    { id: '2', name: '資源消耗報告', description: '物資使用與庫存變動追蹤', icon: PieChart, category: 'resource' },
    { id: '3', name: '人員績效報告', description: '志工任務完成率與時數統計', icon: TrendingUp, category: 'personnel' },
    { id: '4', name: '社區狀態報告', description: '受災戶、收容所、重建進度', icon: FileText, category: 'community' },
];

const RECENT_REPORTS = [
    { id: '1', name: '2026年1月週報', template: '事件摘要報告', generatedAt: '2026/01/10 14:30', status: 'completed' as const },
    { id: '2', name: '資源月報 - 12月', template: '資源消耗報告', generatedAt: '2026/01/01 09:00', status: 'completed' as const },
    { id: '3', name: '績效季報 Q4', template: '人員績效報告', generatedAt: '2026/01/05 16:45', status: 'pending' as const },
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
                <section className="rg-panel">
                    <h2 className="rg-panel__title">報表模板</h2>
                    <div className="templates-grid" role="group" aria-label="選擇報表模板">
                        {REPORT_TEMPLATES.map(template => {
                            const Icon = template.icon;
                            const selected = selectedTemplate === template.id;
                            return (
                                <button
                                    key={template.id}
                                    type="button"
                                    className={`template-card ${selected ? 'template-card--selected' : ''}`}
                                    aria-pressed={selected}
                                    onClick={() => setSelectedTemplate(template.id)}
                                >
                                    <span className="template-icon" aria-hidden="true">
                                        <Icon size={24} />
                                    </span>
                                    <span className="template-info">
                                        <span className="template-info__name">{template.name}</span>
                                        <span className="template-info__desc">{template.description}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Configuration Panel */}
                <section className="rg-panel">
                    <h2 className="rg-panel__title">
                        <Settings size={18} aria-hidden="true" /> 報表設定
                    </h2>
                    <div className="config-form">
                        <InputField label="報表名稱" placeholder="輸入報表名稱…" fullWidth />
                        <div className="form-row">
                            <InputField
                                label="開始日期"
                                type="date"
                                prefix={<Calendar size={14} aria-hidden="true" />}
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                fullWidth
                            />
                            <InputField
                                label="結束日期"
                                type="date"
                                prefix={<Calendar size={14} aria-hidden="true" />}
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                fullWidth
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-group__label" htmlFor="rg-filter">
                                <Filter size={14} aria-hidden="true" /> 資料篩選
                            </label>
                            <select id="rg-filter" className="rg-select">
                                <option>全部資料</option>
                                <option>僅重大事件</option>
                                <option>僅本區域</option>
                            </select>
                        </div>
                        <div className="form-actions">
                            <Button
                                icon={<Play size={16} aria-hidden="true" />}
                                disabled={!selectedTemplate}
                            >
                                產生報表
                            </Button>
                            <Button variant="secondary" icon={<Clock size={16} aria-hidden="true" />}>
                                設定排程
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Recent Reports */}
                <section className="rg-panel">
                    <h2 className="rg-panel__title">近期報表</h2>
                    <ul className="reports-list" role="list">
                        {RECENT_REPORTS.map(report => (
                            <li key={report.id} className="report-item">
                                <FileText size={18} className="report-icon" aria-hidden="true" />
                                <div className="report-info">
                                    <span className="report-name">{report.name}</span>
                                    <span className="report-meta tabular-nums">{report.template} · {report.generatedAt}</span>
                                </div>
                                {report.status === 'completed' ? (
                                    <Badge variant="success" dot>已完成</Badge>
                                ) : (
                                    <Badge variant="warning" dot pulse>處理中</Badge>
                                )}
                                <button type="button" className="btn-download" aria-label={`下載 ${report.name}`}>
                                    <Download size={16} aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </PageTemplate>
    );
}
