import { Test, TestingModule } from '@nestjs/testing';
import { OfflineHashChainService } from './offline-hash-chain.service';
import { IntegrityLedgerService } from './ledger.service';

describe('OfflineHashChainService', () => {
    let service: OfflineHashChainService;
    const mockLedger = { createBlock: jest.fn().mockResolvedValue({ id: 'b1' }) };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OfflineHashChainService,
                { provide: IntegrityLedgerService, useValue: mockLedger },
            ],
        }).compile();
        service = module.get(OfflineHashChainService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createOfflineBlock creates a block', () => {
        const block = service.createOfflineBlock('ms1', 'r1', 'RECEIVE', 'actor1');
        expect(block.missionSessionId).toBe('ms1');
        expect(block.blockNumber).toBe(1);
        expect(block.prevHash).toBe('0'.repeat(64));
    });

    it('createOfflineBlocks creates batch', () => {
        const blocks = service.createOfflineBlocks('ms2', [
            { resourceId: 'r1', action: 'RECEIVE', actorId: 'a1' },
            { resourceId: 'r2', action: 'DISPATCH', actorId: 'a2' },
        ]);
        expect(blocks.length).toBe(2);
        expect(blocks[1].prevHash).toBe(blocks[0].currHash);
    });

    it('validateOfflineChain returns valid for a chain', () => {
        service.createOfflineBlock('ms3', 'r1', 'RECEIVE', 'a1');
        const result = service.validateOfflineChain('ms3');
        expect(result.isValid).toBe(true);
        expect(result.totalBlocks).toBe(1);
    });

    it('getChainState returns state', () => {
        service.createOfflineBlock('ms4', 'r1', 'RECEIVE', 'a1');
        const state = service.getChainState('ms4');
        expect(state).toBeDefined();
        expect(state!.totalBlocks).toBe(1);
    });

    it('getAllActiveChains returns all chains', () => {
        service.createOfflineBlock('ms5', 'r1', 'RECEIVE', 'a1');
        const chains = service.getAllActiveChains();
        expect(chains.length).toBeGreaterThan(0);
    });

    it('getOfflineBlocks returns blocks', () => {
        service.createOfflineBlock('ms6', 'r1', 'RECEIVE', 'a1');
        expect(service.getOfflineBlocks('ms6').length).toBe(1);
    });
});
