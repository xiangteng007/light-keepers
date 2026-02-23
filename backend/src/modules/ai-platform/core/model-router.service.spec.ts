import { Test, TestingModule } from '@nestjs/testing';
import { ModelRouterService } from './model-router.service';
import { GeminiClientService } from './gemini-client.service';
import { TokenBudgetService, BudgetTier } from './token-budget.service';

describe('ModelRouterService', () => {
    let service: ModelRouterService;
    let geminiClient: { generateContent: jest.Mock };
    let tokenBudget: {
        hasBudget: jest.Mock;
        recordUsage: jest.Mock;
        estimateCost: jest.Mock;
    };

    beforeEach(async () => {
        geminiClient = {
            generateContent: jest.fn().mockResolvedValue({
                text: 'AI response',
                usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
            }),
        };
        tokenBudget = {
            hasBudget: jest.fn().mockReturnValue(true),
            recordUsage: jest.fn(),
            estimateCost: jest.fn().mockReturnValue(0.01),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ModelRouterService,
                { provide: GeminiClientService, useValue: geminiClient },
                { provide: TokenBudgetService, useValue: tokenBudget },
            ],
        }).compile();

        service = module.get<ModelRouterService>(ModelRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== selectModel =====
    describe('selectModel', () => {
        it('should select flash for classification', () => {
            const result = service.selectModel('classification', 'standard');
            expect(result.model).toBe('gemini-1.5-flash');
            expect(result.tier).toBe(BudgetTier.STANDARD);
        });

        it('should select pro for critical reasoning', () => {
            const result = service.selectModel('reasoning', 'critical');
            expect(result.model).toBe('gemini-1.5-pro');
            expect(result.tier).toBe(BudgetTier.CRITICAL);
        });

        it('should select flash for standard reasoning', () => {
            const result = service.selectModel('reasoning', 'standard');
            expect(result.model).toBe('gemini-1.5-flash');
        });

        it('should select pro for critical generation', () => {
            const result = service.selectModel('generation', 'critical');
            expect(result.model).toBe('gemini-1.5-pro');
        });

        it('should select flash for batch generation', () => {
            const result = service.selectModel('generation', 'batch');
            expect(result.model).toBe('gemini-1.5-flash');
            expect(result.tier).toBe(BudgetTier.BATCH);
        });

        it('should select flash for vision', () => {
            const result = service.selectModel('vision', 'standard');
            expect(result.model).toBe('gemini-1.5-flash');
        });

        it('should select flash for analysis', () => {
            const result = service.selectModel('analysis', 'standard');
            expect(result.model).toBe('gemini-1.5-flash');
        });

        it('should fallback to batch flash when budget exceeded', () => {
            tokenBudget.hasBudget.mockReturnValue(false);
            const result = service.selectModel('reasoning', 'critical');
            expect(result.model).toBe('gemini-1.5-flash');
            expect(result.tier).toBe(BudgetTier.BATCH);
            expect(result.reason).toContain('Budget exceeded');
        });
    });

    // ===== executeWithRouting =====
    describe('executeWithRouting', () => {
        it('should route and execute request', async () => {
            const result = await service.executeWithRouting('Test prompt', 'classification', 'standard');
            expect(result.text).toBe('AI response');
            expect(result.routing.model).toBe('gemini-1.5-flash');
            expect(geminiClient.generateContent).toHaveBeenCalledWith(
                'Test prompt',
                expect.objectContaining({ model: 'gemini-1.5-flash' }),
            );
        });

        it('should record token usage after execution', async () => {
            await service.executeWithRouting('Test', 'analysis', 'standard');
            expect(tokenBudget.recordUsage).toHaveBeenCalledWith(
                expect.objectContaining({
                    tier: BudgetTier.STANDARD,
                    promptTokens: 100,
                    completionTokens: 50,
                    totalTokens: 150,
                }),
            );
        });

        it('should estimate cost using correct model', async () => {
            await service.executeWithRouting('Test', 'reasoning', 'critical');
            expect(tokenBudget.estimateCost).toHaveBeenCalledWith(100, 50, expect.any(String));
        });
    });
});
