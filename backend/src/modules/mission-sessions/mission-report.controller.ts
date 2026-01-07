/**
 * Mission Report Controller
 * Phase 7: 報表匯出 API
 */

import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { MissionReportService } from './mission-report.service';

@ApiTags('任務報表')
@Controller('mission-reports')
export class MissionReportController {
    constructor(private readonly reportService: MissionReportService) { }

    @Get(':sessionId/pdf')
    @ApiOperation({ summary: '產生任務 PDF 報告' })
    @ApiResponse({ status: 200, description: 'PDF 報告 (base64)' })
    @ApiBearerAuth()
    async generatePdfReport(@Param('sessionId') sessionId: string) {
        return this.reportService.generatePdfReport(sessionId);
    }

    @Get(':sessionId/csv')
    @ApiOperation({ summary: '匯出任務 CSV' })
    @ApiResponse({ status: 200, description: 'CSV 資料 (base64)' })
    @ApiBearerAuth()
    async generateCsvReport(@Param('sessionId') sessionId: string) {
        return this.reportService.generateCsvReport(sessionId);
    }

    @Get(':sessionId/json')
    @ApiOperation({ summary: '匯出完整 JSON 資料包' })
    @ApiResponse({ status: 200, description: 'JSON 資料' })
    @ApiBearerAuth()
    async generateJsonPackage(@Param('sessionId') sessionId: string) {
        return this.reportService.generateJsonPackage(sessionId);
    }

    @Get(':sessionId/download/pdf')
    @ApiOperation({ summary: '下載 PDF 報告檔案' })
    @ApiResponse({ status: 200, description: 'PDF 檔案' })
    @ApiBearerAuth()
    async downloadPdf(@Param('sessionId') sessionId: string, @Res() res: Response) {
        const result = await this.reportService.generatePdfReport(sessionId);

        if (!result.success || !result.base64) {
            res.status(404).json({ error: result.error || 'Report generation failed' });
            return;
        }

        const buffer = Buffer.from(result.base64, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(buffer);
    }

    @Get(':sessionId/download/csv')
    @ApiOperation({ summary: '下載 CSV 檔案' })
    @ApiResponse({ status: 200, description: 'CSV 檔案' })
    @ApiBearerAuth()
    async downloadCsv(@Param('sessionId') sessionId: string, @Res() res: Response) {
        const result = await this.reportService.generateCsvReport(sessionId);

        if (!result.success || !result.base64) {
            res.status(404).json({ error: result.error || 'Report generation failed' });
            return;
        }

        const buffer = Buffer.from(result.base64, 'base64');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(buffer);
    }

    @Get(':sessionId/download/json')
    @ApiOperation({ summary: '下載 JSON 資料包' })
    @ApiResponse({ status: 200, description: 'JSON 檔案' })
    @ApiBearerAuth()
    async downloadJson(@Param('sessionId') sessionId: string, @Res() res: Response) {
        const result = await this.reportService.generateJsonPackage(sessionId);

        if (!result.success || !result.base64) {
            res.status(404).json({ error: result.error || 'Report generation failed' });
            return;
        }

        const buffer = Buffer.from(result.base64, 'base64');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(buffer);
    }
}
