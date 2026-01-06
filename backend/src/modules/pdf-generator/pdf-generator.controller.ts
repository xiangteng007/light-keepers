import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfGeneratorService } from './pdf-generator.service';

@ApiTags('PDF 產生')
@Controller('pdf')
export class PdfGeneratorController {
    constructor(private readonly service: PdfGeneratorService) { }

    @Post('event-report')
    @ApiOperation({ summary: '產生事件報告 PDF' })
    @ApiResponse({ status: 200, description: 'PDF 資料 (base64)' })
    @ApiBearerAuth()
    async generateEventReport(@Body() event: any) {
        return this.service.generateEventReport(event);
    }

    @Post('attendance-report')
    @ApiOperation({ summary: '產生出勤報告 PDF' })
    @ApiResponse({ status: 200, description: 'PDF 資料 (base64)' })
    @ApiBearerAuth()
    async generateAttendanceReport(@Body() data: any) {
        return this.service.generateAttendanceReport(data);
    }

    @Post('sitrep')
    @ApiOperation({ summary: '產生 SITREP PDF' })
    @ApiResponse({ status: 200, description: 'PDF 資料 (base64)' })
    @ApiBearerAuth()
    async generateSitrep(@Body() sitrep: any) {
        return this.service.generateSitrep(sitrep);
    }

    @Post('statistics')
    @ApiOperation({ summary: '產生統計報表 PDF' })
    @ApiResponse({ status: 200, description: 'PDF 資料 (base64)' })
    @ApiBearerAuth()
    async generateStatisticsReport(@Body() stats: any) {
        return this.service.generateStatisticsReport(stats);
    }

    @Post('certificate/:volunteerId')
    @ApiOperation({ summary: '產生志工證書 PDF' })
    @ApiResponse({ status: 200, description: 'PDF 資料 (base64)' })
    @ApiBearerAuth()
    async generateCertificate(@Param('volunteerId') volunteerId: string, @Body() volunteer: any) {
        return this.service.generateCertificate({ id: volunteerId, ...volunteer });
    }

    @Post('batch')
    @ApiOperation({ summary: '批次產生 PDF' })
    @ApiResponse({ status: 200, description: '批次結果' })
    @ApiBearerAuth()
    async batchGenerate(@Body() items: { type: string; data: any }[]) {
        return this.service.batchGenerate(items);
    }
}
