/**
 * Reports Controller
 * REST API for report generation
 */

import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ReportGeneratorService, ReportConfig } from './report-generator.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('reports')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class ReportsController {
    constructor(private reportService: ReportGeneratorService) { }

    /**
     * Generate daily report
     */
    @Get('daily')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getDailyReport() {
        const report = await this.reportService.generateDailySummary();
        return { success: true, data: report };
    }

    /**
     * Generate weekly report
     */
    @Get('weekly')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getWeeklyReport() {
        const report = await this.reportService.generateWeeklySummary();
        return { success: true, data: report };
    }

    /**
     * Generate custom report
     */
    @Post('generate')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async generateReport(
        @Query('type') type: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('sections') sections?: string
    ) {
        const config: ReportConfig = {
            type,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            sections: sections ? sections.split(',') : undefined,
        };

        const report = await this.reportService.generateReport(config);
        return { success: true, data: report };
    }
}
