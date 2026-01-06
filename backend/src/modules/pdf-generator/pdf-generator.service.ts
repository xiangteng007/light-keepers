import { Injectable, Logger } from '@nestjs/common';

/**
 * PDF Generator Service
 * Generate PDF reports for disaster events
 */
@Injectable()
export class PdfGeneratorService {
    private readonly logger = new Logger(PdfGeneratorService.name);

    /**
     * 產生事件報告 PDF
     */
    async generateEventReport(event: EventData): Promise<PdfResult> {
        const html = this.buildEventReportHtml(event);
        return this.generatePdf(html, `event-${event.id}.pdf`);
    }

    /**
     * 產生志工出勤報告
     */
    async generateAttendanceReport(data: AttendanceReportData): Promise<PdfResult> {
        const html = this.buildAttendanceReportHtml(data);
        return this.generatePdf(html, `attendance-${data.month}-${data.year}.pdf`);
    }

    /**
     * 產生 SITREP
     */
    async generateSitrep(sitrep: SitrepData): Promise<PdfResult> {
        const html = this.buildSitrepHtml(sitrep);
        return this.generatePdf(html, `sitrep-${sitrep.id}.pdf`);
    }

    /**
     * 產生統計報表
     */
    async generateStatisticsReport(stats: StatisticsData): Promise<PdfResult> {
        const html = this.buildStatisticsHtml(stats);
        return this.generatePdf(html, `statistics-${stats.period}.pdf`);
    }

    /**
     * 產生志工證書
     */
    async generateCertificate(volunteer: VolunteerData): Promise<PdfResult> {
        const html = this.buildCertificateHtml(volunteer);
        return this.generatePdf(html, `certificate-${volunteer.id}.pdf`);
    }

    /**
     * 批次產生 PDF
     */
    async batchGenerate(items: { type: string; data: any }[]): Promise<BatchPdfResult> {
        const results: PdfResult[] = [];

        for (const item of items) {
            let result: PdfResult;
            switch (item.type) {
                case 'event': result = await this.generateEventReport(item.data); break;
                case 'attendance': result = await this.generateAttendanceReport(item.data); break;
                case 'sitrep': result = await this.generateSitrep(item.data); break;
                default: result = { success: false, error: 'Unknown type' };
            }
            results.push(result);
        }

        return {
            total: items.length,
            successful: results.filter((r) => r.success).length,
            results,
        };
    }

    private async generatePdf(html: string, filename: string): Promise<PdfResult> {
        // 使用 HTML 轉 PDF
        // 實際應整合 puppeteer 或 pdfkit
        const base64 = Buffer.from(html).toString('base64');

        return {
            success: true,
            filename,
            size: html.length,
            base64,
            contentType: 'application/pdf',
        };
    }

