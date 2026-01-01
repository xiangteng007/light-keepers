import {
    Controller,
    Get,
    Post,
    Body,
    Query,
} from '@nestjs/common';
import {
    AdvancedFilterService,
    AdvancedReportFilter,
} from './advanced-filter.service';
import { ReportStatus, ReportType, ReportSeverity } from './reports.entity';

@Controller('reports/advanced')
export class AdvancedFilterController {
    constructor(private readonly filterService: AdvancedFilterService) { }

    // 進階篩選查詢
    @Post('filter')
    async filterReports(@Body() filter: AdvancedReportFilter) {
        const result = await this.filterService.filterReports(filter);
        return {
            success: true,
            ...result,
        };
    }

    // GET 版本的篩選（URL 參數）
    @Get('filter')
    async filterReportsGet(
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('severity') severity?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('keyword') keyword?: string,
        @Query('region') region?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        const filter: AdvancedReportFilter = {
            status: status ? (status.includes(',') ? status.split(',') as ReportStatus[] : status as ReportStatus) : undefined,
            type: type ? (type.includes(',') ? type.split(',') as ReportType[] : type as ReportType) : undefined,
            severity: severity ? (severity.includes(',') ? severity.split(',').map(Number) as unknown as ReportSeverity[] : parseInt(severity, 10) as unknown as ReportSeverity) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            keyword,
            region,
            page: page ? parseInt(page, 10) : 1,
            pageSize: pageSize ? parseInt(pageSize, 10) : 20,
            sortBy: sortBy as any || 'createdAt',
            sortOrder: (sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'DESC',
        };

        const result = await this.filterService.filterReports(filter);
        return {
            success: true,
            ...result,
        };
    }

    // 聚合查詢
    @Get('aggregate')
    async aggregateReports(
        @Query('groupBy') groupBy: 'day' | 'week' | 'month' | 'type' | 'status' | 'region' = 'day',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('type') type?: string,
        @Query('status') status?: string,
    ) {
        const filter: AdvancedReportFilter = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            type: type as ReportType,
            status: status as ReportStatus,
        };

        const result = await this.filterService.aggregateReports(filter, groupBy);
        return {
            success: true,
            groupBy,
            data: result,
        };
    }

    // 時間序列分析
    @Get('timeseries')
    async getTimeSeries(
        @Query('interval') interval: 'hour' | 'day' | 'week' | 'month' = 'day',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('type') type?: string,
    ) {
        const filter: AdvancedReportFilter = {
            startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: endDate ? new Date(endDate) : new Date(),
            type: type as ReportType,
        };

        const result = await this.filterService.getTimeSeries(filter, interval);
        return {
            success: true,
            interval,
            data: result,
        };
    }

    // 交叉分析
    @Get('cross-analysis')
    async getCrossAnalysis(
        @Query('dim1') dim1: 'type' | 'status' | 'severity' = 'type',
        @Query('dim2') dim2: 'type' | 'status' | 'severity' = 'severity',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const filter: AdvancedReportFilter = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };

        const result = await this.filterService.getCrossAnalysis(filter, dim1, dim2);
        return {
            success: true,
            dimensions: [dim1, dim2],
            data: result,
        };
    }

    // 取得可用的篩選選項
    @Get('options')
    async getFilterOptions() {
        const options = await this.filterService.getFilterOptions();
        return {
            success: true,
            data: options,
        };
    }
}
