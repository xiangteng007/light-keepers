import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis Cache Service
 * Caching layer for API performance optimization
 * 
 * 📋 需要設定:
 * - REDIS_URL: Redis 連線字串
 */
@Injectable()
export class RedisCacheService {
    private readonly logger = new Logger(RedisCacheService.name);
    private cache: Map<string, CacheEntry> = new Map(); // In-memory fallback

    constructor(private configService: ConfigService) {
        this.initializeRedis();
    }

    private async initializeRedis() {
        const redisUrl = this.configService.get<string>('REDIS_URL');
        if (!redisUrl) {
            this.logger.warn('REDIS_URL not configured, using in-memory cache');
        }
        // TODO: Initialize ioredis when REDIS_URL is available
    }

    /**
     * 取得快取
     */
    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value as T;
    }

    /**
     * 設定快取
     */
    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    /**
     * 刪除快取
     */
    async del(key: string): Promise<void> {
        this.cache.delete(key);
    }

    /**
     * 批次刪除 (by pattern)
     */
    async delPattern(pattern: string): Promise<number> {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * 取得或設定 (Cache-aside pattern)
     */
    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) return cached;

        const value = await factory();
        await this.set(key, value, ttlSeconds);
        return value;
    }

    /**
     * 清除所有快取
     */
    async flush(): Promise<void> {
        this.cache.clear();
    }

    /**
     * 取得快取統計
     */
    getStats(): CacheStats {
        let expired = 0;
        const now = Date.now();
        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) expired++;
        }
        return {
            size: this.cache.size,
            expired,
            usingRedis: !!this.configService.get<string>('REDIS_URL'),
        };
    }

    /**
     * 包裝 API 結果快取
     */
    cacheKey(prefix: string, ...args: any[]): string {
        return `${prefix}:${args.join(':')}`;
    }
}

interface CacheEntry { value: any; expiresAt: number; }
interface CacheStats { size: number; expired: number; usingRedis: boolean; }
