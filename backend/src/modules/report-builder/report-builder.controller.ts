import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportBuilderService } from './report-builder.service';

@ApiTags('Report Builder API')
@ApiBearerAuth()
@Controller('report-builder')
export class ReportBuilderController {
    constructor(private readonly service: ReportBuilderService) { }

    @Get('templates')
    @ApiOperation({ summary: '取得所有報表模板' })
    getTemplates() {
        return this.service.getTemplates();
    }

    @Get('templates/:id')
    @ApiOperation({ summary: '取得單一報表模板' })
    getTemplate(@Param('id') id: string) {
        return this.service.getTemplate(id);
    }

    @Post('templates')
    @ApiOperation({ summary: '建立報表模板' })
    createTemplate(@Body() data: any) {
        return this.service.createTemplate(data);
    }

    @Patch('templates/:id')
    @ApiOperation({ summary: '更新報表模板' })
    updateTemplate(@Param('id') id: string, @Body() updates: any) {
        return this.service.updateTemplate(id, updates);
    }

    @Delete('templates/:id')
    @ApiOperation({ summary: '刪除報表模板' })
    deleteTemplate(@Param('id') id: string) {
        return { deleted: this.service.deleteTemplate(id) };
    }

    @Post('generate/:templateId')
    @ApiOperation({ summary: '產生報表' })
    generateReport(@Param('templateId') templateId: string, @Body() filters: Record<string, any>) {
        return this.service.generateReport(templateId, filters);
    }

    @Get('scheduled')
    @ApiOperation({ summary: '取得排程報表列表' })
    getScheduledReports() {
        return this.service.getScheduledReports();
    }

    @Post('scheduled')
    @ApiOperation({ summary: '建立排程報表' })
    scheduleReport(@Body() data: any) {
        return this.service.scheduleReport(data);
    }

    @Patch('scheduled/:id/toggle')
    @ApiOperation({ summary: '啟用/停用排程報表' })
    toggleScheduledReport(@Param('id') id: string, @Body('enabled') enabled: boolean) {
        return { success: this.service.toggleScheduledReport(id, enabled) };
    }

    @Delete('scheduled/:id')
    @ApiOperation({ summary: '刪除排程報表' })
    deleteScheduledReport(@Param('id') id: string) {
        return { deleted: this.service.deleteScheduledReport(id) };
    }
}
