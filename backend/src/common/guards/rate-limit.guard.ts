/**
 * Rate Limiting Guard
 * Protects API endpoints from abuse with configurable limits
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../modules/cache/cache.service';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitConfig {
    points: number;      // Max requests
    duration: number;    // Time window in seconds
    blockDuration?: number; // Block duration in seconds after limit exceeded
}

/**
 * Decorator to set rate limit for a route
 */
export const RateLimit = (config: RateLimitConfig) =>
    SetMetadata(RATE_LIMIT_KEY, config);

@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly defaultConfig: RateLimitConfig = {
        points: 100,
        duration: 60, // 100 requests per minute
        blockDuration: 60,
    };

    constructor(
        private reflector: Reflector,
        private cache: CacheService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const config = this.reflector.get<RateLimitConfig>(
            RATE_LIMIT_KEY,
            context.getHandler(),
        ) || this.defaultConfig;

        const request = context.switchToHttp().getRequest();
        const key = this.getKey(request);

        // Check if blocked
        const blocked = await this.cache.get<number>(`ratelimit:blocked:${key}`);
        if (blocked) {
            const retryAfter = Math.ceil((blocked - Date.now()) / 1000);
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: '請求過於頻繁，請稍後再試',
                    retryAfter,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Get current count
        const countKey = `ratelimit:count:${key}`;
        let count = await this.cache.get<number>(countKey) || 0;

        if (count >= config.points) {
            // Block the user
            const blockUntil = Date.now() + (config.blockDuration || 60) * 1000;
            await this.cache.set(`ratelimit:blocked:${key}`, blockUntil, {
                ttl: config.blockDuration || 60,
            });

            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: '請求過於頻繁，請稍後再試',
                    retryAfter: config.blockDuration || 60,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Increment count
        await this.cache.set(countKey, count + 1, { ttl: config.duration });

        // Set rate limit headers
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-RateLimit-Limit', config.points);
        response.setHeader('X-RateLimit-Remaining', Math.max(0, config.points - count - 1));
        response.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + config.duration);

        return true;
    }

    private getKey(request: any): string {
        // Use user ID if authenticated, otherwise IP
        const userId = request.user?.id || request.user?.uid;
        if (userId) {
            return `user:${userId}`;
        }

        const ip = request.ip ||
            request.headers['x-forwarded-for']?.split(',')[0] ||
            request.connection?.remoteAddress ||
            'unknown';
        return `ip:${ip}`;
    }
}
