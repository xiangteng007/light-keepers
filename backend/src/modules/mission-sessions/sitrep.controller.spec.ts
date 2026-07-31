import { Test, TestingModule } from '@nestjs/testing';
import { SITREPController } from './sitrep.controller';
import { SITREPService } from './sitrep.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('SITREPController', () => {
    let controller: SITREPController;

    beforeEach(async () => {
        const service = {
            getSITREPs: jest.fn().mockResolvedValue([]),
            createSITREP: jest.fn().mockResolvedValue({ id: 'sr1' }),
            generateSITREPDraft: jest.fn().mockResolvedValue({ id: 'sr2' }),
            updateSITREP: jest.fn().mockResolvedValue({ id: 'sr1' }),
            approveSITREP: jest.fn().mockResolvedValue({ id: 'sr1' }),
            getDecisions: jest.fn().mockResolvedValue([]),
            logDecision: jest.fn().mockResolvedValue({ id: 'd1' }),
            getDecisionsForEntity: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SITREPController],
            providers: [{ provide: SITREPService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<SITREPController>(SITREPController);
    });

    const req = { user: { uid: 'u1', displayName: 'Test' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('getSITREPs returns list', async () => {
        const result = await controller.getSITREPs('s1');
        expect(result.success).toBe(true);
    });
    it('createSITREP creates', async () => {
        const result = await controller.createSITREP('s1', { periodStart: '2025-01-01', periodEnd: '2025-01-02' }, req);
        expect(result.success).toBe(true);
    });
    it('generateSITREP generates draft', async () => {
        const result = await controller.generateSITREP('s1', { periodStart: '2025-01-01', periodEnd: '2025-01-02' }, req);
        expect(result.success).toBe(true);
    });
    it('updateSITREP updates', async () => {
        const result = await controller.updateSITREP('sr1', { summary: 'Updated' });
        expect(result.success).toBe(true);
    });
    it('approveSITREP approves', async () => {
        const result = await controller.approveSITREP('sr1', req);
        expect(result.success).toBe(true);
    });
    it('getDecisions returns decisions', async () => {
        const result = await controller.getDecisions('s1');
        expect(result.success).toBe(true);
    });
    it('logDecision logs a decision', async () => {
        const result = await controller.logDecision('s1', { decisionType: 'operational' as any, description: 'test' }, req);
        expect(result.success).toBe(true);
    });
    it('getDecisionsForEntity returns entity decisions', async () => {
        const result = await controller.getDecisionsForEntity('mission', 'm1');
        expect(result.success).toBe(true);
    });
});
