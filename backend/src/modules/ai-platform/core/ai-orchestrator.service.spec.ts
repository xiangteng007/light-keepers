import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiOrchestratorService, ConfidenceLevel } from './ai-orchestrator.service';
import { GeminiClientService } from './gemini-client.service';
import { ModelRouterService } from './model-router.service';
import { TokenBudgetService, BudgetTier } from './token-budget.service';

describe('AiOrchestratorService', () => {
    let service: AiOrchestratorService;
    let geminiClient: { isAvailable: jest.Mock; generateContent: jest.Mock };
    let modelRouter: { executeWithRouting: jest.Mock; selectModel: jest.Mock };
    let tokenBudget: { getAllBudgetStatus: jest.Mock };
    let eventEmitter: { emit: jest.Mock };

    beforeEach(async () => {
        geminiClient = {
            isAvailable: jest.fn().mockReturnValue(true),
            generateContent: jest.fn(),
        };
        modelRouter = {
            executeWithRouting: jest.fn().mockResolvedValue({
                text: '{"confidence": 0.85, "reasoning": "test reasoning"}',
                routing: { model: 'gemini-1.5-flash', tier: BudgetTier.STANDARD, reason: 'test' },
            }),
            selectModel: jest.fn(),
        };
        tokenBudget = {
            getAllBudgetStatus: jest.fn().mockReturnValue([]),
        };
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiOrchestratorService,
                { provide: GeminiClientService, useValue: geminiClient },
                { provide: ModelRouterService, useValue: modelRouter },
                { provide: TokenBudgetService, useValue: tokenBudget },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<AiOrchestratorService>(AiOrchestratorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== submitTask =====
    describe('submitTask', () => {
        const baseTask = {
            id: 'task-1',
            type: 'classification' as const,
            priority: 'standard' as const,
            prompt: 'Test prompt',
        };

        it('should return error when AI unavailable', async () => {
            geminiClient.isAvailable.mockReturnValue(false);
            const result = await service.submitTask(baseTask);
            expect(result.success).toBe(false);
            expect(result.error).toContain('unavailable');
        });

        it('should execute task successfully', async () => {
            const result = await service.submitTask(baseTask);
            expect(result.success).toBe(true);
            expect(result.taskId).toBe('task-1');
            expect(result.decision).toBeDefined();
            expect(result.decision!.confidence).toBe(0.85);
            expect(result.decision!.confidenceLevel).toBe(ConfidenceLevel.MEDIUM);
        });

        it('should require human approval for critical tasks', async () => {
            const criticalTask = { ...baseTask, priority: 'critical' as const };
            const result = await service.submitTask(criticalTask);
            expect(result.decision!.requiresHumanApproval).toBe(true);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'ai.decision.pending',
                expect.any(Object),
            );
        });

        it('should require human approval for low confidence', async () => {
            modelRouter.executeWithRouting.mockResolvedValueOnce({
                text: '{"confidence": 0.5, "reasoning": "uncertain"}',
                routing: { model: 'gemini-1.5-flash', tier: BudgetTier.STANDARD, reason: 'test' },
            });
            const result = await service.submitTask(baseTask);
            expect(result.decision!.confidenceLevel).toBe(ConfidenceLevel.LOW);
            expect(result.decision!.requiresHumanApproval).toBe(true);
        });

        it('should handle execution error gracefully', async () => {
            modelRouter.executeWithRouting.mockRejectedValueOnce(new Error('Model failed'));
            const result = await service.submitTask(baseTask);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Model failed');
        });

        it('should parse non-JSON response with default confidence', async () => {
            modelRouter.executeWithRouting.mockResolvedValueOnce({
                text: 'Plain text response without JSON',
                routing: { model: 'gemini-1.5-flash', tier: BudgetTier.STANDARD, reason: 'test' },
            });
            const result = await service.submitTask(baseTask);
            expect(result.decision!.confidence).toBe(0.7); // default
        });
    });

    // ===== submitBatch =====
    describe('submitBatch', () => {
        it('should process multiple tasks', async () => {
            const tasks = [
                { id: 't1', type: 'classification' as const, priority: 'standard' as const, prompt: 'p1' },
                { id: 't2', type: 'generation' as const, priority: 'batch' as const, prompt: 'p2' },
            ];
            const results = await service.submitBatch(tasks);
            expect(results).toHaveLength(2);
            expect(results.every(r => r.success)).toBe(true);
        });

        it('should handle partial failures', async () => {
            modelRouter.executeWithRouting
                .mockResolvedValueOnce({ text: '{}', routing: {} })
                .mockRejectedValueOnce(new Error('fail'));

            const tasks = [
                { id: 't1', type: 'analysis' as const, priority: 'standard' as const, prompt: 'p1' },
                { id: 't2', type: 'analysis' as const, priority: 'standard' as const, prompt: 'p2' },
            ];
            const results = await service.submitBatch(tasks);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
        });
    });

    // ===== approveDecision =====
    describe('approveDecision', () => {
        it('should throw for unknown decision', async () => {
            await expect(service.approveDecision('unknown', true))
                .rejects.toThrow('Decision not found');
        });

        it('should emit approved event', async () => {
            // Submit a critical task to generate a pending decision
            const result = await service.submitTask({
                id: 'task-1',
                type: 'classification',
                priority: 'critical',
                prompt: 'test',
            });

            await service.approveDecision(result.decision!.id, true);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'ai.decision.approved',
                expect.any(Object),
            );
        });

        it('should emit rejected event', async () => {
            const result = await service.submitTask({
                id: 'task-1',
                type: 'classification',
                priority: 'critical',
                prompt: 'test',
            });

            await service.approveDecision(result.decision!.id, false);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'ai.decision.rejected',
                expect.any(Object),
            );
        });
    });

    // ===== getPendingDecisions =====
    describe('getPendingDecisions', () => {
        it('should return empty initially', () => {
            expect(service.getPendingDecisions()).toEqual([]);
        });
    });

    // ===== sendAgentMessage =====
    describe('sendAgentMessage', () => {
        it('should emit agent message event', async () => {
            await service.sendAgentMessage('agent-a', 'agent-b', { action: 'sync' });
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'ai.agent.message',
                expect.objectContaining({ from: 'agent-a', to: 'agent-b' }),
            );
        });
    });
});
