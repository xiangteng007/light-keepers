import { Controller, Get, Post, Put, Delete, Param, Query, Body, Res, Header, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportingEngineService } from './reporting-engine.service';
import { ReportFilter } from './services/report-builder.service';
import { ExportOptions } from './services/export.service';
import {
    CreateReportDefinitionDto,
    CreateReportScheduleDto,
    CreateReportTemplateDto,
    UpdateReportScheduleDto,
    findInvalidTemplateVariableKeys,
} from './dto/reporting.dto';

@ApiTags('Reports')
@Controller('reports')
export class ReportingController {
    constructor(private readonly reportingEngine: ReportingEngineService) {}

    // === Definitions ===

    @Get('definitions')
    @ApiOperation({ summary: '列出報表定義' })
    listDefinitions() {
        return this.reportingEngine.listReportDefinitions();
    }

    @Get('definitions/:id')
    @ApiOperation({ summary: '取得報表定義' })
    getDefinition(@Param('id') id: string) {
        return this.reportingEngine.getReportDefinition(id);
    }

    @Post('definitions')
    @ApiOperation({ summary: '建立報表定義' })
    createDefinition(@Body() data: CreateReportDefinitionDto) {
        return this.reportingEngine.createReportDefinition(data);
    }

    // === Generation ===

    @Post('generate/:definitionId')
    @ApiOperation({ summary: '生成報表' })
    async generateReport(
        @Param('definitionId') definitionId: string,
        @Body() filters?: ReportFilter[]
    ) {
        return this.reportingEngine.generateReport(definitionId, filters);
    }

    @Get('generated')
    @ApiOperation({ summary: '列出已生成報表' })
    listGeneratedReports() {
        return this.reportingEngine.listGeneratedReports();
    }

    @Get('generated/:id')
    @ApiOperation({ summary: '取得已生成報表' })
    getGeneratedReport(@Param('id') id: string) {
        return this.reportingEngine.getGeneratedReport(id);
    }

    // === Export ===

    @Post('export/:reportId')
    @ApiOperation({ summary: '匯出報表' })
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
    listSchedules() {
        return this.reportingEngine.listSchedules();
    }

    @Get('schedules/:id')
    @ApiOperation({ summary: '取得排程' })
    getSchedule(@Param('id') id: string) {
        return this.reportingEngine.getSchedule(id);
    }

    @Post('schedules')
    @ApiOperation({ summary: '建立排程' })
    createSchedule(@Body() data: CreateReportScheduleDto) {
        return this.reportingEngine.createSchedule(data);
    }

    @Put('schedules/:id')
    @ApiOperation({ summary: '更新排程' })
    updateSchedule(@Param('id') id: string, @Body() updates: UpdateReportScheduleDto) {
        return this.reportingEngine.updateSchedule(id, updates);
    }

    @Delete('schedules/:id')
    @ApiOperation({ summary: '刪除排程' })
    deleteSchedule(@Param('id') id: string) {
        return { deleted: this.reportingEngine.deleteSchedule(id) };
    }

    @Post('schedules/:id/trigger')
    @ApiOperation({ summary: '手動觸發排程' })
    async triggerSchedule(@Param('id') id: string) {
        return this.reportingEngine.triggerSchedule(id);
    }

    // === Templates ===

    @Get('templates')
    @ApiOperation({ summary: '列出範本' })
    listTemplates() {
        return this.reportingEngine.listTemplates();
    }

    @Get('templates/:id')
    @ApiOperation({ summary: '取得範本' })
    getTemplate(@Param('id') id: string) {
        return this.reportingEngine.getTemplate(id);
    }

    @Post('templates')
    @ApiOperation({ summary: '建立範本' })
    createTemplate(@Body() data: CreateReportTemplateDto) {
        return this.reportingEngine.createTemplate(data);
    }

    @Post('templates/:id/render')
    @ApiOperation({ summary: '渲染範本' })
    // `variables` 的鍵由各範本自行宣告，屬真正的動態結構，無法 DTO 化；
    // 但鍵名會被 TemplateService.render() 直接組進 RegExp，故在入口限制格式。
    renderTemplate(@Param('id') id: string, @Body() variables: Record<string, unknown>) {
        const invalidKeys = findInvalidTemplateVariableKeys(variables);
        if (invalidKeys.length > 0) {
            throw new BadRequestException(
                `範本變數名稱僅允許英數與底線，不合法的鍵：${invalidKeys.join(', ')}`,
            );
        }
        return { content: this.reportingEngine.renderTemplate(id, variables) };
    }
}
