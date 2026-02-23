import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IntegrityLedgerService } from './ledger.service';
import { SupplyChainBlock } from './entities/supply-chain-block.entity';

describe('IntegrityLedgerService', () => {
    let service: IntegrityLedgerService;
    const mockBlock = { id: 'b1', blockNumber: 1, hash: 'abc', previousHash: '000', resourceId: 'r1', action: 'RECEIVE' };

    beforeEach(async () => {
        const repo = {
            create: jest.fn().mockReturnValue(mockBlock),
            save: jest.fn().mockResolvedValue(mockBlock),
            findOne: jest.fn().mockResolvedValue(mockBlock),
            find: jest.fn().mockResolvedValue([mockBlock]),
            count: jest.fn().mockResolvedValue(1),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockBlock]),
                getRawOne: jest.fn().mockResolvedValue({ count: '1' }),
                getCount: jest.fn().mockResolvedValue(1),
                getRawMany: jest.fn().mockResolvedValue([{ resourceId: 'r1' }]),
            }),
        };
        const ds = { createQueryRunner: jest.fn().mockReturnValue({ connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(), manager: { save: jest.fn().mockResolvedValue(mockBlock) } }) };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IntegrityLedgerService,
                { provide: getRepositoryToken(SupplyChainBlock), useValue: repo },
                { provide: DataSource, useValue: ds },
            ],
        }).compile();
        service = module.get(IntegrityLedgerService);
    });

    it('should be defined', () => expect(service).toBeDefined());
    it('getRecentBlocks', async () => expect(await service.getRecentBlocks()).toEqual([mockBlock]));
});