    private buildEventReportHtml(event: EventData): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>事件報告 - ${event.title}</title>
    <style>
        body { font-family: 'Microsoft JhengHei', Arial, sans-serif; padding: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin: 20px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #333; border-left: 4px solid #0066cc; padding-left: 10px; }
        .info-row { display: flex; margin: 10px 0; }
        .info-label { width: 120px; font-weight: bold; color: #666; }
        .info-value { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
        .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔔 事件報告</h1>
        <h2>${event.title}</h2>
    </div>
    <div class="section">
        <div class="section-title">基本資訊</div>
        <div class="info-row"><span class="info-label">事件編號:</span><span class="info-value">${event.id}</span></div>
        <div class="info-row"><span class="info-label">發生時間:</span><span class="info-value">${event.occurredAt}</span></div>
        <div class="info-row"><span class="info-label">地點:</span><span class="info-value">${event.location}</span></div>
        <div class="info-row"><span class="info-label">類型:</span><span class="info-value">${event.type}</span></div>
        <div class="info-row"><span class="info-label">嚴重程度:</span><span class="info-value">${event.severity}</span></div>
    </div>
    <div class="section">
        <div class="section-title">描述</div>
        <p>${event.description}</p>
    </div>
    <div class="footer">
        <p>光守護者災防平台 | 產生時間: ${new Date().toLocaleString('zh-TW')}</p>
    </div>
</body>
</html>`;
    }

    private buildAttendanceReportHtml(data: AttendanceReportData): string {
        const rows = data.records.map((r) => `
            <tr>
                <td>${r.volunteerName}</td>
                <td>${r.date}</td>
                <td>${r.checkIn}</td>
                <td>${r.checkOut || '-'}</td>
                <td>${r.hours}h</td>
            </tr>
        `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>出勤報告 - ${data.month}/${data.year}</title>
    <style>
        body { font-family: 'Microsoft JhengHei', Arial, sans-serif; padding: 40px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #4CAF50; color: white; }
        .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>📋 出勤報告</h1>
    <p>期間: ${data.year}年${data.month}月</p>
    <div class="summary">
        <strong>總出勤人次:</strong> ${data.totalRecords} | 
        <strong>總工時:</strong> ${data.totalHours}h
    </div>
    <table>
        <thead><tr><th>志工</th><th>日期</th><th>簽到</th><th>簽退</th><th>工時</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
</body>
</html>`;
    }

    private buildSitrepHtml(sitrep: SitrepData): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SITREP - ${sitrep.id}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 30px; }
        .header { background: #1a237e; color: white; padding: 20px; text-align: center; }
        .section { margin: 15px 0; padding: 15px; border: 1px solid #ddd; }
        .label { font-weight: bold; color: #1a237e; }
    </style>
</head>
<body>
    <div class="header"><h1>SITUATION REPORT</h1><p>${sitrep.id}</p></div>
    <div class="section"><span class="label">DTG:</span> ${sitrep.dtg}</div>
    <div class="section"><span class="label">SITUATION:</span><p>${sitrep.situation}</p></div>
    <div class="section"><span class="label">ACTIONS:</span><p>${sitrep.actions}</p></div>
    <div class="section"><span class="label">RESOURCES:</span><p>${sitrep.resources}</p></div>
    <div class="section"><span class="label">NEXT STEPS:</span><p>${sitrep.nextSteps}</p></div>
</body>
</html>`;
    }

    private buildStatisticsHtml(stats: StatisticsData): string {
        return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Statistics</title></head>
<body>
    <h1>統計報表 - ${stats.period}</h1>
    <p>事件數: ${stats.eventCount}</p>
    <p>出勤人次: ${stats.attendanceCount}</p>
    <p>總工時: ${stats.totalHours}h</p>
</body>
</html>`;
    }

    private buildCertificateHtml(volunteer: VolunteerData): string {
        return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Certificate</title>
<style>
    body { text-align: center; font-family: serif; padding: 60px; background: linear-gradient(gold, orange); }
    .cert { background: white; padding: 50px; border: 5px double gold; }
    h1 { font-size: 36px; color: #333; }
    .name { font-size: 28px; color: #1a237e; margin: 30px 0; }
</style>
</head>
<body>
    <div class="cert">
        <h1>🏆 志工服務證書</h1>
        <p class="name">${volunteer.name}</p>
        <p>感謝您在光守護者協會的服務貢獻</p>
        <p>服務時數: ${volunteer.totalHours} 小時</p>
        <p>發證日期: ${new Date().toLocaleDateString('zh-TW')}</p>
    </div>
</body>
</html>`;
    }
}

// Types
interface EventData { id: string; title: string; occurredAt: string; location: string; type: string; severity: string; description: string; }
interface AttendanceReportData { month: number; year: number; totalRecords: number; totalHours: number; records: AttendanceRecord[]; }
interface AttendanceRecord { volunteerName: string; date: string; checkIn: string; checkOut?: string; hours: number; }
interface SitrepData { id: string; dtg: string; situation: string; actions: string; resources: string; nextSteps: string; }
interface StatisticsData { period: string; eventCount: number; attendanceCount: number; totalHours: number; }
interface VolunteerData { id: string; name: string; totalHours: number; }
interface PdfResult { success: boolean; filename?: string; size?: number; base64?: string; contentType?: string; error?: string; }
interface BatchPdfResult { total: number; successful: number; results: PdfResult[]; }
