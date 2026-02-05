/**
 * ai-hub.service.ts
 * 
 * v4.0: AI 服務中心 - 統一 AI 能力入口
 * 
 * 整合模組:
 * - ai-prediction
 * - ai-vision
 * - ai-queue
 * - event-ai
 * - chatbot-assistant
 * - auto-dispatch (AI 部分)
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export type AITaskType =
    | 'prediction'      // 趨勢預測
    | 'vision'          // 圖像識別
    | 'nlp'             // 自然語言處理
    | 'dispatch'        // 智慧派遣
    | 'summary'         // 自動摘要
    | 'classification'; // 事件分類

export interface AITask {
    id: string;
    type: AITaskType;
    input: unknown;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    result?: unknown;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
    processingTimeMs?: number;
}

export interface PredictionResult {
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    forecast: { date: string; value: number }[];
    factors: string[];
}

export interface VisionResult {
    labels: { name: string; confidence: number }[];
    objects: { name: string; bbox: number[]; confidence: number }[];
    text?: string;
    damageAssessment?: { level: string; confidence: number };
}

export interface DispatchSuggestion {
    taskId: string;
    recommendedVolunteers: { id: string; name: string; score: number; reason: string }[];
    estimatedDuration: number;
    resources: { id: string; name: string; quantity: number }[];
}

@Injectable()
export class AIHubService implements OnModuleInit {
    private readonly logger = new Logger(AIHubService.name);
    private taskQueue: Map<string, AITask> = new Map();
    private processingCount = 0;
    private readonly maxConcurrent = 3;

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.logger.log('🤖 AIHub initialized');
    }

    // ===== 任務提交 =====

    async submitTask(type: AITaskType, input: unknown): Promise<AITask> {
        const taskId = `ai-${type}-${Date.now()}`;

        const task: AITask = {
            id: taskId,
            type,
            input,
            status: 'queued',
            createdAt: new Date(),
        };

        this.taskQueue.set(taskId, task);
        this.processQueue();

        return task;
    }

    // ===== 快捷方法 =====

    /**
     * 災情預測
     */
    async predictTrend(params: {
        dataType: 'incidents' | 'volunteers' | 'resources';
        historicalDays?: number;
        forecastDays?: number;
    }): Promise<PredictionResult> {
        const task = await this.submitTask('prediction', params);
        await this.waitForCompletion(task.id);
        return this.getTaskResult(task.id) as PredictionResult;
    }

    /**
     * 圖像分析
     */
    async analyzeImage(imageUrl: string, options?: {
        detectDamage?: boolean;
        extractText?: boolean;
    }): Promise<VisionResult> {
        const task = await this.submitTask('vision', { imageUrl, ...options });
        await this.waitForCompletion(task.id);
        return this.getTaskResult(task.id) as VisionResult;
    }

    /**
     * 智慧派遣建議
     */
    async suggestDispatch(taskInfo: {
        taskId: string;
        title: string;
        location: string;
        requiredSkills?: string[];
        urgency: number;
    }): Promise<DispatchSuggestion> {
        const task = await this.submitTask('dispatch', taskInfo);
        await this.waitForCompletion(task.id);
        return this.getTaskResult(task.id) as DispatchSuggestion;
    }

    /**
     * 事件分類
     */
    async classifyEvent(text: string): Promise<{ category: string; confidence: number; keywords: string[] }> {
        const task = await this.submitTask('classification', { text });
        await this.waitForCompletion(task.id);
        return this.getTaskResult(task.id) as { category: string; confidence: number; keywords: string[] };
    }

    /**
     * 自動摘要
     */
    async summarize(text: string, maxLength?: number): Promise<{ summary: string; keyPoints: string[] }> {
        const task = await this.submitTask('summary', { text, maxLength });
        await this.waitForCompletion(task.id);
        return this.getTaskResult(task.id) as { summary: string; keyPoints: string[] };
    }

    // ===== 任務處理 =====

    private async processQueue() {
        if (this.processingCount >= this.maxConcurrent) return;

        const pendingTask = Array.from(this.taskQueue.values())
            .find(t => t.status === 'queued');

        if (!pendingTask) return;

        this.processingCount++;
        pendingTask.status = 'processing';

        try {
            const startTime = Date.now();
            const result = await this.executeTask(pendingTask);

            pendingTask.status = 'completed';
            pendingTask.result = result;
            pendingTask.completedAt = new Date();
            pendingTask.processingTimeMs = Date.now() - startTime;

            this.eventEmitter.emit('ai.task.completed', {
                taskId: pendingTask.id,
                type: pendingTask.type,
                processingTimeMs: pendingTask.processingTimeMs,
            });
        } catch (error) {
            pendingTask.status = 'failed';
            pendingTask.error = String(error);
            this.logger.error(`AI task ${pendingTask.id} failed`, error);
        } finally {
            this.processingCount--;
            this.processQueue();  // 處理下一個
        }
    }

    private async executeTask(task: AITask): Promise<unknown> {
        // 模擬 AI 處理
        await this.delay(500 + Math.random() * 1000);

        switch (task.type) {
            case 'prediction':
                return this.mockPrediction(task.input);
            case 'vision':
                return this.mockVision(task.input);
            case 'dispatch':
                return this.mockDispatch(task.input);
            case 'classification':
                return this.mockClassification(task.input);
            case 'summary':
                return this.mockSummary(task.input);
            default:
                return { message: 'Task type not implemented' };
        }
    }

    // ===== Mock AI Results =====

    private mockPrediction(_input: unknown): PredictionResult {
        return {
            trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as PredictionResult['trend'],
            confidence: 0.75 + Math.random() * 0.2,
            forecast: Array.from({ length: 7 }, (_, i) => ({
                date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
                value: Math.floor(Math.random() * 100),
            })),
            factors: ['歷史趨勢', '季節因素', '天氣影響'],
        };
    }

    private mockVision(input: unknown): VisionResult {
        const opts = input as { detectDamage?: boolean } | undefined;
        return {
            labels: [
                { name: 'flood', confidence: 0.92 },
                { name: 'road', confidence: 0.88 },
            ],
            objects: [
                { name: 'car', bbox: [100, 200, 150, 100], confidence: 0.85 },
            ],
            damageAssessment: opts?.detectDamage ? { level: 'moderate', confidence: 0.78 } : undefined,
        };
    }

    private mockDispatch(input: unknown): DispatchSuggestion {
        const taskInfo = input as { taskId?: string };
        return {
            taskId: taskInfo?.taskId || 'unknown',
            recommendedVolunteers: [
                { id: 'v1', name: '張三', score: 0.95, reason: '技能匹配、距離近' },
                { id: 'v2', name: '李四', score: 0.88, reason: '經驗豐富' },
            ],
            estimatedDuration: 2 + Math.floor(Math.random() * 4),
            resources: [
                { id: 'r1', name: '急救包', quantity: 2 },
            ],
        };
    }

    private mockClassification(_input: unknown): { category: string; confidence: number; keywords: string[] } {
        const categories = ['地震', '颱風', '水災', '火災', '交通事故'];
        return {
            category: categories[Math.floor(Math.random() * categories.length)],
            confidence: 0.8 + Math.random() * 0.15,
            keywords: ['災害', '緊急', '救援'],
        };
    }

    private mockSummary(input: unknown): { summary: string; keyPoints: string[] } {
        const opts = input as { text?: string; maxLength?: number } | undefined;
        const text = opts?.text || '';
        return {
            summary: text.substring(0, opts?.maxLength || 100) + '...',
            keyPoints: ['重點1', '重點2', '重點3'],
        };
    }

    // ===== 工具方法 =====

    getTaskStatus(id: string): AITask | null {
        return this.taskQueue.get(id) || null;
    }

    getTaskResult(id: string): unknown {
        return this.taskQueue.get(id)?.result || null;
    }

    private async waitForCompletion(id: string, timeoutMs: number = 30000): Promise<void> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const task = this.taskQueue.get(id);
            if (task?.status === 'completed' || task?.status === 'failed') return;
            await this.delay(100);
        }
        throw new Error('Task timeout');
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== 事件監聽 =====

    @OnEvent('incidents.created')
    async handleIncidentCreated(payload: { incidentId?: string; description?: string }) {
        // 自動分類新事件
        if (payload.description) {
            const classification = await this.classifyEvent(payload.description);
            this.eventEmitter.emit('ai.incident.classified', {
                incidentId: payload.incidentId,
                ...classification,
            });
        }
    }
}
