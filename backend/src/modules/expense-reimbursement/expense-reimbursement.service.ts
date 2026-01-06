import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Expense Reimbursement Service
 * Track and process expense reimbursement claims
 */
@Injectable()
export class ExpenseReimbursementService {
    private readonly logger = new Logger(ExpenseReimbursementService.name);
    private claims: Map<string, ExpenseClaim> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    /**
     * 提交報銷申請
     */
    submitClaim(data: ClaimInput): ExpenseClaim {
        const claim: ExpenseClaim = {
            id: `exp-${Date.now()}`,
            ...data,
            status: 'pending',
            approvals: [],
            submittedAt: new Date(),
        };

        this.claims.set(claim.id, claim);
        this.eventEmitter.emit('expense.submitted', claim);

        return claim;
    }

    /**
     * 審核報銷
     */
    reviewClaim(claimId: string, review: ClaimReview): ExpenseClaim {
        const claim = this.claims.get(claimId);
        if (!claim) throw new Error('Claim not found');

        claim.approvals.push({
            reviewerId: review.reviewerId,
            reviewerName: review.reviewerName,
            action: review.action,
            comment: review.comment,
            reviewedAt: new Date(),
        });

        if (review.action === 'approve') {
            claim.status = claim.amount > 10000 ? 'pending_final' : 'approved';
        } else if (review.action === 'reject') {
            claim.status = 'rejected';
        } else {
            claim.status = 'needs_revision';
        }

        this.eventEmitter.emit('expense.reviewed', claim);
        return claim;
    }

    /**
     * 標記已付款
     */
    markAsPaid(claimId: string, paymentInfo: PaymentInfo): ExpenseClaim {
        const claim = this.claims.get(claimId);
        if (!claim) throw new Error('Claim not found');

        claim.status = 'paid';
        claim.payment = paymentInfo;

        this.eventEmitter.emit('expense.paid', claim);
        return claim;
    }

    /**
     * 取得待審核清單
     */
    getPendingClaims(reviewerId?: string): ExpenseClaim[] {
        return Array.from(this.claims.values())
            .filter((c) => c.status === 'pending' || c.status === 'pending_final')
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    }

    /**
     * 取得個人報銷紀錄
     */
    getClaimsBySubmitter(submitterId: string): ExpenseClaim[] {
        return Array.from(this.claims.values())
            .filter((c) => c.submitterId === submitterId)
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    }

    /**
     * 取得報銷統計
     */
    getExpenseStats(period: { from: Date; to: Date }): ExpenseStats {
        const claims = Array.from(this.claims.values())
            .filter((c) => c.submittedAt >= period.from && c.submittedAt <= period.to);

        return {
            period,
            totalClaims: claims.length,
            totalAmount: claims.reduce((sum, c) => sum + c.amount, 0),
            byCategory: this.groupByCategory(claims),
            byStatus: {
                pending: claims.filter((c) => c.status === 'pending').length,
                approved: claims.filter((c) => c.status === 'approved').length,
                paid: claims.filter((c) => c.status === 'paid').length,
                rejected: claims.filter((c) => c.status === 'rejected').length,
            },
            avgProcessingDays: this.calculateAvgProcessingTime(claims),
        };
    }

    /**
     * 取得支出類別
     */
    getExpenseCategories(): ExpenseCategory[] {
        return [
            { id: 'transport', name: '交通費', requiresReceipt: true, maxAmount: 2000 },
            { id: 'meals', name: '餐費', requiresReceipt: true, maxAmount: 500 },
            { id: 'supplies', name: '物資採購', requiresReceipt: true, maxAmount: null },
            { id: 'equipment', name: '設備維修', requiresReceipt: true, maxAmount: 5000 },
            { id: 'training', name: '訓練費用', requiresReceipt: true, maxAmount: 3000 },
            { id: 'communication', name: '通訊費', requiresReceipt: false, maxAmount: 500 },
        ];
    }

    // Private methods
    private groupByCategory(claims: ExpenseClaim[]): Record<string, number> {
        return claims.reduce((acc, c) => {
            acc[c.category] = (acc[c.category] || 0) + c.amount;
            return acc;
        }, {} as Record<string, number>);
    }

    private calculateAvgProcessingTime(claims: ExpenseClaim[]): number {
        const paid = claims.filter((c) => c.status === 'paid' && c.payment);
        if (paid.length === 0) return 0;
        const totalDays = paid.reduce((sum, c) => {
            const days = (c.payment!.paidAt.getTime() - c.submittedAt.getTime()) / (24 * 3600000);
            return sum + days;
        }, 0);
        return Math.round(totalDays / paid.length * 10) / 10;
    }
}

// Types
interface ClaimInput {
    submitterId: string; submitterName: string; category: string;
    description: string; amount: number; receiptUrl?: string;
    incidentId?: string; eventId?: string;
}
interface ExpenseClaim extends ClaimInput {
    id: string; status: string; approvals: Approval[];
    submittedAt: Date; payment?: PaymentInfo;
}
interface ClaimReview { reviewerId: string; reviewerName: string; action: 'approve' | 'reject' | 'request_revision'; comment?: string; }
interface Approval { reviewerId: string; reviewerName: string; action: string; comment?: string; reviewedAt: Date; }
interface PaymentInfo { method: string; amount: number; paidAt: Date; reference?: string; }
interface ExpenseStats {
    period: { from: Date; to: Date }; totalClaims: number; totalAmount: number;
    byCategory: Record<string, number>; byStatus: Record<string, number>; avgProcessingDays: number;
}
interface ExpenseCategory { id: string; name: string; requiresReceipt: boolean; maxAmount: number | null; }
