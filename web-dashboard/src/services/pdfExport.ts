/**
 * PDF Report Generation Service
 * Generates PDF reports for field reports, SOS signals, and mission summaries
 * Uses jsPDF for client-side PDF generation
 */

// Note: Install jsPDF with: npm install jspdf

export interface PdfReportData {
    title: string;
    subtitle?: string;
    generatedAt: Date;
    sections: PdfSection[];
    footer?: string;
}

export interface PdfSection {
    title: string;
    type: 'text' | 'table' | 'stats';
    content: string | TableData | StatsData;
}

export interface TableData {
    headers: string[];
    rows: string[][];
}

export interface StatsData {
    items: { label: string; value: string | number }[];
}

/**
 * Generate PDF from report data
 * Returns a Blob that can be downloaded
 */
export async function generatePdfReport(data: PdfReportData): Promise<Blob> {
    // Dynamic import to support code-splitting
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Helper: Add new page if needed
    const checkNewPage = (requiredHeight: number) => {
        if (y + requiredHeight > 280) {
            doc.addPage();
            y = 20;
        }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, margin, y);
    y += 10;

    // Subtitle
    if (data.subtitle) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(data.subtitle, margin, y);
        y += 8;
    }

    // Generated date
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(`生成時間: ${data.generatedAt.toLocaleString('zh-TW')}`, margin, y);
    y += 12;

    // Reset text color
    doc.setTextColor(0);

    // Sections
    for (const section of data.sections) {
        checkNewPage(30);

        // Section title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, margin, y);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        if (section.type === 'text') {
            const text = section.content as string;
            const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
            checkNewPage(lines.length * 5);
            doc.text(lines, margin, y);
            y += lines.length * 5 + 5;
        }
        else if (section.type === 'stats') {
            const stats = section.content as StatsData;
            for (const item of stats.items) {
                checkNewPage(8);
                doc.setFont('helvetica', 'bold');
                doc.text(`${item.label}:`, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.text(String(item.value), margin + 50, y);
                y += 6;
            }
            y += 5;
        }
        else if (section.type === 'table') {
            const table = section.content as TableData;
            const colWidth = (pageWidth - margin * 2) / table.headers.length;

            // Headers
            checkNewPage(15);
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
            doc.setFont('helvetica', 'bold');
            table.headers.forEach((header, i) => {
                doc.text(header.substring(0, 12), margin + i * colWidth + 2, y);
            });
            y += 8;

            // Rows
            doc.setFont('helvetica', 'normal');
            for (const row of table.rows) {
                checkNewPage(8);
                row.forEach((cell, i) => {
                    const cellText = String(cell).substring(0, 15);
                    doc.text(cellText, margin + i * colWidth + 2, y);
                });
                y += 6;
            }
            y += 5;
        }
    }

    // Footer
    if (data.footer) {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128);
            doc.text(data.footer, margin, 290);
            doc.text(`第 ${i} / ${pageCount} 頁`, pageWidth - margin - 20, 290);
        }
    }

    return doc.output('blob');
}

/**
 * Download PDF blob as file
 */
