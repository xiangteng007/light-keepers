import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExpenseReimbursementService } from './expense-reimbursement.service';

const delay = (ms = 2) => new Promise(r => setTimeout(r, ms));

describe('ExpenseReimbursementService', () => {
    let service: ExpenseReimbursementService;
    let eventEmitter: { emit: jest.Mock };

    const baseClaim = {
        submitterId: 'user-1',
        submitterName: '張三',
        category: 'transport',
        description: '前往災區交通費',
        amount: 1500,
        receiptUrl: 'http://receipt.jpg',
    };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExpenseReimbursementService,
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<ExpenseReimbursementService>(ExpenseReimbursementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== submitClaim =====
    describe('submitClaim', () => {
        it('should create claim with pending status', () => {
            const claim = service.submitClaim(baseClaim);
            expect(claim.id).toContain('exp-');
            expect(claim.status).toBe('pending');
            expect(claim.approvals).toHaveLength(0);
            expect(eventEmitter.emit).toHaveBeenCalledWith('expense.submitted', claim);
        });
    });

    // ===== reviewClaim =====
    describe('reviewClaim', () => {
        it('should approve small claim directly', () => {
            const claim = service.submitClaim(baseClaim);
            const reviewed = service.reviewClaim(claim.id, {
                reviewerId: 'rev-1', reviewerName: '主管', action: 'approve',
            });
            expect(reviewed.status).toBe('approved');
            expect(reviewed.approvals).toHaveLength(1);
            expect(eventEmitter.emit).toHaveBeenCalledWith('expense.reviewed', reviewed);
        });

        it('should set pending_final for amount > 10000', () => {
            const bigClaim = service.submitClaim({ ...baseClaim, amount: 15000 });
            const reviewed = service.reviewClaim(bigClaim.id, {
                reviewerId: 'rev-1', reviewerName: '主管', action: 'approve',
            });
            expect(reviewed.status).toBe('pending_final');
        });

        it('should reject claim', () => {
            const claim = service.submitClaim(baseClaim);
            const reviewed = service.reviewClaim(claim.id, {
                reviewerId: 'rev-1', reviewerName: '主管', action: 'reject', comment: '缺收據',
            });
            expect(reviewed.status).toBe('rejected');
        });

        it('should request revision', () => {
            const claim = service.submitClaim(baseClaim);
            const reviewed = service.reviewClaim(claim.id, {
                reviewerId: 'rev-1', reviewerName: '主管', action: 'request_revision',
            });
            expect(reviewed.status).toBe('needs_revision');
        });

        it('should throw for unknown claim', () => {
            expect(() => service.reviewClaim('fake', {
                reviewerId: 'rev-1', reviewerName: 'x', action: 'approve',
            })).toThrow('Claim not found');
        });
    });

    // ===== markAsPaid =====
    describe('markAsPaid', () => {
        it('should mark claim as paid', () => {
            const claim = service.submitClaim(baseClaim);
            const paid = service.markAsPaid(claim.id, { method: 'bank', amount: 1500, paidAt: new Date() });
            expect(paid.status).toBe('paid');
            expect(paid.payment!.method).toBe('bank');
            expect(eventEmitter.emit).toHaveBeenCalledWith('expense.paid', paid);
        });

        it('should throw for unknown claim', () => {
            expect(() => service.markAsPaid('fake', { method: 'cash', amount: 0, paidAt: new Date() })).toThrow();
        });
    });

    // ===== getPendingClaims =====
    describe('getPendingClaims', () => {
        it('should return pending and pending_final claims', async () => {
            service.submitClaim(baseClaim);
            await delay();
            service.submitClaim({ ...baseClaim, amount: 15000 });
            await delay();
            const bigClaim = service.submitClaim({ ...baseClaim, amount: 12000 });
            service.reviewClaim(bigClaim.id, { reviewerId: 'r', reviewerName: 'r', action: 'approve' });
            const pending = service.getPendingClaims();
            expect(pending).toHaveLength(3); // 2 pending + 1 pending_final
        });
    });

    // ===== getClaimsBySubmitter =====
    describe('getClaimsBySubmitter', () => {
        it('should filter by submitter', async () => {
            service.submitClaim(baseClaim);
            await delay();
            service.submitClaim({ ...baseClaim, submitterId: 'user-2', submitterName: '李四' });
            const claims = service.getClaimsBySubmitter('user-1');
            expect(claims).toHaveLength(1);
        });
    });

    // ===== getExpenseStats =====
    describe('getExpenseStats', () => {
        it('should compute stats within period', async () => {
            service.submitClaim(baseClaim);
            await delay();
            service.submitClaim({ ...baseClaim, category: 'meals', amount: 300 });
            const stats = service.getExpenseStats({ from: new Date(0), to: new Date(Date.now() + 86400000) });
            expect(stats.totalClaims).toBe(2);
            expect(stats.totalAmount).toBe(1800);
            expect(stats.byCategory['transport']).toBe(1500);
            expect(stats.byCategory['meals']).toBe(300);
            expect(stats.byStatus.pending).toBe(2);
        });
    });

    // ===== getExpenseCategories =====
    describe('getExpenseCategories', () => {
        it('should return 6 categories', () => {
            const cats = service.getExpenseCategories();
            expect(cats).toHaveLength(6);
            const ids = cats.map(c => c.id);
            expect(ids).toContain('transport');
            expect(ids).toContain('meals');
            expect(ids).toContain('communication');
        });
    });
});
