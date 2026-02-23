import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenBudgetService, BudgetTier } from './token-budget.service';

describe('TokenBudgetService', () => {
    let service: TokenBudgetService;
    let eventEmitter: { emit: jest.Mock };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TokenBudgetService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<TokenBudgetService>(TokenBudgetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== hasBudget =====
    describe('hasBudget', () => {
        it('should return true with fresh budget', () => {
            expect(service.hasBudget(BudgetTier.CRITICAL, 1000)).toBe(true);
        });

        it('should return false when exceeding daily limit', () => {
            // Critical limit is 500,000
            expect(service.hasBudget(BudgetTier.CRITICAL, 600_000)).toBe(false);
        });
    });

    // ===== recordUsage =====
    describe('recordUsage', () => {
        it('should record usage without warnings under 80%', () => {
            service.recordUsage({
                tier: BudgetTier.STANDARD,
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150,
                estimatedCost: 0.001,
            });
            const status = service.getBudgetStatus(BudgetTier.STANDARD);
            expect(status.dailyUsed).toBe(150);
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should emit warning at 80% usage', () => {
            // Standard limit = 300,000. Use 250,000 (83%)
            service.recordUsage({
                tier: BudgetTier.STANDARD,
                promptTokens: 200_000,
                completionTokens: 50_000,
                totalTokens: 250_000,
                estimatedCost: 1.0,
            });
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'ai.budget.warning',
                expect.objectContaining({ tier: BudgetTier.STANDARD }),
            );
        });

        it('should emit exceeded at 100% usage', () => {
            service.recordUsage({
                tier: BudgetTier.BATCH,
                promptTokens: 150_000,
                completionTokens: 60_000,
                totalTokens: 210_000, // exceeds 200,000 batch limit
                estimatedCost: 1.0,
            });
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'ai.budget.exceeded',
                expect.objectContaining({ tier: BudgetTier.BATCH }),
            );
        });
    });

    // ===== estimateCost =====
    describe('estimateCost', () => {
        it('should calculate cost for gemini-1.5-flash', () => {
            // 1M input + 1M output: $0.075 + $0.30 = $0.375
            const cost = service.estimateCost(1_000_000, 1_000_000, 'gemini-1.5-flash');
            expect(cost).toBeCloseTo(0.375, 2);
        });

        it('should calculate cost for gemini-1.5-pro', () => {
            const cost = service.estimateCost(1_000_000, 1_000_000, 'gemini-1.5-pro');
            expect(cost).toBeCloseTo(6.25, 2); // $1.25 + $5.00
        });

        it('should fallback to flash pricing for unknown model', () => {
            const cost = service.estimateCost(1_000_000, 1_000_000, 'unknown-model');
            expect(cost).toBeCloseTo(0.375, 2);
        });
    });

    // ===== getBudgetStatus =====
    describe('getBudgetStatus', () => {
        it('should return fresh budget status', () => {
            const status = service.getBudgetStatus(BudgetTier.CRITICAL);
            expect(status.tier).toBe(BudgetTier.CRITICAL);
            expect(status.dailyLimit).toBe(500_000);
            expect(status.dailyUsed).toBe(0);
            expect(status.isOverBudget).toBe(false);
            expect(status.percentUsed).toBe(0);
        });
    });

    // ===== getAllBudgetStatus =====
    describe('getAllBudgetStatus', () => {
        it('should return status for all tiers', () => {
            const statuses = service.getAllBudgetStatus();
            expect(statuses).toHaveLength(3);
            const tiers = statuses.map(s => s.tier);
            expect(tiers).toContain(BudgetTier.CRITICAL);
            expect(tiers).toContain(BudgetTier.STANDARD);
            expect(tiers).toContain(BudgetTier.BATCH);
        });
    });

    // ===== recommendModel =====
    describe('recommendModel', () => {
        it('should recommend flash for batch tier', () => {
            expect(service.recommendModel(BudgetTier.BATCH, 'high')).toBe('gemini-1.5-flash');
        });

        it('should recommend pro for critical + high complexity', () => {
            expect(service.recommendModel(BudgetTier.CRITICAL, 'high')).toBe('gemini-1.5-pro');
        });

        it('should recommend flash for standard tier', () => {
            expect(service.recommendModel(BudgetTier.STANDARD, 'medium')).toBe('gemini-1.5-flash');
        });
    });

    // ===== getDailyTotalCost =====
    describe('getDailyTotalCost', () => {
        it('should return 0 with no usage', () => {
            expect(service.getDailyTotalCost()).toBe(0);
        });

        it('should compute cost after usage', () => {
            service.recordUsage({
                tier: BudgetTier.CRITICAL,
                promptTokens: 100_000,
                completionTokens: 50_000,
                totalTokens: 150_000,
                estimatedCost: 0,
            });
            const cost = service.getDailyTotalCost();
            expect(cost).toBeGreaterThan(0);
        });
    });
});
