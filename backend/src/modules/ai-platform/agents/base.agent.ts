import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiOrchestratorService, AiTask } from '../core/ai-orchestrator.service';

export interface AgentCapability {
    name: string;
    description: string;
}

export interface AgentStatus {
    id: string;
    name: string;
    status: 'idle' | 'busy' | 'error';
    lastActivity: Date;
    taskCount: number;
}

/**
 * AI Agent 基類
 * 
 * 所有 AI Agent 的共同抽象基類，提供：
 * - 標準化的任務提交介面
 * - 事件驅動的通訊
 * - 狀態管理
 * - 能力宣告
 */
@Injectable()
export abstract class BaseAgent {
    protected readonly logger: Logger;
    protected status: 'idle' | 'busy' | 'error' = 'idle';
    protected lastActivity: Date = new Date();
    protected taskCount: number = 0;

    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly capabilities: AgentCapability[];

    constructor(
        protected readonly orchestrator: AiOrchestratorService,
        protected readonly eventEmitter: EventEmitter2,
    ) {
        this.logger = new Logger(this.constructor.name);
        this.setupEventListeners();
    }

    /**
     * 取得 Agent 狀態
     */
    getStatus(): AgentStatus {
        return {
            id: this.id,
            name: this.name,
            status: this.status,
            lastActivity: this.lastActivity,
            taskCount: this.taskCount,
        };
    }

    /**
     * 提交 AI 任務
     */
    protected async submitTask(
        type: AiTask['type'],
        priority: AiTask['priority'],
        prompt: string,
        context?: any
    ) {
        const task: AiTask = {
            id: `${this.id}-${Date.now()}`,
            type,
            priority,
            prompt,
            context,
            agentId: this.id,
        };

        this.status = 'busy';
        this.taskCount++;
        this.lastActivity = new Date();

        try {
            const result = await this.orchestrator.submitTask(task);
            this.status = 'idle';
            return result;
        } catch (error) {
            this.status = 'error';
            throw error;
        }
    }

    /**
     * 發送訊息給其他 Agent
     */
    protected async sendMessage(toAgent: string, message: any): Promise<void> {
        await this.orchestrator.sendAgentMessage(this.id, toAgent, message);
    }

    /**
     * 設定事件監聽器
     */
    private setupEventListeners(): void {
        // 監聽發送給此 Agent 的訊息
        this.eventEmitter.on('ai.agent.message', (event) => {
            if (event.to === this.id) {
                this.onMessage(event.from, event.message);
            }
        });

        // 監聯決策核准事件
        this.eventEmitter.on('ai.decision.approved', (decision) => {
            if (decision.agentId === this.id) {
                this.onDecisionApproved(decision);
            }
        });

        // 監聽決策拒絕事件
        this.eventEmitter.on('ai.decision.rejected', (decision) => {
            if (decision.agentId === this.id) {
                this.onDecisionRejected(decision);
            }
        });
    }

    /**
     * 處理接收到的訊息（子類實作）
     */
    protected onMessage(from: string, message: any): void {
        this.logger.log(`Received message from ${from}`);
    }

    /**
     * 處理決策核准（子類實作）
     */
    protected onDecisionApproved(decision: any): void {
        this.logger.log(`Decision approved: ${decision.id}`);
    }

    /**
     * 處理決策拒絕（子類實作）
     */
    protected onDecisionRejected(decision: any): void {
        this.logger.log(`Decision rejected: ${decision.id}`);
    }
}
