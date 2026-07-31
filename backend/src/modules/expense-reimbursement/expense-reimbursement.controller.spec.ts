import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseReimbursementController } from './expense-reimbursement.controller';
import { ExpenseReimbursementService } from './expense-reimbursement.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';
import { ClaimReviewAction } from './dto/expense.dto';

describe('ExpenseReimbursementController', () => {
    let controller: ExpenseReimbursementController;

    beforeEach(async () => {
        const service = {
            submitClaim: jest.fn().mockReturnValue({ id: 'c1', status: 'pending' }),
            reviewClaim: jest.fn().mockReturnValue({ id: 'c1', status: 'approved' }),
            markAsPaid: jest.fn().mockReturnValue({ id: 'c1', status: 'paid' }),
            getPendingClaims: jest.fn().mockReturnValue([]),
            getClaimsBySubmitter: jest.fn().mockReturnValue([]),
            getExpenseStats: jest.fn().mockReturnValue({ total: 50000 }),
            getExpenseCategories: jest.fn().mockReturnValue(['交通', '住宿', '餐飲']),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ExpenseReimbursementController],
            providers: [{ provide: ExpenseReimbursementService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ExpenseReimbursementController>(ExpenseReimbursementController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('submitClaim submits expense claim', () => {
        const result = controller.submitClaim({
            submitterId: 'u1',
            submitterName: '志工A',
            category: 'transport',
            description: '前往災區交通費',
            amount: 1000,
        });
        expect(result).toBeDefined();
    });

    it('reviewClaim reviews a claim', () => {
        const result = controller.reviewClaim('c1', {
            reviewerId: 'r1',
            reviewerName: '審核者',
            action: ClaimReviewAction.APPROVE,
        });
        expect(result).toBeDefined();
    });

    it('markAsPaid marks claim as paid', () => {
        const result = controller.markAsPaid('c1', {
            method: 'bank_transfer',
            amount: 1000,
            paidAt: new Date('2026-01-01'),
        });
        expect(result).toBeDefined();
    });

    it('getPending returns pending claims', () => {
        const result = controller.getPending('reviewer1');
        expect(result).toBeDefined();
    });

    it('getBySubmitter returns submitter claims', () => {
        const result = controller.getBySubmitter('u1');
        expect(result).toBeDefined();
    });

    it('getStats returns expense stats', () => {
        const result = controller.getStats('2026-01-01', '2026-01-31');
        expect(result).toBeDefined();
    });

    it('getCategories returns categories', () => {
        const result = controller.getCategories();
        expect(result).toBeDefined();
    });
});
