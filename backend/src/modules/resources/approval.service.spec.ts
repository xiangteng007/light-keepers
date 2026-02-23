import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApprovalService } from './approval.service';
import { ResourceTransaction } from './resource-transaction.entity';
import { Resource } from './resources.entity';

describe('ApprovalService', () => {
    let service: ApprovalService;

    const mockTx = {
        id: 'tx1', type: 'out', approvalStatus: 'pending', quantity: 5,
        resource: { id: 'r1', quantity: 100 },
    };

    const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTx], 1]),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApprovalService,
                { provide: getRepositoryToken(ResourceTransaction), useValue: {
                    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
                    findOne: jest.fn().mockResolvedValue({ ...mockTx }),
                    save: jest.fn().mockImplementation(tx => Promise.resolve(tx)),
                } },
                { provide: getRepositoryToken(Resource), useValue: {
                    save: jest.fn().mockResolvedValue({}),
                } },
            ],
        }).compile();
        service = module.get(ApprovalService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getPendingApprovals returns pending', async () => {
        const result = await service.getPendingApprovals();
        expect(result.total).toBe(1);
        expect(result.transactions.length).toBe(1);
    });

    it('approve updates status', async () => {
        const result = await service.approve({ transactionId: 'tx1', approverUid: 'a1', approverName: 'Admin' });
        expect(result.approvalStatus).toBe('approved');
    });

    it('reject updates status', async () => {
        const result = await service.reject({ transactionId: 'tx1', approverUid: 'a1', approverName: 'Admin', rejectReason: '不符合規範的資源' });
        expect(result.approvalStatus).toBe('rejected');
    });

    it('getTransactionDetail returns tx', async () => {
        const result = await service.getTransactionDetail('tx1');
        expect(result.id).toBe('tx1');
    });
});
