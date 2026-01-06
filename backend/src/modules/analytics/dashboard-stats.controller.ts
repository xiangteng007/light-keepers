/**
 * Dashboard Statistics Controller
 * REST API for real-time dashboard data
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardStatsService } from './dashboard-stats.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('analytics/dashboard')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class DashboardStatsController {
    constructor(private readonly statsService: DashboardStatsService) { }

    /**
     * Get comprehensive dashboard statistics
     */
    @Get('stats')
    async getStats(@Query('missionSessionId') missionSessionId?: string) {
        const stats = await this.statsService.getDashboardStats(missionSessionId);
        return { success: true, data: stats };
    }

    /**
     * Get time series data for charts
     */
    @Get('time-series')
    async getTimeSeries(
        @Query('missionSessionId') missionSessionId: string,
        @Query('metric') metric: 'reports' | 'sos' | 'tasks',
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('interval') interval: 'hour' | 'day' = 'hour',
    ) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const data = await this.statsService.getTimeSeries(
            missionSessionId,
            metric,
            startDate,
            endDate,
            interval,
        );
        return { success: true, data };
    }

    /**
     * Get severity trend over time
     */
    @Get('severity-trend')
    async getSeverityTrend(
        @Query('missionSessionId') missionSessionId: string,
        @Query('days') days: string = '7',
    ) {
        const data = await this.statsService.getSeverityTrend(
            missionSessionId,
            parseInt(days, 10),
        );
        return { success: true, data };
    }

    /**
     * Get top reporters leaderboard
     */
    @Get('top-reporters')
    async getTopReporters(
        @Query('missionSessionId') missionSessionId: string,
        @Query('limit') limit: string = '10',
    ) {
        const data = await this.statsService.getTopReporters(
            missionSessionId,
            parseInt(limit, 10),
        );
        return { success: true, data };
    }
}
