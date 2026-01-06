/**
 * API Metrics Service
 * Collects and reports API performance metrics
 */

import { Injectable, Logger, NestMiddleware, OnModuleInit } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../cache/cache.service';

export interface EndpointMetrics {
    path: string;
    method: string;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    lastRequestAt: Date;
    statusCodes: Record<number, number>;
}

export interface SystemMetrics {
    uptime: number;
    totalRequests: number;
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
    activeConnections: number;
    memory: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
    };
}

@Injectable()
export class ApiMetricsService implements OnModuleInit {
    private readonly logger = new Logger(ApiMetricsService.name);
    private readonly METRICS_KEY = 'api:metrics';
    private metricsCache = new Map<string, EndpointMetrics>();
    private requestTimestamps: number[] = [];
    private startTime = Date.now();

    constructor(private cache: CacheService) { }

    async onModuleInit(): Promise<void> {
        await this.loadMetrics();

        // Periodically save metrics
        setInterval(() => this.saveMetrics(), 60000); // Every minute

        // Clean old request timestamps
        setInterval(() => {
            const oneMinuteAgo = Date.now() - 60000;
            this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
        }, 10000);
    }

    // ==================== Request Tracking ====================

    /**
     * Record a request
     */
    recordRequest(
        path: string,
        method: string,
        statusCode: number,
        responseTime: number
    ): void {
        const key = `${method}:${this.normalizePath(path)}`;
        const now = Date.now();
        this.requestTimestamps.push(now);

        let metrics = this.metricsCache.get(key);

        if (!metrics) {
            metrics = {
                path: this.normalizePath(path),
                method,
                totalRequests: 0,
                successCount: 0,
                errorCount: 0,
                avgResponseTime: 0,
                minResponseTime: Infinity,
                maxResponseTime: 0,
                lastRequestAt: new Date(),
                statusCodes: {},
            };
        }

        // Update metrics
        metrics.totalRequests++;
        metrics.lastRequestAt = new Date();

        if (statusCode >= 200 && statusCode < 400) {
            metrics.successCount++;
        } else {
            metrics.errorCount++;
        }

        // Update response time stats
        const n = metrics.totalRequests;
        metrics.avgResponseTime = ((metrics.avgResponseTime * (n - 1)) + responseTime) / n;
        metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
        metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);

        // Track status codes
        metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

        this.metricsCache.set(key, metrics);
    }

    // ==================== Metrics Retrieval ====================

    /**
     * Get all endpoint metrics
     */
    getEndpointMetrics(): EndpointMetrics[] {
        return Array.from(this.metricsCache.values())
            .sort((a, b) => b.totalRequests - a.totalRequests);
    }

    /**
     * Get metrics for a specific endpoint
     */
    getEndpointMetric(method: string, path: string): EndpointMetrics | null {
        const key = `${method}:${this.normalizePath(path)}`;
        return this.metricsCache.get(key) || null;
    }

    /**
     * Get system-wide metrics
     */
    getSystemMetrics(): SystemMetrics {
        const allMetrics = this.getEndpointMetrics();
        const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
        const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);

        const avgResponseTime = allMetrics.length > 0
            ? allMetrics.reduce((sum, m) => sum + m.avgResponseTime * m.totalRequests, 0) / totalRequests
            : 0;

        const memory = process.memoryUsage();

        return {
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            totalRequests,
            requestsPerMinute: this.requestTimestamps.length,
            avgResponseTime: Math.round(avgResponseTime),
            errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
            activeConnections: 0, // Would need socket tracking
            memory: {
                heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
                rss: Math.round(memory.rss / 1024 / 1024),
            },
        };
    }

    /**
     * Get top slow endpoints
     */
    getSlowEndpoints(limit = 10): EndpointMetrics[] {
        return this.getEndpointMetrics()
            .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
            .slice(0, limit);
    }

    /**
     * Get endpoints with most errors
     */
    getErrorProneEndpoints(limit = 10): EndpointMetrics[] {
        return this.getEndpointMetrics()
            .filter(m => m.errorCount > 0)
            .sort((a, b) => b.errorCount - a.errorCount)
            .slice(0, limit);
    }

    /**
     * Reset all metrics
     */
    resetMetrics(): void {
        this.metricsCache.clear();
        this.requestTimestamps = [];
        this.startTime = Date.now();
        this.logger.log('Metrics reset');
    }

    // ==================== Helpers ====================

    private normalizePath(path: string): string {
        // Remove query strings and normalize IDs
        return path
            .split('?')[0]
            .replace(/\/[0-9a-f-]{36}/gi, '/:id')
            .replace(/\/\d+/g, '/:id');
    }

    private async loadMetrics(): Promise<void> {
        try {
            const saved = await this.cache.get<[string, EndpointMetrics][]>(this.METRICS_KEY);
            if (saved) {
                this.metricsCache = new Map(saved);
            }
        } catch (error) {
            this.logger.warn('Failed to load metrics', error);
        }
    }

    private async saveMetrics(): Promise<void> {
        try {
            const data = Array.from(this.metricsCache.entries());
            await this.cache.set(this.METRICS_KEY, data, { ttl: 86400 }); // 24 hours
        } catch (error) {
            this.logger.warn('Failed to save metrics', error);
        }
    }
}

/**
 * Metrics Middleware
 * Tracks request/response metrics
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
    constructor(private metricsService: ApiMetricsService) { }

    use(req: Request, res: Response, next: NextFunction): void {
        const startTime = Date.now();

        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            this.metricsService.recordRequest(
                req.path,
                req.method,
                res.statusCode,
                responseTime
            );
        });

        next();
    }
}
