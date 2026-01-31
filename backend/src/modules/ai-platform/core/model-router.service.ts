import { Injectable, Logger } from '@nestjs/common';
import { GeminiClientService, GeminiOptions } from './gemini-client.service';
import { TokenBudgetService, BudgetTier, TokenUsage } from './token-budget.service';

export type ModelType = 'flash' | 'pro' | 'vision';

export interface ModelRoutingResult {
    model: 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash';
    tier: BudgetTier;
    reason: string;
}

/**
 * 模型路由服務
 * 
 * 根據任務類型、複雜度和預算自動選擇最佳模型：
 * - 成本優化：Flash 優先
 * - 複雜任務：Pro 模型
 * - 視覺任務：Vision 能力
 */
@Injectable()
export class ModelRouterService {
    private readonly logger = new Logger(ModelRouterService.name);

    constructor(
        private readonly geminiClient: GeminiClientService,
        private readonly tokenBudget: TokenBudgetService,
    ) {}

    /**
     * 根據任務特性選擇最佳模型
     */
    selectModel(
        taskType: 'classification' | 'generation' | 'analysis' | 'vision' | 'reasoning',
        priority: 'critical' | 'standard' | 'batch',
        estimatedTokens: number = 1000
    ): ModelRoutingResult {
        const tier = this.priorityToTier(priority);
        
        // 檢查預算
        if (!this.tokenBudget.hasBudget(tier, estimatedTokens)) {
            this.logger.warn(`Budget exceeded for ${tier} tier, falling back to batch`);
            return {
                model: 'gemini-1.5-flash',
                tier: BudgetTier.BATCH,
                reason: 'Budget exceeded, using batch tier with Flash model',
            };
        }

        // 根據任務類型選擇模型
        switch (taskType) {
            case 'vision':
                return {
                    model: 'gemini-1.5-flash', // Flash 已支援視覺
                    tier,
                    reason: 'Vision task using Flash model for cost efficiency',
                };
            
            case 'reasoning':
                // 複雜推理任務使用 Pro
                if (priority === 'critical') {
                    return {
                        model: 'gemini-1.5-pro',
                        tier,
                        reason: 'Critical reasoning task requires Pro model',
                    };
                }
                return {
                    model: 'gemini-1.5-flash',
                    tier,
                    reason: 'Standard reasoning task using Flash model',
                };
            
            case 'classification':
                // 分類任務使用 Flash
                return {
                    model: 'gemini-1.5-flash',
                    tier,
                    reason: 'Classification task optimized with Flash model',
                };
            
            case 'generation':
                // 生成任務根據優先級選擇
                if (priority === 'critical') {
                    return {
                        model: 'gemini-1.5-pro',
                        tier,
                        reason: 'Critical generation task using Pro model',
                    };
                }
                return {
                    model: 'gemini-1.5-flash',
                    tier,
                    reason: 'Standard generation task using Flash model',
                };
            
            case 'analysis':
            default:
                return {
                    model: 'gemini-1.5-flash',
                    tier,
                    reason: 'Analysis task using Flash model for balance',
                };
        }
    }

    /**
     * 執行帶路由的 AI 請求
     */
    async executeWithRouting(
        prompt: string,
        taskType: 'classification' | 'generation' | 'analysis' | 'vision' | 'reasoning',
        priority: 'critical' | 'standard' | 'batch',
        options: Partial<GeminiOptions> = {}
    ): Promise<{ text: string; routing: ModelRoutingResult }> {
        const routing = this.selectModel(taskType, priority);
        
        const response = await this.geminiClient.generateContent(prompt, {
            ...options,
            model: routing.model,
        });

        // 記錄 Token 使用
        const usage: TokenUsage = {
            tier: routing.tier,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
            estimatedCost: this.tokenBudget.estimateCost(
                response.usage.promptTokens,
                response.usage.completionTokens,
                routing.model
            ),
        };
        this.tokenBudget.recordUsage(usage);

        return {
            text: response.text,
            routing,
        };
    }

    /**
     * 優先級轉換為預算層級
     */
    private priorityToTier(priority: 'critical' | 'standard' | 'batch'): BudgetTier {
        switch (priority) {
            case 'critical':
                return BudgetTier.CRITICAL;
            case 'standard':
                return BudgetTier.STANDARD;
            case 'batch':
                return BudgetTier.BATCH;
        }
    }
}
