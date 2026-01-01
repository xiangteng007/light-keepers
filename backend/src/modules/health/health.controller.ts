import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Health Controller for Cloud Run
 * 
 * CRITICAL: All endpoints MUST return HTTP 200, even if dependencies are down.
 * - /health (liveness): Always 200, no dependency check
 * - /health/live: Minimal liveness check
 * - /health/ready: Readiness probe - checks DB but returns 200 with degraded status if unavailable
 */
@Controller('health')
export class HealthController {
    private startTime: Date;

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {
        this.startTime = new Date();
    }

    /**
     * Liveness probe - Cloud Run uses this to check if container is alive
     * MUST return 200 immediately without any blocking calls
     */
    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'light-keepers-api',
            version: process.env.npm_package_version || '0.1.0',
            uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        };
    }

    /**
     * Minimal liveness endpoint - simplest possible check
     */
    @Get('live')
    live() {
        return { status: 'live' };
    }

    /**
     * Readiness probe - checks if service is ready to accept traffic
     * Checks database but NEVER returns non-200 status
     */
    @Get('ready')
    async ready() {
        const checks: Record<string, 'ok' | 'degraded' | 'error'> = {
            database: 'degraded',
        };

        // Check database connection - but don't throw on failure
        try {
            if (this.dataSource?.isInitialized) {
                await this.dataSource.query('SELECT 1');
                checks.database = 'ok';
            }
        } catch (error) {
            console.warn('[HealthCheck] Database check failed:', error.message);
            checks.database = 'error';
        }

        const allHealthy = Object.values(checks).every(v => v === 'ok');

        return {
            status: allHealthy ? 'ready' : 'degraded',
            checks,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Detailed health check for debugging
     */
    @Get('details')
    async details() {
        const checks = await this.ready();
        return {
            ...checks,
            service: 'light-keepers-api',
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
            memory: process.memoryUsage(),
        };
    }
}

