import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from './modules/auth/decorators/public.decorator';

/**
 * Minimal Health Controller for CI
 * 
 * Provides only /health and /health/live endpoints without any
 * database dependencies. Used when DB_REQUIRED=false.
 * 
 * Security: All endpoints are @Public() with rate limiting (Policy-B)
 */
/**
 * 限流覆核（2026-08-01, BE-5）：各端點 120/min per IP —— 合理，維持。
 * 同 health.controller.ts：需容納 LB／uptime 監控高頻探測。
 */
@Controller('health')
export class HealthOnlyController {
    private readonly startTime: Date = new Date();

    @Public()
    @Throttle({ default: { limit: 120, ttl: 60000 } })
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

    @Public()
    @Throttle({ default: { limit: 120, ttl: 60000 } })
    @Get('live')
    live() {
        return { status: 'live' };
    }

    @Public()
    @Throttle({ default: { limit: 120, ttl: 60000 } })
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
