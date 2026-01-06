/**
 * Health Check Controller
 * Provides system health monitoring endpoints
 */

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CacheService } from '../modules/cache/cache.service';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: {
        database: { status: string; latencyMs?: number };
        cache: { status: string; type: string };
        memory: { usedMB: number; totalMB: number; percentUsed: number };
    };
}

@Controller('health')
export class HealthController {
    private readonly startTime = Date.now();

    constructor(
        private configService: ConfigService,
        private dataSource: DataSource,
        private cache: CacheService,
    ) { }

    /**
     * Basic health check (for load balancers)
     */
    @Get()
    async check(): Promise<{ status: string }> {
        return { status: 'ok' };
    }

    /**
     * Detailed health check
     */
    @Get('detailed')
    async detailedCheck(): Promise<HealthStatus> {
        const checks = {
            database: await this.checkDatabase(),
            cache: this.checkCache(),
            memory: this.checkMemory(),
        };

        const allHealthy = checks.database.status === 'healthy' &&
            checks.cache.status === 'healthy';

        return {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: this.configService.get<string>('APP_VERSION') || '1.0.0',
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            checks,
        };
    }

    /**
     * Liveness probe (for Kubernetes)
     */
    @Get('live')
    async liveness(): Promise<{ alive: boolean }> {
        return { alive: true };
    }

    /**
     * Readiness probe (for Kubernetes)
     */
    @Get('ready')
    async readiness(): Promise<{ ready: boolean; reason?: string }> {
        const dbCheck = await this.checkDatabase();
        if (dbCheck.status !== 'healthy') {
            return { ready: false, reason: 'Database not connected' };
        }
        return { ready: true };
    }

    private async checkDatabase(): Promise<{ status: string; latencyMs?: number }> {
        try {
            const start = Date.now();
            await this.dataSource.query('SELECT 1');
            const latencyMs = Date.now() - start;
            return { status: 'healthy', latencyMs };
        } catch (error) {
            return { status: 'unhealthy' };
        }
    }

    private checkCache(): { status: string; type: string } {
        const stats = this.cache.getStats();
        return { status: 'healthy', type: stats.type };
    }

    private checkMemory(): { usedMB: number; totalMB: number; percentUsed: number } {
        const used = process.memoryUsage();
        const usedMB = Math.round(used.heapUsed / 1024 / 1024);
        const totalMB = Math.round(used.heapTotal / 1024 / 1024);
        return {
            usedMB,
            totalMB,
            percentUsed: Math.round((usedMB / totalMB) * 100),
        };
    }
}
