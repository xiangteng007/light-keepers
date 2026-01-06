/**
 * Metrics Controller
 * REST API for API performance metrics
 */

import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiMetricsService } from './api-metrics.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('metrics')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class MetricsController {
    constructor(private metricsService: ApiMetricsService) { }

    /**
     * Get system-wide metrics
     */
    @Get('system')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getSystemMetrics() {
        const metrics = this.metricsService.getSystemMetrics();
        return { success: true, data: metrics };
    }

    /**
     * Get all endpoint metrics
     */
    @Get('endpoints')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getEndpointMetrics() {
        const metrics = this.metricsService.getEndpointMetrics();
        return { success: true, data: metrics };
    }

    /**
     * Get slowest endpoints
     */
    @Get('endpoints/slow')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getSlowEndpoints() {
        const metrics = this.metricsService.getSlowEndpoints(10);
        return { success: true, data: metrics };
    }

    /**
     * Get error-prone endpoints
     */
    @Get('endpoints/errors')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getErrorProneEndpoints() {
        const metrics = this.metricsService.getErrorProneEndpoints(10);
        return { success: true, data: metrics };
    }

    /**
     * Reset all metrics
     */
    @Post('reset')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async resetMetrics() {
        this.metricsService.resetMetrics();
        return { success: true, message: '指標已重設' };
    }
}
