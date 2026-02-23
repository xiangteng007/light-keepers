import { Test, TestingModule } from '@nestjs/testing';
import { PublicAuditController } from './public-audit.controller';
import { IntegrityLedgerService } from './ledger.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicAuditLog } from './entities/supply-chain-block.entity';

describe('PublicAuditController', () => {
    let controller: PublicAuditController;

    beforeEach(async () => {
        const ledgerService = {
            getByReceiptNumber: jest.fn().mockResolvedValue([]),
            getResourceHistory: jest.fn().mockResolvedValue({ blocks: [] }),
            validateChain: jest.fn().mockResolvedValue({ isValid: true, totalBlocks: 5 }),
            getStats: jest.fn().mockResolvedValue({ totalBlocks: 100 }),
            getRecentBlocks: jest.fn().mockResolvedValue([]),
        };

        const auditLogRepo = {
            save: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PublicAuditController],
            providers: [
                { provide: IntegrityLedgerService, useValue: ledgerService },
                { provide: getRepositoryToken(PublicAuditLog), useValue: auditLogRepo },
            ],
        }).compile();

        controller = module.get<PublicAuditController>(PublicAuditController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('searchByReceipt returns not found for empty results', async () => {
        const req = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any;
        const result = await controller.searchByReceipt('TRK001', req);
        expect(result.success).toBe(false);
    });

    it('getResourceHistory returns history', async () => {
        const result = await controller.getResourceHistory('r1');
        expect(result.success).toBe(true);
    });

    it('validateChain validates chain', async () => {
        const result = await controller.validateChain('r1');
        expect(result.success).toBe(true);
    });

    it('getStats returns stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
    });

    it('getRecentActivity returns recent blocks', async () => {
        const result = await controller.getRecentActivity('10');
        expect(result.success).toBe(true);
    });
});