export function downloadPdf(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate Field Reports PDF
 */
export async function generateFieldReportsPdf(
    reports: any[],
    missionSessionId: string,
    _dateRange?: { start: Date; end: Date }
): Promise<Blob> {
    const byType: Record<string, number> = {};
    const bySeverity: Record<number, number> = {};

    for (const r of reports) {
        byType[r.type] = (byType[r.type] || 0) + 1;
        bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
    }

    const data: PdfReportData = {
        title: '現場回報報表',
        subtitle: `任務 ID: ${missionSessionId.substring(0, 8)}...`,
        generatedAt: new Date(),
        footer: 'Light Keepers 防災平台',
        sections: [
            {
                title: '統計摘要',
                type: 'stats',
                content: {
                    items: [
                        { label: '總回報數', value: reports.length },
                        { label: '類型分佈', value: Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(', ') },
                        { label: '嚴重程度', value: Object.entries(bySeverity).map(([k, v]) => `Lv${k}: ${v}`).join(', ') },
                    ],
                },
            },
            {
                title: '回報明細',
                type: 'table',
                content: {
                    headers: ['類型', '嚴重度', '狀態', '回報人', '時間'],
                    rows: reports.slice(0, 50).map(r => [
                        r.type,
                        `Lv${r.severity}`,
                        r.status,
                        r.reporterName || '-',
                        new Date(r.createdAt).toLocaleString('zh-TW'),
                    ]),
                },
            },
        ],
    };

    return generatePdfReport(data);
}

/**
 * Generate SOS Signals PDF
 */
export async function generateSosPdf(
    signals: any[],
    missionSessionId: string
): Promise<Blob> {
    const byStatus: Record<string, number> = {};
    for (const s of signals) {
        byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }

    // Calculate avg response time
    const ackedSignals = signals.filter(s => s.ackedAt);
    let avgResponseMin = 0;
    if (ackedSignals.length > 0) {
        const totalMs = ackedSignals.reduce((sum, s) => {
            return sum + (new Date(s.ackedAt).getTime() - new Date(s.createdAt).getTime());
        }, 0);
        avgResponseMin = Math.round(totalMs / ackedSignals.length / 60000);
    }

    const data: PdfReportData = {
        title: 'SOS 求救信號報表',
        subtitle: `任務 ID: ${missionSessionId.substring(0, 8)}...`,
        generatedAt: new Date(),
        footer: 'Light Keepers 防災平台',
        sections: [
            {
                title: '統計摘要',
                type: 'stats',
                content: {
                    items: [
                        { label: '總 SOS 數', value: signals.length },
                        { label: '狀態分佈', value: Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ') },
                        { label: '平均回應時間', value: `${avgResponseMin} 分鐘` },
                    ],
                },
            },
            {
                title: 'SOS 明細',
                type: 'table',
                content: {
                    headers: ['求助者', '狀態', '發送時間', '確認時間', '確認者'],
                    rows: signals.map(s => [
                        s.userName,
                        s.status,
                        new Date(s.createdAt).toLocaleString('zh-TW'),
                        s.ackedAt ? new Date(s.ackedAt).toLocaleString('zh-TW') : '-',
                        s.ackedBy || '-',
                    ]),
                },
            },
        ],
    };

    return generatePdfReport(data);
}

/**
 * Generate Mission Summary PDF
 */
export async function generateMissionSummaryPdf(
    summary: {
        missionSessionId: string;
        fieldReports: { total: number; byType: Record<string, number>; byStatus: Record<string, number> };
        sosSignals: { total: number; byStatus: Record<string, number> };
    }
): Promise<Blob> {
    const data: PdfReportData = {
        title: '任務統計摘要',
        subtitle: `任務 ID: ${summary.missionSessionId.substring(0, 8)}...`,
        generatedAt: new Date(),
        footer: 'Light Keepers 防災平台',
        sections: [
            {
                title: '現場回報統計',
                type: 'stats',
                content: {
                    items: [
                        { label: '總回報數', value: summary.fieldReports.total },
                        { label: '類型分佈', value: Object.entries(summary.fieldReports.byType).map(([k, v]) => `${k}: ${v}`).join(', ') || '-' },
                        { label: '狀態分佈', value: Object.entries(summary.fieldReports.byStatus).map(([k, v]) => `${k}: ${v}`).join(', ') || '-' },
                    ],
                },
            },
            {
                title: 'SOS 信號統計',
                type: 'stats',
                content: {
                    items: [
                        { label: '總 SOS 數', value: summary.sosSignals.total },
                        { label: '狀態分佈', value: Object.entries(summary.sosSignals.byStatus).map(([k, v]) => `${k}: ${v}`).join(', ') || '-' },
                    ],
                },
            },
        ],
    };

    return generatePdfReport(data);
}
