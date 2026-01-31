import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum BudgetTier {
    CRITICAL = 'critical',    // 災情分類、派遣決策 - 即時
    STANDARD = 'standard',    // 文件處理、翻譯 - 標準
    BATCH = 'batch',          // 報表生成、AAR - 批次
}

export interface TokenUsage {
    tier: BudgetTier;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
}

export interface BudgetStatus {
    tier: BudgetTier;
    dailyLimit: number;
    dailyUsed: number;
    remainingBudget: number;
    percentUsed: number;
    isOverBudget: boolean;
}

/**
 * Token 預算管理服務
 * 
 * 管理 AI API 使用量與成本控制：
 * - 分層預算 (Critical, Standard, Batch)
 * - 每日限額監控
 * - 成本估算
 * - 超支警報
 */
@Injectable()
export class TokenBudgetService {
    private readonly logger = new Logger(TokenBudgetService.name);
    
    // 每日預算限制 (tokens)
    private readonly dailyLimits: Record<BudgetTier, number> = {
        [BudgetTier.CRITICAL]: 500_000,   // ~$2/day
        [BudgetTier.STANDARD]: 300_000,   // ~$1.2/day
        [BudgetTier.BATCH]: 200_000,      // ~$0.8/day
    };

    // Token 價格 (per 1M tokens)
    private readonly pricing = {
        'gemini-1.5-flash': { input: 0.075, output: 0.30 },
        'gemini-1.5-pro': { input: 1.25, output: 5.00 },
        'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    };

    // 每日使用量追蹤
    private dailyUsage: Record<BudgetTier, number> = {
        [BudgetTier.CRITICAL]: 0,
        [BudgetTier.STANDARD]: 0,
        [BudgetTier.BATCH]: 0,
    };

    private lastResetDate: string = '';

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.resetDailyUsageIfNeeded();
    }

    /**
     * 檢查是否有足夠預算
     */
    hasBudget(tier: BudgetTier, estimatedTokens: number): boolean {
        this.resetDailyUsageIfNeeded();
        return this.dailyUsage[tier] + estimatedTokens <= this.dailyLimits[tier];
    }

    /**
     * 記錄 Token 使用量
     */
    recordUsage(usage: TokenUsage): void {
        this.resetDailyUsageIfNeeded();
        
        this.dailyUsage[usage.tier] += usage.totalTokens;
        
        // 檢查是否超過 80% 預算
        const percentUsed = (this.dailyUsage[usage.tier] / this.dailyLimits[usage.tier]) * 100;
        
        if (percentUsed >= 80 && percentUsed < 100) {
            this.logger.warn(`Token budget warning: ${usage.tier} tier at ${percentUsed.toFixed(1)}%`);
            this.eventEmitter.emit('ai.budget.warning', {
                tier: usage.tier,
                percentUsed,
                remaining: this.dailyLimits[usage.tier] - this.dailyUsage[usage.tier],
            });
        }
        
        if (percentUsed >= 100) {
            this.logger.error(`Token budget exceeded: ${usage.tier} tier`);
            this.eventEmitter.emit('ai.budget.exceeded', {
                tier: usage.tier,
                overage: this.dailyUsage[usage.tier] - this.dailyLimits[usage.tier],
            });
        }
    }

    /**
     * 估算成本
     */
    estimateCost(
        promptTokens: number,
        completionTokens: number,
        model: string = 'gemini-1.5-flash'
    ): number {
        const pricing = this.pricing[model] || this.pricing['gemini-1.5-flash'];
        const inputCost = (promptTokens / 1_000_000) * pricing.input;
        const outputCost = (completionTokens / 1_000_000) * pricing.output;
        return inputCost + outputCost;
    }

    /**
     * 取得預算狀態
     */
    getBudgetStatus(tier: BudgetTier): BudgetStatus {
        this.resetDailyUsageIfNeeded();
        
        const dailyLimit = this.dailyLimits[tier];
        const dailyUsed = this.dailyUsage[tier];
        const remainingBudget = Math.max(0, dailyLimit - dailyUsed);
        const percentUsed = (dailyUsed / dailyLimit) * 100;
        
        return {
            tier,
            dailyLimit,
            dailyUsed,
            remainingBudget,
            percentUsed,
            isOverBudget: dailyUsed > dailyLimit,
        };
    }

    /**
     * 取得所有層級預算狀態
     */
    getAllBudgetStatus(): BudgetStatus[] {
        return Object.values(BudgetTier).map(tier => this.getBudgetStatus(tier));
    }

    /**
     * 取得每日總成本估算
     */
    getDailyTotalCost(): number {
        const flashPricing = this.pricing['gemini-1.5-flash'];
        let totalCost = 0;
        
        for (const tier of Object.values(BudgetTier)) {
            // 假設 input:output 比例為 3:1
            const totalTokens = this.dailyUsage[tier];
            const inputTokens = totalTokens * 0.75;
            const outputTokens = totalTokens * 0.25;
            totalCost += this.estimateCost(inputTokens, outputTokens, 'gemini-1.5-flash');
        }
        
        return totalCost;
    }

    /**
     * 重設每日使用量（如果需要）
     */
    private resetDailyUsageIfNeeded(): void {
        const today = new Date().toISOString().split('T')[0];
        
        if (this.lastResetDate !== today) {
            this.dailyUsage = {
                [BudgetTier.CRITICAL]: 0,
                [BudgetTier.STANDARD]: 0,
                [BudgetTier.BATCH]: 0,
            };
            this.lastResetDate = today;
            this.logger.log('Daily token budget reset');
        }
    }

    /**
     * 建議最佳模型選擇
     */
    recommendModel(tier: BudgetTier, taskComplexity: 'low' | 'medium' | 'high'): string {
        // 成本優化策略
        if (tier === BudgetTier.BATCH) {
            return 'gemini-1.5-flash'; // 批次任務用最便宜的
        }
        
        if (tier === BudgetTier.CRITICAL && taskComplexity === 'high') {
            return 'gemini-1.5-pro'; // 關鍵任務+高複雜度用 Pro
        }
        
        // 預設使用 Flash
        return 'gemini-1.5-flash';
    }
}
