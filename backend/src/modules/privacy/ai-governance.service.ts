/**
 * AI Governance Service
 * AI 治理框架服務
 * 
 * P2 合規治理：確保 AI 決策透明、可審計、符合人道主義原則
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * AI 決策信心等級
 */
export enum ConfidenceLevel {
    HIGH = 'high',       // > 95% → 可自動執行
    MEDIUM = 'medium',   // 70-95% → 通知後自動執行
    LOW = 'low',         // < 70% → 需人工確認
}

/**
 * AI 決策類型
 */
export enum DecisionType {
    RESOURCE_ALLOCATION = 'resource_allocation',
    TASK_DISPATCH = 'task_dispatch',
    PRIORITY_TRIAGE = 'priority_triage',
    ROUTE_OPTIMIZATION = 'route_optimization',
    RISK_ASSESSMENT = 'risk_assessment',
    TRANSLATION = 'translation',
    DOCUMENT_ANALYSIS = 'document_analysis',
}

/**
 * AI 決策記錄
 */
export interface AiDecisionRecord {
    id: string;
    decisionType: DecisionType;
    agentName: string;
    input: any;
    output: any;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
    reasoning?: string;
    humanApproved?: boolean;
    approvedBy?: string;
    approvedAt?: Date;
    executedAt?: Date;
    outcome?: 'success' | 'failure' | 'pending';
    createdAt: Date;
}

/**
 * AI 模型評估
 */
export interface ModelEvaluation {
    modelName: string;
    evaluatedAt: Date;
    accuracy: number;
    fairnessScore: number;
    biasIndicators: string[];
    recommendations: string[];
}

/**
 * AI 治理政策
 */
export interface AiGovernancePolicy {
    autoExecuteThreshold: number;
    notifyThenExecuteThreshold: number;
    requireHumanApprovalFor: DecisionType[];
    prohibitedDecisionTypes: DecisionType[];
    maxTokenBudgetPerMonth: number;
    auditRetentionDays: number;
}

/**
 * AI 治理服務
 */
@Injectable()
export class AiGovernanceService {
    private readonly logger = new Logger(AiGovernanceService.name);
    
    // 決策記錄
    private decisions: AiDecisionRecord[] = [];
    
    // 模型評估
    private evaluations: ModelEvaluation[] = [];
    
    // 治理政策
    private policy: AiGovernancePolicy = {
        autoExecuteThreshold: 0.95,
        notifyThenExecuteThreshold: 0.70,
        requireHumanApprovalFor: [
            DecisionType.PRIORITY_TRIAGE,
            DecisionType.RISK_ASSESSMENT,
        ],
        prohibitedDecisionTypes: [],
        maxTokenBudgetPerMonth: 350, // USD
        auditRetentionDays: 365,
    };
    
    // Token 使用追蹤
    private tokenUsage = {
        month: new Date().getMonth(),
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
    };

    constructor(private readonly eventEmitter: EventEmitter2) {}

    // ==================== 決策閘道 ====================

    /**
     * AI 決策閘道 - 決定是否自動執行或需人工確認
     */
    async processDecision(
        decisionType: DecisionType,
        agentName: string,
        input: any,
        output: any,
        confidence: number,
        reasoning?: string,
    ): Promise<{
        execute: boolean;
        requiresApproval: boolean;
        decisionId: string;
    }> {
        const confidenceLevel = this.getConfidenceLevel(confidence);
        
        const record: AiDecisionRecord = {
            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            decisionType,
            agentName,
            input,
            output,
            confidence,
            confidenceLevel,
            reasoning,
            createdAt: new Date(),
        };

        this.decisions.push(record);

        // 檢查是否禁止的決策類型
        if (this.policy.prohibitedDecisionTypes.includes(decisionType)) {
            this.logger.warn(`Prohibited decision type: ${decisionType}`);
            return { execute: false, requiresApproval: false, decisionId: record.id };
        }

        // 強制需人工確認的類型
        if (this.policy.requireHumanApprovalFor.includes(decisionType)) {
            this.eventEmitter.emit('ai.approval_required', record);
            return { execute: false, requiresApproval: true, decisionId: record.id };
        }

        // 依信心等級處理
        if (confidence >= this.policy.autoExecuteThreshold) {
            record.executedAt = new Date();
            record.outcome = 'pending';
            this.logger.debug(`Auto-executing: ${decisionType} (confidence: ${confidence})`);
            return { execute: true, requiresApproval: false, decisionId: record.id };
        }

        if (confidence >= this.policy.notifyThenExecuteThreshold) {
            this.eventEmitter.emit('ai.notify_then_execute', record);
            // 30 秒後自動執行
            setTimeout(() => {
                record.executedAt = new Date();
                record.outcome = 'pending';
                this.eventEmitter.emit('ai.auto_executed', record);
            }, 30000);
            return { execute: true, requiresApproval: false, decisionId: record.id };
        }

        // 低信心需人工確認
        this.eventEmitter.emit('ai.approval_required', record);
        return { execute: false, requiresApproval: true, decisionId: record.id };
    }

