/**
 * Donor Reporting Controller
 * 
 * REST API for donor reporting and grant management
 */
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { DonorReportingService, Grant, FundingType, GrantStatus } from './donor-reporting.service';

@ApiTags('Donor Reporting')
@Controller('api/v1/donors')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
// P0 授權定級：補助款/捐贈財務資料。查詢類與既有 donations controller 對齊（L2 幹部）；
// 建立補助案、登錄支出、登錄成效指標、產生捐助方報告屬財務異動與對外文件 → L3 常務理事。
// （若協會實務上由幹部登帳、理事僅覆核，此處的 L3 需 owner 確認後調整。）
@RequiredLevel(ROLE_LEVELS.OFFICER)
@ApiBearerAuth()
export class DonorReportingController {
    constructor(private readonly donorService: DonorReportingService) { }

    // ========== Dashboard ==========

    @Get('overview')
    @ApiOperation({ summary: 'Get funding overview dashboard' })
    async getFundingOverview() {
        return this.donorService.getFundingOverview();
    }

    @Get('deadlines')
    @ApiOperation({ summary: 'Get upcoming report deadlines' })
    async getUpcomingDeadlines(@Query('days') days?: string) {
        return this.donorService.getUpcomingReportDeadlines(
            days ? parseInt(days) : 30
        );
    }

    // ========== Grants ==========

    @Get('grants')
    @ApiOperation({ summary: 'Get active grants' })
    async getActiveGrants() {
        return this.donorService.getActiveGrants();
    }

    @Get('grants/:grantId')
    @ApiOperation({ summary: 'Get grant details' })
    async getGrant(@Param('grantId') grantId: string) {
        return this.donorService.getGrant(grantId);
    }

    @Post('grants')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 財務：建立補助案
    @ApiOperation({ summary: 'Create a new grant' })
    async createGrant(
        @Body() body: {
            donorName: string;
            donorType: FundingType;
            grantCode: string;
            title: string;
            description: string;
            amount: number;
            currency: string;
            startDate: string;
            endDate: string;
            reportingFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
            contactPerson: string;
            projectIds?: string[];
        }
    ) {
        return this.donorService.createGrant({
            ...body,
            status: GrantStatus.ACTIVE,
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            projectIds: body.projectIds || [],
        });
    }

    // ========== Expenditures ==========

    @Get('grants/:grantId/expenditures')
    @ApiOperation({ summary: 'Get expenditures for a grant' })
    async getGrantExpenditures(@Param('grantId') grantId: string) {
        return this.donorService.getGrantExpenditures(grantId);
    }

    @Get('grants/:grantId/budget')
    @ApiOperation({ summary: 'Get budget utilization for a grant' })
    async getBudgetUtilization(@Param('grantId') grantId: string) {
        return this.donorService.getBudgetUtilization(grantId);
    }

    @Post('grants/:grantId/expenditures')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 財務：登錄支出
    @ApiOperation({ summary: 'Record expenditure against a grant' })
    async recordExpenditure(
        @Param('grantId') grantId: string,
        @Body() body: {
            category: string;
            description: string;
            amount: number;
            currency: string;
            approvedBy?: string;
        }
    ) {
        return this.donorService.recordExpenditure(
            grantId,
            body.category,
            body.description,
            body.amount,
            body.currency,
            body.approvedBy
        );
    }

    // ========== Impact Metrics ==========

    @Get('grants/:grantId/metrics')
    @ApiOperation({ summary: 'Get impact metrics for a grant' })
    async getGrantMetrics(@Param('grantId') grantId: string) {
        return this.donorService.getGrantMetrics(grantId);
    }

    @Post('grants/:grantId/metrics')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 財務：登錄對捐助方申報的成效指標
    @ApiOperation({ summary: 'Record impact metric' })
    async recordImpactMetric(
        @Param('grantId') grantId: string,
        @Body() body: {
            metricName: string;
            targetValue: number;
            actualValue: number;
            unit: string;
            periodStart: string;
            periodEnd: string;
            notes?: string;
        }
    ) {
        return this.donorService.recordImpactMetric(
            grantId,
            body.metricName,
            body.targetValue,
            body.actualValue,
            body.unit,
            new Date(body.periodStart),
            new Date(body.periodEnd),
            body.notes
        );
    }

    // ========== Reports ==========

    @Post('grants/:grantId/reports')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 財務：產生對外的捐助方報告
    @ApiOperation({ summary: 'Generate donor report' })
    async generateReport(
        @Param('grantId') grantId: string,
        @Body() body: {
            reportType: 'narrative' | 'financial' | 'combined';
            periodStart: string;
            periodEnd: string;
            executiveSummary?: string;
        }
    ) {
        return this.donorService.generateReport(
            grantId,
            body.reportType,
            new Date(body.periodStart),
            new Date(body.periodEnd),
            body.executiveSummary
        );
    }
}
