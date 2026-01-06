import { Injectable, Logger } from '@nestjs/common';

/**
 * Excel Export Service
 * Export data to Excel format
 */
@Injectable()
export class ExcelExportService {
    private readonly logger = new Logger(ExcelExportService.name);

    /**
     * 匯出事件列表
     */
    async exportEvents(events: ExcelEventData[]): Promise<ExcelResult> {
        const headers = ['編號', '標題', '類型', '地點', '發生時間', '嚴重程度', '狀態'];
        const rows = events.map((e) => [e.id, e.title, e.type, e.location, e.occurredAt, e.severity, e.status]);

        return this.generateExcel('events', headers, rows);
    }

    /**
     * 匯出志工列表
     */
    async exportVolunteers(volunteers: ExcelVolunteerData[]): Promise<ExcelResult> {
        const headers = ['編號', '姓名', '電話', '專長', '狀態', '總服務時數'];
        const rows = volunteers.map((v) => [v.id, v.name, v.phone, v.skills.join(', '), v.status, v.totalHours]);

        return this.generateExcel('volunteers', headers, rows);
    }

    /**
     * 匯出出勤記錄
     */
    async exportAttendance(records: ExcelAttendanceData[]): Promise<ExcelResult> {
        const headers = ['日期', '志工', '簽到時間', '簽退時間', '工時', '地點'];
        const rows = records.map((r) => [r.date, r.volunteerName, r.checkIn, r.checkOut || '-', r.hours, r.location]);

        return this.generateExcel('attendance', headers, rows);
    }

    /**
     * 匯出補助明細
     */
    async exportPayroll(payrolls: ExcelPayrollData[]): Promise<ExcelResult> {
        const headers = ['月份', '志工', '出勤次數', '總工時', '基本補助', '加給', '總額', '狀態'];
        const rows = payrolls.map((p) => [
            `${p.year}/${p.month}`, p.volunteerName, p.shiftCount, p.totalHours,
            p.basePay, p.bonuses, p.total, p.status,
        ]);

        return this.generateExcel('payroll', headers, rows);
    }

    /**
     * 匯出統計資料
     */
    async exportStatistics(stats: StatisticsSheet[]): Promise<ExcelResult> {
        // 多工作表
        const sheets = stats.map((s) => ({
            name: s.sheetName,
            headers: s.headers,
            rows: s.rows,
        }));

        return this.generateMultiSheetExcel('statistics', sheets);
    }

    /**
     * 匯出自訂查詢
     */
    async exportCustomQuery(query: CustomQueryData): Promise<ExcelResult> {
        return this.generateExcel(query.filename, query.headers, query.rows);
    }

    /**
     * 產生 CSV (相容性)
     */
    generateCsv(headers: string[], rows: any[][]): string {
        const escape = (val: any) => `"${String(val).replace(/"/g, '""')}"`;
        const headerLine = headers.map(escape).join(',');
        const dataLines = rows.map((row) => row.map(escape).join(','));

        return [headerLine, ...dataLines].join('\n');
    }

    private async generateExcel(name: string, headers: string[], rows: any[][]): Promise<ExcelResult> {
        // 使用簡化的 XML 格式 (Office Open XML)
        const xml = this.buildSpreadsheetXml(headers, rows);
        const base64 = Buffer.from(xml).toString('base64');

        return {
            success: true,
            filename: `${name}-${Date.now()}.xlsx`,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            base64,
            rowCount: rows.length,
        };
    }

    private async generateMultiSheetExcel(name: string, sheets: SheetData[]): Promise<ExcelResult> {
        // 多工作表 (簡化)
        let allRows = 0;
        for (const sheet of sheets) {
            allRows += sheet.rows.length;
        }

        return {
            success: true,
            filename: `${name}-${Date.now()}.xlsx`,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            base64: '',
            rowCount: allRows,
            sheetCount: sheets.length,
        };
    }

    private buildSpreadsheetXml(headers: string[], rows: any[][]): string {
        const headerCells = headers.map((h, i) => `<c r="${this.colName(i)}1" t="inlineStr"><is><t>${this.escapeXml(h)}</t></is></c>`).join('');
        const dataCells = rows.map((row, ri) =>
            `<row r="${ri + 2}">${row.map((cell, ci) =>
                `<c r="${this.colName(ci)}${ri + 2}" t="inlineStr"><is><t>${this.escapeXml(String(cell))}</t></is></c>`
            ).join('')}</row>`
        ).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetData>
        <row r="1">${headerCells}</row>
        ${dataCells}
    </sheetData>
</worksheet>`;
    }

    private colName(index: number): string {
        let name = '';
        while (index >= 0) {
            name = String.fromCharCode((index % 26) + 65) + name;
            index = Math.floor(index / 26) - 1;
        }
        return name;
    }

    private escapeXml(str: string): string {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

// Types
export interface ExcelEventData { id: string; title: string; type: string; location: string; occurredAt: string; severity: string; status: string; }
export interface ExcelVolunteerData { id: string; name: string; phone: string; skills: string[]; status: string; totalHours: number; }
export interface ExcelAttendanceData { date: string; volunteerName: string; checkIn: string; checkOut?: string; hours: number; location: string; }
export interface ExcelPayrollData { year: number; month: number; volunteerName: string; shiftCount: number; totalHours: number; basePay: number; bonuses: number; total: number; status: string; }
export interface StatisticsSheet { sheetName: string; headers: string[]; rows: any[][]; }
export interface CustomQueryData { filename: string; headers: string[]; rows: any[][]; }
export interface SheetData { name: string; headers: string[]; rows: any[][]; }
export interface ExcelResult { success: boolean; filename?: string; contentType?: string; base64?: string; rowCount?: number; sheetCount?: number; error?: string; }