    /**
     * 人工核准決策
     */
    approveDecision(decisionId: string, approvedBy: string): boolean {
        const decision = this.decisions.find(d => d.id === decisionId);
        if (!decision) return false;

        decision.humanApproved = true;
        decision.approvedBy = approvedBy;
        decision.approvedAt = new Date();
        decision.executedAt = new Date();
        decision.outcome = 'pending';

        this.eventEmitter.emit('ai.approved_executed', decision);
        this.logger.log(`Decision ${decisionId} approved by ${approvedBy}`);

        return true;
    }

    /**
     * 拒絕決策
     */
    rejectDecision(decisionId: string, rejectedBy: string, reason: string): boolean {
        const decision = this.decisions.find(d => d.id === decisionId);
        if (!decision) return false;

        decision.humanApproved = false;
        decision.approvedBy = rejectedBy;
        decision.approvedAt = new Date();
        decision.outcome = 'failure';
        decision.reasoning = `${decision.reasoning || ''} | Rejected: ${reason}`;

        this.logger.log(`Decision ${decisionId} rejected by ${rejectedBy}: ${reason}`);

        return true;
    }

    /**
     * 記錄決策結果
     */
    recordOutcome(decisionId: string, outcome: 'success' | 'failure'): void {
        const decision = this.decisions.find(d => d.id === decisionId);
        if (decision) {
            decision.outcome = outcome;
        }
    }

    // ==================== Token 預算管理 ====================

    /**
     * 追蹤 Token 使用
     */
    trackTokenUsage(inputTokens: number, outputTokens: number): void {
        // 每月重置
        const currentMonth = new Date().getMonth();
        if (currentMonth !== this.tokenUsage.month) {
            this.tokenUsage = { month: currentMonth, inputTokens: 0, outputTokens: 0, estimatedCost: 0 };
        }

        this.tokenUsage.inputTokens += inputTokens;
        this.tokenUsage.outputTokens += outputTokens;
        
        // 估算成本 (Gemini Pro pricing approximation)
        const inputCost = (inputTokens / 1000) * 0.00025;
        const outputCost = (outputTokens / 1000) * 0.0005;
        this.tokenUsage.estimatedCost += inputCost + outputCost;

        // 預算警告
        if (this.tokenUsage.estimatedCost > this.policy.maxTokenBudgetPerMonth * 0.8) {
            this.eventEmitter.emit('ai.budget_warning', {
                used: this.tokenUsage.estimatedCost,
                budget: this.policy.maxTokenBudgetPerMonth,
                percentage: (this.tokenUsage.estimatedCost / this.policy.maxTokenBudgetPerMonth) * 100,
            });
        }
    }

    /**
     * 取得 Token 使用統計
     */
    getTokenUsageStats(): typeof this.tokenUsage & { budgetRemaining: number; percentageUsed: number } {
        return {
            ...this.tokenUsage,
            budgetRemaining: this.policy.maxTokenBudgetPerMonth - this.tokenUsage.estimatedCost,
            percentageUsed: (this.tokenUsage.estimatedCost / this.policy.maxTokenBudgetPerMonth) * 100,
        };
    }

    // ==================== 模型評估 ====================

    /**
     * 記錄模型評估
     */
    recordEvaluation(evaluation: Omit<ModelEvaluation, 'evaluatedAt'>): void {
        this.evaluations.push({
            ...evaluation,
            evaluatedAt: new Date(),
        });
    }

