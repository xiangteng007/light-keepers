/**
 * Donor Reporting Controller
 * 
 * REST API for donor reporting and grant management
 */
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DonorReportingService, Grant, FundingType, GrantStatus } from './donor-reporting.service';

@ApiTags('Donor Reporting')
@Controller('api/v1/donors')
@UseGuards(JwtAuthGuard)
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
