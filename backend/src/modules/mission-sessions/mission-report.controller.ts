/**
 * Mission Report Controller
 * Phase 7: 報表匯出 API
 */

import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { MissionReportService } from './mission-report.service';

// 定級理由：任務報表把整場任務的人員、時序、決策與受助對象資料打包成可離線攜出的檔案
// （PDF/CSV/完整 JSON 資料包），屬「作戰資料批次匯出」，一旦下載即脫離系統控管 → 全端點 L2（幹部）。
// 六個端點皆為同一資料的不同輸出格式，風險相同，故直接以 class 級統一定級，不另做 handler 覆寫。
@ApiTags('任務報表')
@Controller('mission-reports')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
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
