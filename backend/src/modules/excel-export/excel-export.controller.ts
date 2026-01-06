import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ExcelExportService } from './excel-export.service';

@ApiTags('Excel 匯出')
@Controller('excel')
export class ExcelExportController {
    constructor(private readonly service: ExcelExportService) { }

    @Post('events')
    @ApiOperation({ summary: '匯出事件列表' })
    @ApiResponse({ status: 200, description: 'Excel 資料 (base64)' })
    @ApiBearerAuth()
    async exportEvents(@Body() events: any[]) {
        return this.service.exportEvents(events);
    }

    @Post('volunteers')
    @ApiOperation({ summary: '匯出志工列表' })
    @ApiResponse({ status: 200, description: 'Excel 資料 (base64)' })
    @ApiBearerAuth()
    async exportVolunteers(@Body() volunteers: any[]) {
        return this.service.exportVolunteers(volunteers);
    }

    @Post('attendance')
    @ApiOperation({ summary: '匯出出勤記錄' })
    @ApiResponse({ status: 200, description: 'Excel 資料 (base64)' })
    @ApiBearerAuth()
    async exportAttendance(@Body() records: any[]) {
        return this.service.exportAttendance(records);
    }

    @Post('payroll')
    @ApiOperation({ summary: '匯出補助明細' })
    @ApiResponse({ status: 200, description: 'Excel 資料 (base64)' })
    @ApiBearerAuth()
    async exportPayroll(@Body() payrolls: any[]) {
        return this.service.exportPayroll(payrolls);
    }

    @Post('statistics')
    @ApiOperation({ summary: '匯出統計資料 (多工作表)' })
    @ApiResponse({ status: 200, description: 'Excel 資料 (base64)' })
    @ApiBearerAuth()
    async exportStatistics(@Body() stats: any[]) {
        return this.service.exportStatistics(stats);
    }

    @Post('custom')
    @ApiOperation({ summary: '匯出自訂查詢' })
    @ApiResponse({ status: 200, description: 'Excel 資料 (base64)' })
    @ApiBearerAuth()
    async exportCustomQuery(@Body() query: { filename: string; headers: string[]; rows: any[][] }) {
        return this.service.exportCustomQuery(query);
    }

    @Post('csv')
    @ApiOperation({ summary: '產生 CSV' })
    @ApiResponse({ status: 200, description: 'CSV 字串' })
    @ApiBearerAuth()
    generateCsv(@Body() body: { headers: string[]; rows: any[][] }) {
        return { csv: this.service.generateCsv(body.headers, body.rows) };
    }
}
