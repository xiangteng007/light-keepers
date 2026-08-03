import React, { useState } from 'react';
import { FilesIcon, AiIcon } from '../../design-system/icons';
import type { FieldReport, SosSignal } from '../../services/fieldReportsApi';
import type { ReportSummaryOutput } from '../../services/aiQueueApi';
import { AiResultCard } from './AiResultCard';
import './ReportsPanel.css';

interface AiJobState {
    entityId: string;
    status: string;
}

interface AiResultState {
    entityId: string;
    output: ReportSummaryOutput;
    isFallback: boolean;
}

interface ReportsPanelProps {
    reports: FieldReport[];
    activeSos: SosSignal[];
    onSelectReport: (report: FieldReport) => void;
    onTriageReport: (reportId: string, status: string, version: number) => void;
    onAckSos: (sosId: string) => void;
    onResolveSos: (sosId: string, note?: string) => void;
    isLoading?: boolean;
    // AI integration props
    pendingAiJobs?: Map<string, AiJobState>;
    aiResults?: Map<string, AiResultState>;
    onAiSummarize?: (reportId: string) => void;
    onAiAccept?: (reportId: string) => void;
    onAiReject?: (reportId: string) => void;
    onAiDismiss?: (reportId: string) => void;
}

const SEVERITY_COLORS = ['#4ade80', '#facc15', '#fb923c', '#ef4444', '#dc2626'];
const SEVERITY_LABELS = ['低', '中', '高', '危急', '嚴重'];

const STATUS_LABELS: Record<string, string> = {
    new: '新回報',
    triaged: '已分類',
    task_created: '已建立任務',
    assigned: '已指派',
    in_progress: '處理中',
    closed: '已結案',
    cancelled: '已取消',
};

const TYPE_LABELS: Record<string, string> = {
    incident: '事件',
    resource: '資源',
    medical: '醫療',
    traffic: '交通',
    sos: 'SOS',
    other: '其他',
};

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
    reports,
    activeSos,
    onSelectReport,
    onTriageReport,
    onAckSos,
    onResolveSos,
    isLoading,
    pendingAiJobs,
    aiResults,
    onAiSummarize,
    onAiAccept,
    onAiReject,
    onAiDismiss,
}) => {
    const [filter, setFilter] = useState<{
        type: string;
        status: string;
        severity: string;
    }>({ type: '', status: '', severity: '' });

    const filteredReports = reports.filter(r => {
        if (filter.type && r.type !== filter.type) return false;
        if (filter.status && r.status !== filter.status) return false;
        if (filter.severity && r.severity.toString() !== filter.severity) return false;
        return true;
    });

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '剛剛';
        if (diffMins < 60) return `${diffMins}分鐘前`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小時前`;
        return date.toLocaleDateString('zh-TW');
    };

    return (
        <div className="reports-panel">
            {/* Active SOS Section */}
            {activeSos.length > 0 && (
                <div className="sos-alerts">
                    <h3 className="sos-alerts-title">
                        <span className="sos-pulse" />即時 SOS 警報 ({activeSos.length})
                    </h3>
                    {activeSos.map(sos => (
                        <div key={sos.id} className="sos-alert-card">
                            <div className="sos-alert-header">
                                <span className="sos-user">{sos.userName}</span>
                                <span className="sos-time">{formatTime(sos.createdAt)}</span>
                            </div>
                            <div className="sos-alert-status">
                                狀態: {sos.status === 'active' ? '等待回應' : '已確認'}
                            </div>
                            <div className="sos-alert-actions">
                                {sos.status === 'active' && (
                                    <button
                                        className="btn-ack"
                                        onClick={() => onAckSos(sos.id)}
                                    >
                                        確認 ACK
                                    </button>
                                )}
                                <button
                                    className="btn-resolve"
                                    onClick={() => onResolveSos(sos.id)}
                                >
                                    解除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="reports-filters">
                <select
                    value={filter.type}
                    onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
                >
                    <option value="">所有類型</option>
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>
                <select
                    value={filter.status}
                    onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                >
                    <option value="">所有狀態</option>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>
                <select
                    value={filter.severity}
                    onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}
                >
                    <option value="">所有嚴重度</option>
                    {SEVERITY_LABELS.map((label, i) => (
                        <option key={i} value={i}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Reports List */}
            <div className="reports-list">
                {isLoading && <div className="loading">載入中...</div>}
                {filteredReports.map(report => (
                    <div
                        key={report.id}
                        className={`report-card severity-${report.severity}`}
                        onClick={() => onSelectReport(report)}
                    >
                        <div className="report-header">
                            <span
                                className="severity-badge"
                                style={{ backgroundColor: SEVERITY_COLORS[report.severity] }}
                            >
                                {SEVERITY_LABELS[report.severity]}
                            </span>
                            <span className="report-type">{TYPE_LABELS[report.type]}</span>
                            <span className="report-time">{formatTime(report.occurredAt)}</span>
                        </div>
                        <div className="report-content">
                            <p className="report-message">{report.message || '(無描述)'}</p>
                            <div className="report-meta">
                                <span>回報者: {report.reporterName}</span>
                                {report.attachmentsCount > 0 && (
                                    <span><FilesIcon size={16} aria-hidden="true" /> {report.attachmentsCount}</span>
                                )}
                            </div>
                        </div>
                        <div className="report-footer">
                            <span className={`status-badge status-${report.status}`}>
                                {STATUS_LABELS[report.status]}
                            </span>
                            {report.status === 'new' && (
                                <div className="triage-actions">
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            onTriageReport(report.id, 'triaged', report.version);
                                        }}
                                    >
                                        分類
                                    </button>
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            onTriageReport(report.id, 'task_created', report.version);
                                        }}
                                    >
                                        建立任務
                                    </button>
                                </div>
                            )}
                            {/* AI Summarize Button */}
                            {onAiSummarize && (
                                <button
                                    className="btn-ai-summarize"
                                    onClick={e => {
                                        e.stopPropagation();
                                        onAiSummarize(report.id);
                                    }}
                                    disabled={pendingAiJobs?.has(report.id)}
                                >
                                    {pendingAiJobs?.has(report.id) ? (
                                        <>
                                            <span className="ai-spinner" />
                                            分析中...
                                        </>
                                    ) : (
                                        <><AiIcon size={16} aria-hidden="true" /> AI 分析</>
                                    )}
                                </button>
                            )}
                        </div>
                        {/* AI Result Card */}
                        {aiResults?.has(report.id) && onAiAccept && onAiReject && onAiDismiss && (
                            <AiResultCard
                                result={aiResults.get(report.id)!.output}
                                isFallback={aiResults.get(report.id)!.isFallback}
                                onAccept={() => onAiAccept(report.id)}
                                onReject={() => onAiReject(report.id)}
                                onDismiss={() => onAiDismiss(report.id)}
                            />
                        )}
                    </div>
                ))}
                {filteredReports.length === 0 && !isLoading && (
                    <div className="no-reports">目前沒有符合條件的回報</div>
                )}
            </div>
        </div>
    );
};

export default ReportsPanel;
