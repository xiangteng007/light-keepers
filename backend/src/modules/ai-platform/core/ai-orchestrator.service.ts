import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GeminiClientService } from './gemini-client.service';
import { ModelRouterService } from './model-router.service';
import { TokenBudgetService, BudgetTier } from './token-budget.service';

export enum ConfidenceLevel {
    HIGH = 'high',       // > 95% → 自動執行
    MEDIUM = 'medium',   // 70-95% → 通知後自動
    LOW = 'low',         // < 70% → 需人工確認
}

export interface AiDecision {
    id: string;
    agentId: string;
    action: string;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
    reasoning: string;
    data: any;
    requiresHumanApproval: boolean;
    createdAt: Date;
}

export interface AiTask {
    id: string;
    type: 'classification' | 'generation' | 'analysis' | 'vision' | 'reasoning';
    priority: 'critical' | 'standard' | 'batch';
    prompt: string;
    context?: any;
    agentId?: string;
}

export interface AiTaskResult {
    taskId: string;
    success: boolean;
    result?: any;
    error?: string;
    decision?: AiDecision;
    tokenUsage: {
        prompt: number;
        completion: number;
        total: number;
        cost: number;
    };
}

/**
 * AI 協調器服務
 * 
 * 統一管理所有 AI 任務的調度與協調：
 * - 任務佇列管理
 * - Agent 間通訊
 * - 衝突解決
 * - Human-in-the-Loop 閘道
 */
@Injectable()
export class AiOrchestratorService {
    private readonly logger = new Logger(AiOrchestratorService.name);
    private taskQueue: AiTask[] = [];
    private pendingDecisions: Map<string, AiDecision> = new Map();

    constructor(
        private readonly geminiClient: GeminiClientService,
        private readonly modelRouter: ModelRouterService,
        private readonly tokenBudget: TokenBudgetService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * 提交 AI 任務
     */
    async submitTask(task: AiTask): Promise<AiTaskResult> {
        this.logger.log(`Submitting AI task: ${task.id} (${task.type}/${task.priority})`);
        
        // 檢查 AI 服務是否可用
        if (!this.geminiClient.isAvailable()) {
            return {
                taskId: task.id,
                success: false,
                error: 'AI service unavailable - GEMINI_API_KEY not configured',
                tokenUsage: { prompt: 0, completion: 0, total: 0, cost: 0 },
            };
        }

        try {
            // 使用模型路由執行任務
            const { text, routing } = await this.modelRouter.executeWithRouting(
                task.prompt,
                task.type,
                task.priority,
            );

            // 解析結果並評估信心度
            const decision = await this.evaluateDecision(task, text);

            // 如果需要人工確認，發出事件
            if (decision.requiresHumanApproval) {
                this.pendingDecisions.set(decision.id, decision);
                this.eventEmitter.emit('ai.decision.pending', decision);
            }

            return {
                taskId: task.id,
                success: true,
                result: text,
                decision,
                tokenUsage: {
                    prompt: 0, // 由 tokenBudget 追蹤
                    completion: 0,
                    total: 0,
                    cost: 0,
                },
            };
        } catch (error) {
            this.logger.error(`AI task failed: ${task.id}`, error);
            return {
                taskId: task.id,
                success: false,
                error: error.message,
                tokenUsage: { prompt: 0, completion: 0, total: 0, cost: 0 },
            };
        }
    }

    /**
     * 批次提交多個任務
     */
    async submitBatch(tasks: AiTask[]): Promise<AiTaskResult[]> {
        this.logger.log(`Submitting batch of ${tasks.length} AI tasks`);
        
        // 對於批次任務，使用 Promise.allSettled 以避免單一失敗影響全部
        const results = await Promise.allSettled(
            tasks.map(task => this.submitTask(task))
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            return {
                taskId: tasks[index].id,
                success: false,
                error: result.reason?.message || 'Unknown error',
                tokenUsage: { prompt: 0, completion: 0, total: 0, cost: 0 },
            };
        });
    }

    /**
     * 人工確認決策
     */
    async approveDecision(decisionId: string, approved: boolean): Promise<void> {
        const decision = this.pendingDecisions.get(decisionId);
        
        if (!decision) {
            throw new Error(`Decision not found: ${decisionId}`);
        }

        this.pendingDecisions.delete(decisionId);

        if (approved) {
            this.eventEmitter.emit('ai.decision.approved', decision);
            this.logger.log(`Decision approved: ${decisionId}`);
        } else {
            this.eventEmitter.emit('ai.decision.rejected', decision);
            this.logger.log(`Decision rejected: ${decisionId}`);
        }
    }

    /**
     * 取得待處理決策
     */
    getPendingDecisions(): AiDecision[] {
        return Array.from(this.pendingDecisions.values());
    }

    /**
     * 取得預算狀態
     */
    getBudgetStatus() {
        return this.tokenBudget.getAllBudgetStatus();
    }

    /**
     * 評估 AI 決策的信心度
     */
    private async evaluateDecision(task: AiTask, result: string): Promise<AiDecision> {
        // 嘗試從結果中提取信心度
        let confidence = 0.7; // 預設中等信心
        let reasoning = '';

        try {
            // 嘗試解析 JSON 結果
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                confidence = parsed.confidence || confidence;
                reasoning = parsed.reasoning || '';
            }
        } catch {
            // 非 JSON 結果，使用預設值
        }

        // 決定信心等級
        const confidenceLevel = this.getConfidenceLevel(confidence);
        
        // 決定是否需要人工確認
        const requiresHumanApproval = 
            confidenceLevel === ConfidenceLevel.LOW ||
            task.priority === 'critical';

        const decision: AiDecision = {
            id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId: task.agentId || 'orchestrator',
            action: task.type,
            confidence,
            confidenceLevel,
            reasoning,
            data: result,
            requiresHumanApproval,
            createdAt: new Date(),
        };

        return decision;
    }

    /**
     * 信心度數值轉換為等級
     */
    private getConfidenceLevel(confidence: number): ConfidenceLevel {
        if (confidence >= 0.95) return ConfidenceLevel.HIGH;
        if (confidence >= 0.70) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }

    /**
     * Agent 間訊息傳遞
     */
    async sendAgentMessage(
        fromAgent: string,
        toAgent: string,
        message: any
    ): Promise<void> {
        this.eventEmitter.emit('ai.agent.message', {
            from: fromAgent,
            to: toAgent,
            message,
            timestamp: new Date(),
        });
    }
}
