/**
 * Data Export Service
 * Export data to CSV and Excel formats
 */

export interface ExportColumn<T> {
    header: string;
    accessor: keyof T | ((item: T) => string | number);
}

export interface ExportOptions {
    filename: string;
    sheetName?: string;
}

/**
 * Export data to CSV format
 */
export function exportToCsv<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn<T>[],
    options: ExportOptions
): void {
    if (data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Create CSV header
    const headers = columns.map(col => `"${col.header}"`).join(',');

    // Create CSV rows
    const rows = data.map(item => {
        return columns.map(col => {
            const value = typeof col.accessor === 'function'
                ? col.accessor(item)
                : item[col.accessor];

            // Escape quotes and wrap in quotes
            const stringValue = String(value ?? '').replace(/"/g, '""');
            return `"${stringValue}"`;
        }).join(',');
    });

    // Combine header and rows
    const csv = [headers, ...rows].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });

    // Trigger download
    downloadBlob(blob, `${options.filename}.csv`);
}

/**
 * Export data to JSON format
 */
export function exportToJson<T>(
    data: T[],
    options: ExportOptions
): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `${options.filename}.json`);
}

/**
 * Generate an Excel-ready HTML table (can be opened in Excel)
 */
export function exportToExcelHtml<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn<T>[],
    options: ExportOptions
): void {
    if (data.length === 0) {
        console.warn('No data to export');
        return;
    }

    const sheetName = options.sheetName || 'Sheet1';

    // Create table HTML
    const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>${sheetName}</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5a623; color: white; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${escapeHtml(col.header)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            ${columns.map(col => {
        const value = typeof col.accessor === 'function'
            ? col.accessor(item)
            : item[col.accessor];
        return `<td>${escapeHtml(String(value ?? ''))}</td>`;
    }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    downloadBlob(blob, `${options.filename}.xls`);
}

/**
 * Export chart as PNG image
 */
export async function exportChartAsPng(
    svgElement: SVGElement,
    filename: string,
    width = 800,
    height = 600
): Promise<void> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error('Canvas context not available');
        return;
    }

    // Convert SVG to data URL
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Fill white background
            ctx.fillStyle = '#21262d';
            ctx.fillRect(0, 0, width, height);

            // Draw SVG
            ctx.drawImage(img, 0, 0, width, height);

            // Cleanup
            URL.revokeObjectURL(svgUrl);

            // Export as PNG
            canvas.toBlob(blob => {
                if (blob) {
                    downloadBlob(blob, `${filename}.png`);
                    resolve();
                } else {
                    reject(new Error('Failed to create PNG blob'));
                }
            }, 'image/png');
        };
        img.onerror = reject;
        img.src = svgUrl;
    });
}

// ==================== Helpers ====================

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Pre-built Export Functions ====================

export const fieldReportColumns = [
    { header: 'ID', accessor: 'id' as const },
    { header: '類型', accessor: 'type' as const },
    { header: '嚴重度', accessor: 'severity' as const },
    { header: '狀態', accessor: 'status' as const },
    { header: '描述', accessor: 'description' as const },
    { header: '回報人', accessor: (item: any) => item.reporterName || item.reporterId },
    { header: '經度', accessor: (item: any) => item.location?.lng || item.longitude },
    { header: '緯度', accessor: (item: any) => item.location?.lat || item.latitude },
    { header: '回報時間', accessor: (item: any) => new Date(item.createdAt).toLocaleString('zh-TW') },
];

export const sosSignalColumns = [
    { header: 'ID', accessor: 'id' as const },
    { header: '狀態', accessor: 'status' as const },
    { header: '訊息', accessor: 'message' as const },
    { header: '發送者', accessor: (item: any) => item.senderName || item.senderId },
    { header: '經度', accessor: (item: any) => item.location?.lng || item.longitude },
    { header: '緯度', accessor: (item: any) => item.location?.lat || item.latitude },
    { header: '發送時間', accessor: (item: any) => new Date(item.createdAt).toLocaleString('zh-TW') },
    { header: '確認時間', accessor: (item: any) => item.acknowledgedAt ? new Date(item.acknowledgedAt).toLocaleString('zh-TW') : '-' },
];

export const taskColumns = [
    { header: 'ID', accessor: 'id' as const },
    { header: '標題', accessor: 'title' as const },
    { header: '優先級', accessor: 'priority' as const },
    { header: '狀態', accessor: 'status' as const },
    { header: '指派給', accessor: (item: any) => item.assigneeName || item.assigneeId || '未指派' },
    { header: '描述', accessor: 'description' as const },
    { header: '建立時間', accessor: (item: any) => new Date(item.createdAt).toLocaleString('zh-TW') },
    { header: '截止時間', accessor: (item: any) => item.dueDate ? new Date(item.dueDate).toLocaleString('zh-TW') : '-' },
];

export default {
    exportToCsv,
    exportToJson,
    exportToExcelHtml,
    exportChartAsPng,
    fieldReportColumns,
    sosSignalColumns,
    taskColumns,
};