    /**
     * 取得最新評估
     */
    getLatestEvaluation(modelName: string): ModelEvaluation | undefined {
        return this.evaluations
            .filter(e => e.modelName === modelName)
            .sort((a, b) => b.evaluatedAt.getTime() - a.evaluatedAt.getTime())[0];
    }

    // ==================== 審計與報告 ====================

    /**
     * 取得決策審計日誌
     */
    getAuditLog(
        filters?: {
            decisionType?: DecisionType;
            agentName?: string;
            fromDate?: Date;
            toDate?: Date;
            requiresApproval?: boolean;
        },
        limit: number = 100,
    ): AiDecisionRecord[] {
        let results = [...this.decisions];

        if (filters?.decisionType) {
            results = results.filter(d => d.decisionType === filters.decisionType);
        }
        if (filters?.agentName) {
            results = results.filter(d => d.agentName === filters.agentName);
        }
        if (filters?.fromDate) {
            results = results.filter(d => d.createdAt >= filters.fromDate!);
        }
        if (filters?.toDate) {
            results = results.filter(d => d.createdAt <= filters.toDate!);
        }
        if (filters?.requiresApproval !== undefined) {
            results = results.filter(d => 
                filters.requiresApproval 
                    ? d.confidenceLevel === ConfidenceLevel.LOW
                    : d.confidenceLevel !== ConfidenceLevel.LOW
            );
        }

        return results.slice(-limit);
    }

    /**
     * 產生治理報告
     */
    generateGovernanceReport(): {
        generatedAt: Date;
        totalDecisions: number;
        byConfidenceLevel: Record<ConfidenceLevel, number>;
        byDecisionType: Record<string, number>;
        humanApprovalRate: number;
        successRate: number;
        tokenUsage: typeof this.tokenUsage;
        policy: AiGovernancePolicy;
        recommendations: string[];
    } {
        const byConfidenceLevel = {
            [ConfidenceLevel.HIGH]: 0,
            [ConfidenceLevel.MEDIUM]: 0,
            [ConfidenceLevel.LOW]: 0,
        };
        const byDecisionType: Record<string, number> = {};
        let humanApproved = 0;
        let successful = 0;
        let completed = 0;

        for (const decision of this.decisions) {
            byConfidenceLevel[decision.confidenceLevel]++;
            byDecisionType[decision.decisionType] = (byDecisionType[decision.decisionType] || 0) + 1;
            
            if (decision.humanApproved) humanApproved++;
            if (decision.outcome === 'success') successful++;
            if (decision.outcome) completed++;
        }

        const recommendations: string[] = [];
        
        // 生成建議
        const lowConfidenceRate = byConfidenceLevel[ConfidenceLevel.LOW] / this.decisions.length;
        if (lowConfidenceRate > 0.3) {
            recommendations.push('低信心決策過多 (>30%)，建議檢視模型或調整提示');
        }

        if (this.tokenUsage.estimatedCost > this.policy.maxTokenBudgetPerMonth * 0.9) {
            recommendations.push('Token 預算即將用盡，建議優化提示或減少非必要呼叫');
        }

        if (recommendations.length === 0) {
            recommendations.push('AI 治理狀態良好');
        }

        return {
            generatedAt: new Date(),
            totalDecisions: this.decisions.length,
            byConfidenceLevel,
            byDecisionType,
            humanApprovalRate: this.decisions.length > 0 ? (humanApproved / this.decisions.length) * 100 : 0,
            successRate: completed > 0 ? (successful / completed) * 100 : 0,
            tokenUsage: this.tokenUsage,
            policy: this.policy,
            recommendations,
        };
    }

    // ==================== 政策管理 ====================

    /**
     * 取得當前政策
     */
    getPolicy(): AiGovernancePolicy {
        return { ...this.policy };
    }

    /**
     * 更新政策
     */
    updatePolicy(updates: Partial<AiGovernancePolicy>): AiGovernancePolicy {
        this.policy = { ...this.policy, ...updates };
        this.logger.log('AI governance policy updated');
        return this.policy;
    }

    // ==================== Private Helpers ====================

    private getConfidenceLevel(confidence: number): ConfidenceLevel {
        if (confidence >= this.policy.autoExecuteThreshold) {
            return ConfidenceLevel.HIGH;
        }
        if (confidence >= this.policy.notifyThenExecuteThreshold) {
            return ConfidenceLevel.MEDIUM;
        }
        return ConfidenceLevel.LOW;
    }
}
