import { Controller, Get } from '@nestjs/common';

/**
 * Minimal Health Controller for CI
 * 
 * Provides only /health and /health/live endpoints without any
 * database dependencies. Used when DB_REQUIRED=false.
 */
@Controller('health')
export class HealthOnlyController {
    private readonly startTime: Date = new Date();

    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'light-keepers-api',
            version: process.env.npm_package_version || '0.1.0',
            mode: 'health-only',
            uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        };
    }

    @Get('live')
    live() {
        return { status: 'live' };
    }

    @Get('ready')
    ready() {
        // In health-only mode, we're always ready (no DB to check)
        return {
            status: 'ready',
            checks: {
                database: 'skipped (DB_REQUIRED=false)',
            },
            timestamp: new Date().toISOString(),
        };
    }
}
