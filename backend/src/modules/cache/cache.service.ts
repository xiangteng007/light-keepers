/**
 * Cache Service
 * In-memory cache with optional Redis support
 * Falls back to Map-based cache when Redis is not available
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    namespace?: string;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private readonly memoryCache = new Map<string, { value: any; expiresAt: number }>();
    private redisClient: any = null;
    private readonly defaultTtl = 300; // 5 minutes
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const redisUrl = this.configService.get<string>('REDIS_URL');

        if (redisUrl) {
            try {
                // Dynamic import for Redis (optional dependency)
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const redis = await import('redis' as any);
                this.redisClient = redis.createClient({ url: redisUrl });

                this.redisClient.on('error', (err: Error) => {
                    this.logger.error('Redis error', err);
                });

                await this.redisClient.connect();
                this.logger.log('Redis connected successfully');
            } catch (error) {
                this.logger.warn('Redis unavailable, using memory cache', error);
                this.redisClient = null;
            }
        } else {
            this.logger.log('Redis not configured, using memory cache');
        }

        // Start cleanup interval for memory cache
        this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60000);
    }

    async onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.redisClient) {
            await this.redisClient.quit();
        }
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
        const fullKey = this.buildKey(key, options?.namespace);

        try {
            if (this.redisClient) {
                const data = await this.redisClient.get(fullKey);
                return data ? JSON.parse(data) : null;
            } else {
                const cached = this.memoryCache.get(fullKey);
                if (cached && cached.expiresAt > Date.now()) {
                    return cached.value;
                }
                if (cached) {
                    this.memoryCache.delete(fullKey);
                }
                return null;
            }
        } catch (error) {
            this.logger.error(`Cache get error: ${fullKey}`, error);
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const fullKey = this.buildKey(key, options?.namespace);
        const ttl = options?.ttl || this.defaultTtl;

        try {
            if (this.redisClient) {
                await this.redisClient.setEx(fullKey, ttl, JSON.stringify(value));
            } else {
                this.memoryCache.set(fullKey, {
                    value,
                    expiresAt: Date.now() + ttl * 1000,
                });
            }
        } catch (error) {
            this.logger.error(`Cache set error: ${fullKey}`, error);
        }
    }

    /**
     * Delete from cache
     */
    async del(key: string, options?: CacheOptions): Promise<void> {
        const fullKey = this.buildKey(key, options?.namespace);

        try {
            if (this.redisClient) {
                await this.redisClient.del(fullKey);
            } else {
                this.memoryCache.delete(fullKey);
            }
        } catch (error) {
            this.logger.error(`Cache delete error: ${fullKey}`, error);
        }
    }

    /**
     * Delete all keys matching pattern
     */
    async delByPattern(pattern: string, options?: CacheOptions): Promise<number> {
        const fullPattern = this.buildKey(pattern, options?.namespace);
        let deleted = 0;

        try {
            if (this.redisClient) {
                const keys = await this.redisClient.keys(fullPattern);
                if (keys.length > 0) {
                    deleted = await this.redisClient.del(keys);
                }
            } else {
                const regex = new RegExp('^' + fullPattern.replace(/\*/g, '.*') + '$');
                for (const key of this.memoryCache.keys()) {
                    if (regex.test(key)) {
                        this.memoryCache.delete(key);
                        deleted++;
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Cache pattern delete error: ${fullPattern}`, error);
        }

        return deleted;
    }

    /**
     * Get or set with callback
     */
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        const cached = await this.get<T>(key, options);
        if (cached !== null) {
            return cached;
        }

        const value = await factory();
        await this.set(key, value, options);
        return value;
    }

    /**
     * Check if key exists
     */
    async has(key: string, options?: CacheOptions): Promise<boolean> {
        const fullKey = this.buildKey(key, options?.namespace);

        try {
            if (this.redisClient) {
                return (await this.redisClient.exists(fullKey)) === 1;
            } else {
                const cached = this.memoryCache.get(fullKey);
                return cached !== undefined && cached.expiresAt > Date.now();
            }
        } catch {
            return false;
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        try {
            if (this.redisClient) {
                await this.redisClient.flushDb();
            } else {
                this.memoryCache.clear();
            }
            this.logger.log('Cache cleared');
        } catch (error) {
            this.logger.error('Cache clear error', error);
        }
    }

    /**
     * Get cache stats
     */
    getStats(): { type: 'redis' | 'memory'; size: number } {
        return {
            type: this.redisClient ? 'redis' : 'memory',
            size: this.memoryCache.size,
        };
    }

    // ==================== Private Helpers ====================

    private buildKey(key: string, namespace?: string): string {
        return namespace ? `${namespace}:${key}` : key;
    }

    private cleanupExpired(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, cached] of this.memoryCache.entries()) {
            if (cached.expiresAt <= now) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
        }
    }
}
