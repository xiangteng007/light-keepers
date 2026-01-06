/**
 * Feature Flags Service
 * Dynamic feature management and A/B testing
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description?: string;
    enabled: boolean;

    // Targeting rules
    rolloutPercentage: number; // 0-100
    allowedRoles?: string[];
    allowedUsers?: string[];
    blockedUsers?: string[];

    // A/B testing
    variants?: FeatureVariant[];

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

export interface FeatureVariant {
    id: string;
    name: string;
    weight: number; // Percentage weight
    config?: Record<string, any>;
}

export interface FeatureEvaluation {
    enabled: boolean;
    variant?: string;
    config?: Record<string, any>;
    reason: string;
}

export interface UserContext {
    userId?: string;
    role?: string;
    attributes?: Record<string, any>;
}

@Injectable()
export class FeatureFlagsService {
    private readonly logger = new Logger(FeatureFlagsService.name);
    private readonly FLAGS_KEY = 'feature:flags';
    private flagsCache: FeatureFlag[] = [];

    constructor(private cache: CacheService) {
        this.loadFlags();
    }

    // ==================== Flag Management ====================

    /**
     * Create a new feature flag
     */
    async createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
        const newFlag: FeatureFlag = {
            ...flag,
            id: `flag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.flagsCache.push(newFlag);
        await this.saveFlags();

        this.logger.log(`Created feature flag: ${newFlag.key}`);
        return newFlag;
    }

    /**
     * Get all flags
     */
    async getAllFlags(): Promise<FeatureFlag[]> {
        return this.flagsCache;
    }

    /**
     * Get flag by key
     */
    async getFlag(key: string): Promise<FeatureFlag | null> {
        return this.flagsCache.find(f => f.key === key) || null;
    }

    /**
     * Update a flag
     */
    async updateFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
        const index = this.flagsCache.findIndex(f => f.key === key);
        if (index === -1) return null;

        this.flagsCache[index] = {
            ...this.flagsCache[index],
            ...updates,
            updatedAt: new Date()
        };
        await this.saveFlags();

        return this.flagsCache[index];
    }

    /**
     * Delete a flag
     */
    async deleteFlag(key: string): Promise<boolean> {
        const index = this.flagsCache.findIndex(f => f.key === key);
        if (index === -1) return false;

        this.flagsCache.splice(index, 1);
        await this.saveFlags();

        return true;
    }

    // ==================== Flag Evaluation ====================

    /**
     * Evaluate a feature flag for a user
     */
    async evaluate(key: string, context: UserContext = {}): Promise<FeatureEvaluation> {
        const flag = await this.getFlag(key);

        if (!flag) {
            return { enabled: false, reason: 'Flag not found' };
        }

        // Check expiration
        if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
            return { enabled: false, reason: 'Flag expired' };
        }

        // Check if globally disabled
        if (!flag.enabled) {
            return { enabled: false, reason: 'Globally disabled' };
        }

        // Check blocked users
        if (context.userId && flag.blockedUsers?.includes(context.userId)) {
            return { enabled: false, reason: 'User blocked' };
        }

        // Check allowed users (bypass other rules)
        if (context.userId && flag.allowedUsers?.includes(context.userId)) {
            return this.evaluateVariant(flag, context, 'User allowed');
        }

        // Check allowed roles
        if (flag.allowedRoles?.length && context.role) {
            if (!flag.allowedRoles.includes(context.role)) {
                return { enabled: false, reason: 'Role not allowed' };
            }
        }

        // Check rollout percentage
        if (flag.rolloutPercentage < 100) {
            const hash = this.hashUserId(context.userId || 'anonymous', flag.key);
            const percentage = hash % 100;

            if (percentage >= flag.rolloutPercentage) {
                return { enabled: false, reason: 'Outside rollout percentage' };
            }
        }

        return this.evaluateVariant(flag, context, 'Rollout matched');
    }

    /**
     * Check if a feature is enabled (simple boolean)
     */
    async isEnabled(key: string, context: UserContext = {}): Promise<boolean> {
        const result = await this.evaluate(key, context);
        return result.enabled;
    }

    /**
     * Get variant for A/B testing
     */
    async getVariant(key: string, context: UserContext = {}): Promise<string | null> {
        const result = await this.evaluate(key, context);
        return result.variant || null;
    }

    // ==================== Bulk Operations ====================

    /**
     * Evaluate multiple flags at once
     */
    async evaluateAll(context: UserContext = {}): Promise<Record<string, FeatureEvaluation>> {
        const results: Record<string, FeatureEvaluation> = {};

        for (const flag of this.flagsCache) {
            results[flag.key] = await this.evaluate(flag.key, context);
        }

        return results;
    }

    /**
     * Get all enabled feature keys
     */
    async getEnabledFeatures(context: UserContext = {}): Promise<string[]> {
        const evaluations = await this.evaluateAll(context);
        return Object.entries(evaluations)
            .filter(([_, eval_]) => eval_.enabled)
            .map(([key]) => key);
    }

    // ==================== Helpers ====================

    private evaluateVariant(flag: FeatureFlag, context: UserContext, reason: string): FeatureEvaluation {
        if (!flag.variants?.length) {
            return { enabled: true, reason };
        }

        // Calculate variant based on user hash
        const hash = this.hashUserId(context.userId || 'anonymous', `${flag.key}:variant`);
        const percentage = hash % 100;

        let cumulative = 0;
        for (const variant of flag.variants) {
            cumulative += variant.weight;
            if (percentage < cumulative) {
                return {
                    enabled: true,
                    variant: variant.id,
                    config: variant.config,
                    reason: `${reason}, variant: ${variant.name}`,
                };
            }
        }

        return { enabled: true, reason };
    }

    private hashUserId(userId: string, salt: string): number {
        const str = `${userId}:${salt}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    private async loadFlags(): Promise<void> {
        try {
            const flags = await this.cache.get<FeatureFlag[]>(this.FLAGS_KEY);
            this.flagsCache = flags || [];
        } catch (error) {
            this.logger.error('Failed to load feature flags', error);
        }
    }

    private async saveFlags(): Promise<void> {
        await this.cache.set(this.FLAGS_KEY, this.flagsCache, { ttl: 0 });
    }
}
