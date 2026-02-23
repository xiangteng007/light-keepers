import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiGovernanceService, DecisionType, ConfidenceLevel } from './ai-governance.service';

describe('AiGovernanceService', () => {
    let service: AiGovernanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiGovernanceService,
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(AiGovernanceService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('processDecision auto-executes high confidence', async () => {
        const result = await service.processDecision(
            DecisionType.TRANSLATION, 'test-agent', { text: 'hello' }, { translated: '你好' }, 0.95,
        );
        expect(result.execute).toBe(true);
        expect(result.decisionId).toBeDefined();
    });

    it('processDecision requires approval for low confidence', async () => {
        const result = await service.processDecision(
            DecisionType.PRIORITY_TRIAGE, 'test-agent', {}, {}, 0.3,
        );
        expect(result.requiresApproval).toBe(true);
    });

    it('approveDecision returns true for valid id', async () => {
        const { decisionId } = await service.processDecision(
            DecisionType.RISK_ASSESSMENT, 'agent', {}, {}, 0.5,
        );
        const approved = service.approveDecision(decisionId, 'admin');
        expect(approved).toBe(true);
    });

    it('getConfidenceLevel returns correct level', () => {
        expect((service as any).getConfidenceLevel(0.95)).toBe(ConfidenceLevel.HIGH);
        expect((service as any).getConfidenceLevel(0.7)).toBe(ConfidenceLevel.MEDIUM);
        expect((service as any).getConfidenceLevel(0.3)).toBe(ConfidenceLevel.LOW);
    });

    it('getPolicy returns default policy', () => {
        const policy = service.getPolicy();
        expect(policy.autoExecuteThreshold).toBeDefined();
        expect(policy.auditRetentionDays).toBeDefined();
    });

    it('trackTokenUsage updates stats', () => {
        service.trackTokenUsage(100, 50);
        const stats = service.getTokenUsageStats();
        expect(stats.percentageUsed).toBeGreaterThan(0);
    });

    it('generateGovernanceReport returns report', () => {
        const report = service.generateGovernanceReport();
        expect(report.generatedAt).toBeDefined();
        expect(report.totalDecisions).toBeDefined();
    });
});
