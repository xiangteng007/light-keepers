import { useState } from 'react';
import { TeamsIcon, WarningIcon, DownloadIcon, ReportIcon, AnalyticsIcon } from '../design-system/icons';
import { Card, Button, Badge, InputField } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import {
    getVolunteerHoursReport,
    downloadVolunteerHoursCSV,
    getDisasterReport,
    downloadDisasterJSON
} from '../api/services';
import type { VolunteerHoursReport, DisasterReport } from '../api/services';
import './ReportsExportPage.css';

// PDF 匯出功能（動態載入 jsPDF — 減少初次載入 ~600KB）
const exportVolunteerPDF = async (data: VolunteerHoursReport[], dateRange: { start: string; end: string }) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    // 標題
    doc.setFontSize(18);
    doc.text('Light Keepers - Volunteer Hours Report', 14, 22);

    doc.setFontSize(11);
    doc.text(`Report Period: ${dateRange.start} to ${dateRange.end}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 38);

    // 表格
    autoTable(doc, {
        startY: 45,
        head: [['Volunteer Name', 'Total Hours', 'Task Count']],
        body: data.map(row => [
            row.volunteerName,
            `${row.totalHours} hrs`,
            row.taskCount.toString()
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save('volunteer-hours-report.pdf');
};

const exportDisasterPDF = async (data: DisasterReport, dateRange: { start: string; end: string }) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    // 標題
    doc.setFontSize(18);
    doc.text('Light Keepers - Disaster Statistics Report', 14, 22);

    doc.setFontSize(11);
    doc.text(`Report Period: ${dateRange.start} to ${dateRange.end}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 38);

    // 統計摘要
    doc.setFontSize(14);
    doc.text('Summary', 14, 52);
    doc.setFontSize(11);
    doc.text(`Total Events: ${data.totalEvents}`, 14, 60);
    doc.text(`Average Response Time: ${data.responseTimeAvg || 0} minutes`, 14, 66);

    // 類型分布表格
    if (data.byType) {
        autoTable(doc, {
            startY: 75,
            head: [['Event Type', 'Count']],
            body: Object.entries(data.byType).map(([type, count]) => [type, count.toString()]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [239, 68, 68] },
        });
    }

    doc.save('disaster-statistics-report.pdf');
};

