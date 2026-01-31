import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitConfig {
    name: string;
    limit: number;          // 請求數限制
    window: number;         // 時間窗口（ms）
    strategy: 'sliding' | 'fixed';
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;    // 毫秒
}

/**
 * Rate Limiter Service
 * 
 * 限流器實現：
 * - 滑動窗口 / 固定窗口
 * - 多層級限流
 * - 動態調整
 */
@Injectable()
export class RateLimiterService {
    private readonly logger = new Logger(RateLimiterService.name);
    
    private configs: Map<string, RateLimitConfig> = new Map();
    private windows: Map<string, { requests: number[]; count: number; windowStart: number }> = new Map();

    constructor() {
        // 預設限流配置
        this.addConfig({ name: 'global', limit: 1000, window: 60000, strategy: 'sliding' });
        this.addConfig({ name: 'api', limit: 100, window: 60000, strategy: 'sliding' });
        this.addConfig({ name: 'auth', limit: 10, window: 60000, strategy: 'fixed' });
        this.addConfig({ name: 'upload', limit: 20, window: 300000, strategy: 'fixed' });
    }

    /**
     * 新增限流配置
     */
    addConfig(config: RateLimitConfig): void {
        this.configs.set(config.name, config);
        this.logger.log(`Rate limiter added: ${config.name} (${config.limit}/${config.window}ms)`);
    }

    /**
     * 檢查並消耗配額
     */
    checkAndConsume(limitName: string, key: string, count: number = 1): RateLimitResult {
        const config = this.configs.get(limitName);
        if (!config) {
            return { allowed: true, remaining: Infinity, resetAt: new Date() };
        }

        const windowKey = `${limitName}:${key}`;
        
        if (config.strategy === 'sliding') {
            return this.checkSlidingWindow(config, windowKey, count);
        } else {
            return this.checkFixedWindow(config, windowKey, count);
        }
    }

    /**
     * 取得剩餘配額
     */
    getRemaining(limitName: string, key: string): number {
        const config = this.configs.get(limitName);
        if (!config) return Infinity;

        const windowKey = `${limitName}:${key}`;
        const window = this.windows.get(windowKey);
        
        if (!window) return config.limit;

        if (config.strategy === 'sliding') {
            const now = Date.now();
            const validRequests = window.requests.filter(t => t > now - config.window);
            return Math.max(0, config.limit - validRequests.length);
        } else {
            if (Date.now() - window.windowStart >= config.window) {
                return config.limit;
            }
            return Math.max(0, config.limit - window.count);
        }
    }

    /**
     * 重置限流窗口
     */
    reset(limitName: string, key: string): void {
        const windowKey = `${limitName}:${key}`;
        this.windows.delete(windowKey);
    }

    /**
     * 取得所有配置
     */
    getConfigs(): RateLimitConfig[] {
        return Array.from(this.configs.values());
    }

    /**
     * 更新配置
     */
    updateConfig(name: string, updates: Partial<RateLimitConfig>): boolean {
        const config = this.configs.get(name);
        if (!config) return false;

        Object.assign(config, updates);
        return true;
    }

    // === Private ===

    private checkSlidingWindow(
        config: RateLimitConfig,
        windowKey: string,
        count: number
    ): RateLimitResult {
        const now = Date.now();
        let window = this.windows.get(windowKey);

        if (!window) {
            window = { requests: [], count: 0, windowStart: now };
            this.windows.set(windowKey, window);
        }

        // 移除過期請求
        window.requests = window.requests.filter(t => t > now - config.window);

        const currentCount = window.requests.length;
        const remaining = config.limit - currentCount;

        if (currentCount + count > config.limit) {
            // 計算最早請求何時過期
            const oldestRequest = Math.min(...window.requests);
            const retryAfter = (oldestRequest + config.window) - now;

            return {
                allowed: false,
                remaining: Math.max(0, remaining),
                resetAt: new Date(oldestRequest + config.window),
                retryAfter: Math.max(0, retryAfter),
            };
        }

        // 添加請求時間戳
        for (let i = 0; i < count; i++) {
            window.requests.push(now);
        }

        return {
            allowed: true,
            remaining: remaining - count,
            resetAt: new Date(now + config.window),
        };
    }

    private checkFixedWindow(
        config: RateLimitConfig,
        windowKey: string,
        count: number
    ): RateLimitResult {
        const now = Date.now();
        let window = this.windows.get(windowKey);

        // 檢查窗口是否過期
        if (!window || now - window.windowStart >= config.window) {
            window = { requests: [], count: 0, windowStart: now };
            this.windows.set(windowKey, window);
        }

        const remaining = config.limit - window.count;
        const resetAt = new Date(window.windowStart + config.window);

        if (window.count + count > config.limit) {
            return {
                allowed: false,
                remaining: Math.max(0, remaining),
                resetAt,
                retryAfter: resetAt.getTime() - now,
            };
        }

        window.count += count;

        return {
            allowed: true,
            remaining: remaining - count,
            resetAt,
        };
    }
}
