import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Advanced Rate Limit Guard
 * Per-user, per-IP, per-endpoint rate limiting
 */
@Injectable()
export class AdvancedRateLimitGuard implements CanActivate {
    private readonly logger = new Logger(AdvancedRateLimitGuard.name);
    private requests: Map<string, RateLimitEntry[]> = new Map();

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler();
        const classRef = context.getClass();

        // 取得自訂限制
        const limit = this.reflector.getAllAndOverride<RateLimitConfig>('rateLimit', [handler, classRef]) || {
            points: 100,
            duration: 60,
            blockDuration: 300,
        };

        const key = this.generateKey(request);
        const now = Date.now();

        // 清理過期紀錄
        this.cleanup(key, now, limit.duration * 1000);

        // 取得當前窗口請求
        const entries = this.requests.get(key) || [];
        const recentCount = entries.length;

        // 檢查是否被封鎖
        const lastBlock = entries.find((e) => e.blocked);
        if (lastBlock && now - lastBlock.timestamp < limit.blockDuration * 1000) {
            const retryAfter = Math.ceil((lastBlock.timestamp + limit.blockDuration * 1000 - now) / 1000);
            throw new HttpException({
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: '請求過於頻繁，請稍後再試',
                retryAfter,
            }, HttpStatus.TOO_MANY_REQUESTS);
        }

        // 檢查限制
        if (recentCount >= limit.points) {
            entries.push({ timestamp: now, blocked: true });
            this.requests.set(key, entries);

            this.logger.warn(`Rate limit exceeded for ${key}`);

            throw new HttpException({
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: '請求過於頻繁，請稍後再試',
                retryAfter: limit.blockDuration,
            }, HttpStatus.TOO_MANY_REQUESTS);
        }

        // 記錄請求
        entries.push({ timestamp: now, blocked: false });
        this.requests.set(key, entries);

        return true;
    }

    private generateKey(request: any): string {
        const userId = request.user?.id || 'anon';
        const ip = request.ip || request.connection?.remoteAddress || 'unknown';
        const path = request.path;
        return `${userId}:${ip}:${path}`;
    }

    private cleanup(key: string, now: number, windowMs: number): void {
        const entries = this.requests.get(key) || [];
        const filtered = entries.filter((e) => now - e.timestamp < windowMs);
        if (filtered.length !== entries.length) {
            this.requests.set(key, filtered);
        }
    }

    /**
     * 取得限流統計
     */
    getStats(): RateLimitStats {
        let totalKeys = 0;
        let blockedKeys = 0;
        let totalRequests = 0;

        for (const [, entries] of this.requests) {
            totalKeys++;
            totalRequests += entries.length;
            if (entries.some((e) => e.blocked)) blockedKeys++;
        }

        return { totalKeys, blockedKeys, totalRequests };
    }

    /**
     * 清除特定使用者限制
     */
    clearLimit(userId: string): void {
        for (const key of this.requests.keys()) {
            if (key.startsWith(`${userId}:`)) {
                this.requests.delete(key);
            }
        }
    }
}

// Types
interface RateLimitConfig { points: number; duration: number; blockDuration: number; }
interface RateLimitEntry { timestamp: number; blocked: boolean; }
interface RateLimitStats { totalKeys: number; blockedKeys: number; totalRequests: number; }

// Decorator
import { SetMetadata } from '@nestjs/common';
export const RateLimit = (config: RateLimitConfig) => SetMetadata('rateLimit', config);