export default function ReportsExportPage() {
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const [volunteerReport, setVolunteerReport] = useState<VolunteerHoursReport[] | null>(null);
    const [disasterReport, setDisasterReport] = useState<DisasterReport | null>(null);
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // 載入志工時數報表
    const loadVolunteerReport = async () => {
        setIsLoading('volunteer');
        try {
            const response = await getVolunteerHoursReport(dateRange.start, dateRange.end);
            setVolunteerReport(response.data.data);
        } catch (err) {
            console.error('Failed to load volunteer report:', err);
            alert('載入志工時數報表失敗');
        } finally {
            setIsLoading(null);
        }
    };

    // 載入災情統計報表
    const loadDisasterReport = async () => {
        setIsLoading('disaster');
        try {
            const response = await getDisasterReport(dateRange.start, dateRange.end);
            setDisasterReport(response.data.data);
        } catch (err) {
            console.error('Failed to load disaster report:', err);
            alert('載入災情統計報表失敗');
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="page reports-export-page">
            <header className="page-header">
                <div className="page-header__left">
                    <h1>報表匯出</h1>
                    <p className="page-subtitle">下載統計報表與資料分析</p>
                </div>
            </header>

            {/* 篩選工具列：資料範圍 */}
            <section className="panel toolbar-panel" aria-labelledby="date-range-heading">
                <h2 id="date-range-heading" className="panel-title">資料範圍</h2>
                <div className="date-range-inputs">
                    <InputField
                        type="date"
                        label="開始日期"
                        value={dateRange.start}
                        onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                    <InputField
                        type="date"
                        label="結束日期"
                        value={dateRange.end}
                        onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                </div>
            </section>

            {/* 報表選項 */}
            <div className="reports-grid">
                {/* 志工時數報表 */}
                <Card className="report-option" padding="lg">
                    <div className="report-option__icon" aria-hidden="true"><TeamsIcon size={32} /></div>
                    <h3>志工時數報表</h3>
                    <p>統計志工服務時數與任務數量</p>
                    <div className="report-option__actions">
                        <Button
                            variant="secondary"
                            icon={<AnalyticsIcon size={16} aria-hidden="true" />}
                            onClick={loadVolunteerReport}
                            loading={isLoading === 'volunteer'}
                        >
                            預覽
                        </Button>
                        <Button
                            icon={<DownloadIcon size={16} aria-hidden="true" />}
                            onClick={() => downloadVolunteerHoursCSV(dateRange.start, dateRange.end)}
                        >
                            CSV
                        </Button>
                        <Button
                            variant="secondary"
                            icon={<ReportIcon size={16} aria-hidden="true" />}
                            onClick={() => volunteerReport && exportVolunteerPDF(volunteerReport, dateRange)}
                            disabled={!volunteerReport}
                        >
                            PDF
                        </Button>
                    </div>
                </Card>

                {/* 災情統計報表 */}
                <Card className="report-option" padding="lg">
                    <div className="report-option__icon" aria-hidden="true"><WarningIcon size={32} /></div>
                    <h3>災情統計報表</h3>
                    <p>災害類型分布與響應時間分析</p>
                    <div className="report-option__actions">
                        <Button
                            variant="secondary"
                            icon={<AnalyticsIcon size={16} aria-hidden="true" />}
                            onClick={loadDisasterReport}
                            loading={isLoading === 'disaster'}
                        >
                            預覽
                        </Button>
                        <Button
                            icon={<DownloadIcon size={16} aria-hidden="true" />}
                            onClick={() => downloadDisasterJSON(dateRange.start, dateRange.end)}
                        >
                            JSON
                        </Button>
                        <Button
                            variant="secondary"
                            icon={<ReportIcon size={16} aria-hidden="true" />}
                            onClick={() => disasterReport && exportDisasterPDF(disasterReport, dateRange)}
                            disabled={!disasterReport}
                        >
                            PDF
                        </Button>
                    </div>
                </Card>
            </div>

            {/* 預覽區 */}
            {volunteerReport && (
                <Card className="preview-card" padding="lg">
                    <div className="preview-card__header">
                        <h3>志工時數報表預覽</h3>
                        <Badge variant="info">{volunteerReport.length} 筆資料</Badge>
                    </div>
                    {volunteerReport.length === 0 ? (
                        <EmptyState variant="minimal" title="此區間沒有志工時數資料" />
                    ) : (
                        <>
                            <div className="preview-table-wrap">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>志工姓名</th>
                                            <th>總時數</th>
                                            <th>任務數</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {volunteerReport.slice(0, 10).map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.volunteerName}</td>
                                                <td className="tabular-num">{row.totalHours} 小時</td>
                                                <td className="tabular-num">{row.taskCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {volunteerReport.length > 10 && (
                                <p className="preview-note">顯示前 10 筆，共 {volunteerReport.length} 筆</p>
                            )}
                        </>
                    )}
                </Card>
            )}

            {disasterReport && (
                <Card className="preview-card" padding="lg">
                    <h3>災情統計報表預覽</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">總事件數</span>
                            <span className="stat-value">{disasterReport.totalEvents}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">平均響應時間</span>
                            <span className="stat-value">{disasterReport.responseTimeAvg || 0} 分鐘</span>
                        </div>
                    </div>
                    {disasterReport.byType && (
                        <div className="chart-section">
                            <h4>按類型分布</h4>
                            <div className="bar-chart">
                                {Object.entries(disasterReport.byType).map(([type, count]) => (
                                    <div key={type} className="bar-item">
                                        <span className="bar-label">{type}</span>
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill"
                                                style={{
                                                    width: `${Math.min((count / disasterReport.totalEvents) * 100, 100)}%`
                                                }}
                                            />
                                        </div>
                                        <span className="bar-value tabular-num">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
