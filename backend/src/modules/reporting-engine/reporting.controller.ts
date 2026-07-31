import { Controller, Get, Post, Put, Delete, Param, Query, Body, Res, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { ReportingEngineService } from './reporting-engine.service';
import { ReportFilter } from './services/report-builder.service';
import { ExportOptions } from './services/export.service';

// 定級理由：報表引擎可跨模組拉取任意資料並輸出成檔案，等同「通用資料匯出管道」，
// 報表定義本身即決定能撈到哪些欄位 → class 基準 L3（常務理事，對齊前台 /reports/export 的 L3 閘門）。
// 產生/匯出既有定義的報表屬日常營運 → 放寬 L2；
// 建立或修改報表定義、排程、範本＝變更匯出範圍與自動外送對象（財務/個資批次讀取的源頭）→ 維持 L3；
// 刪除排程為破壞性操作 → L4。
@ApiTags('Reports')
@Controller('reports')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.DIRECTOR)
export class ReportingController {
    constructor(private readonly reportingEngine: ReportingEngineService) {}

    // === Definitions ===

    @Get('definitions')
    @ApiOperation({ summary: '列出報表定義' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    listDefinitions() {
        return this.reportingEngine.listReportDefinitions();
    }

    @Get('definitions/:id')
    @ApiOperation({ summary: '取得報表定義' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getDefinition(@Param('id') id: string) {
        return this.reportingEngine.getReportDefinition(id);
    }

    @Post('definitions')
    @ApiOperation({ summary: '建立報表定義' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    createDefinition(@Body() data: any) {
        return this.reportingEngine.createReportDefinition(data);
    }

    // === Generation ===

    @Post('generate/:definitionId')
    @ApiOperation({ summary: '生成報表' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async generateReport(
        @Param('definitionId') definitionId: string,
        @Body() filters?: ReportFilter[]
    ) {
        return this.reportingEngine.generateReport(definitionId, filters);
    }

    @Get('generated')
    @ApiOperation({ summary: '列出已生成報表' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    listGeneratedReports() {
        return this.reportingEngine.listGeneratedReports();
    }

    @Get('generated/:id')
    @ApiOperation({ summary: '取得已生成報表' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getGeneratedReport(@Param('id') id: string) {
        return this.reportingEngine.getGeneratedReport(id);
    }

    // === Export ===

    @Post('export/:reportId')
    @ApiOperation({ summary: '匯出報表' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async exportReport(
        @Param('reportId') reportId: string,
        @Body() options: ExportOptions,
        @Res() res: Response
    ) {
        const result = await this.reportingEngine.exportReport(reportId, options);
        
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'Content-Length': result.size,
        });
        
        res.send(result.buffer);
    }

    @Post('generate-and-export/:definitionId')
    @ApiOperation({ summary: '生成並匯出報表' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async generateAndExport(
        @Param('definitionId') definitionId: string,
        @Body() body: { options: ExportOptions; filters?: ReportFilter[] },
        @Res() res: Response
    ) {
        const result = await this.reportingEngine.generateAndExport(
            definitionId,
            body.options,
            body.filters
        );
        
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'Content-Length': result.size,
        });
        
        res.send(result.buffer);
    }

    // === Schedules ===

    @Get('schedules')
    @ApiOperation({ summary: '列出排程' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    listSchedules() {
        return this.reportingEngine.listSchedules();
    }

    @Get('schedules/:id')
    @ApiOperation({ summary: '取得排程' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getSchedule(@Param('id') id: string) {
        return this.reportingEngine.getSchedule(id);
    }

    @Post('schedules')
    @ApiOperation({ summary: '建立排程' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    createSchedule(@Body() data: any) {
        return this.reportingEngine.createSchedule(data);
    }

    @Put('schedules/:id')
    @ApiOperation({ summary: '更新排程' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    updateSchedule(@Param('id') id: string, @Body() updates: any) {
        return this.reportingEngine.updateSchedule(id, updates);
    }

    @Delete('schedules/:id')
    @ApiOperation({ summary: '刪除排程' })
    @RequiredLevel(ROLE_LEVELS.CHAIRMAN)
    deleteSchedule(@Param('id') id: string) {
        return { deleted: this.reportingEngine.deleteSchedule(id) };
    }

    @Post('schedules/:id/trigger')
    @ApiOperation({ summary: '手動觸發排程' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async triggerSchedule(@Param('id') id: string) {
        return this.reportingEngine.triggerSchedule(id);
    }

    // === Templates ===

    @Get('templates')
    @ApiOperation({ summary: '列出範本' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    listTemplates() {
        return this.reportingEngine.listTemplates();
    }

    @Get('templates/:id')
    @ApiOperation({ summary: '取得範本' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    getTemplate(@Param('id') id: string) {
        return this.reportingEngine.getTemplate(id);
    }

    @Post('templates')
    @ApiOperation({ summary: '建立範本' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    createTemplate(@Body() data: any) {
        return this.reportingEngine.createTemplate(data);
    }

    @Post('templates/:id/render')
    @ApiOperation({ summary: '渲染範本' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    renderTemplate(@Param('id') id: string, @Body() variables: Record<string, any>) {
        return { content: this.reportingEngine.renderTemplate(id, variables) };
    }
}
