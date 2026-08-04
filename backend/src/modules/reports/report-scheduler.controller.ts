/**
 * Report Scheduler Controller
 * 
 * API endpoints for managing scheduled reports
 * v1.0
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportSchedulerService, ScheduledReport } from './services/report-scheduler.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { CreateScheduledReportDto } from './dto/scheduled-report.dto';

@ApiTags('Report Scheduler')
@Controller('reports/scheduler')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
// P0 授權定級：與同模組的 reports/advanced 對齊，類別預設 L2（幹部）。
// 排程本身會「自動把報表寄給 recipients 名單」＝可持續外送資料的組態，
// 因此新增／修改／刪除排程提高到 L3；啟用/停用/立即執行維持 L2。
@RequiredLevel(ROLE_LEVELS.OFFICER)
@ApiBearerAuth()
export class ReportSchedulerController {
    constructor(private readonly schedulerService: ReportSchedulerService) { }

    @Get()
    @ApiOperation({ summary: 'Get all scheduled reports' })
    getScheduledReports() {
        return {
            success: true,
            data: this.schedulerService.getScheduledReports(),
        };
    }

    @Get('history')
    @ApiOperation({ summary: 'Get report generation history' })
    getHistory(@Query('limit') limit?: number) {
        return {
            success: true,
            data: this.schedulerService.getReportHistory(limit),
        };
    }

    // 注意：':id' 萬用路由必須排在 'history' 等具名路由之後，否則會把它們吃掉
    @Get(':id')
    @ApiOperation({ summary: 'Get scheduled report by ID' })
    getScheduledReport(@Param('id') id: string) {
        const report = this.schedulerService.getScheduledReport(id);
        if (!report) {
            return {
                success: false,
                message: 'Report not found',
            };
        }
        return {
            success: true,
            data: report,
        };
    }

    @Post()
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 組態：新增自動外寄的報表排程
    @ApiOperation({ summary: 'Create a new scheduled report' })
    createScheduledReport(@Body() body: CreateScheduledReportDto) {
        const report: ScheduledReport = {
            id: `report-${Date.now()}`,
            name: body.name,
            type: body.type || 'custom',
            schedule: body.schedule,
            recipients: body.recipients,
            format: body.format || 'pdf',
            filters: body.filters,
            enabled: true,
            createdBy: 'user', // Would come from JWT
            createdAt: new Date(),
        };

        this.schedulerService.addScheduledReport(report);

        return {
            success: true,
            data: report,
        };
    }

    @Put(':id')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 組態：變更排程（含收件人名單）
    @ApiOperation({ summary: 'Update a scheduled report' })
    updateScheduledReport(
        @Param('id') id: string,
        @Body() updates: Partial<ScheduledReport>
    ) {
        const report = this.schedulerService.updateScheduledReport(id, updates);
        if (!report) {
            return {
                success: false,
                message: 'Report not found',
            };
        }
        return {
            success: true,
            data: report,
        };
    }

    @Delete(':id')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 組態：刪除排程
    @ApiOperation({ summary: 'Delete a scheduled report' })
    deleteScheduledReport(@Param('id') id: string) {
        const deleted = this.schedulerService.deleteScheduledReport(id);
        return {
            success: deleted,
            message: deleted ? 'Report deleted' : 'Report not found',
        };
    }

    @Post(':id/enable')
    @ApiOperation({ summary: 'Enable a scheduled report' })
    enableReport(@Param('id') id: string) {
        const success = this.schedulerService.setReportEnabled(id, true);
        return {
            success,
            message: success ? 'Report enabled' : 'Report not found',
        };
    }

    @Post(':id/disable')
    @ApiOperation({ summary: 'Disable a scheduled report' })
    disableReport(@Param('id') id: string) {
        const success = this.schedulerService.setReportEnabled(id, false);
        return {
            success,
            message: success ? 'Report disabled' : 'Report not found',
        };
    }

    @Post(':id/run')
    @ApiOperation({ summary: 'Run a scheduled report immediately' })
    async runReport(@Param('id') id: string) {
        const result = await this.schedulerService.generateReport(id);
        return {
            success: result.status === 'success',
            data: result,
        };
    }
}
