import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Donation Tracking Service
 * Track donations and fund flow transparency
 */
@Injectable()
export class DonationTrackingService {
    private readonly logger = new Logger(DonationTrackingService.name);
    private donations: Map<string, Donation> = new Map();
    private allocations: Map<string, FundAllocation[]> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    /**
     * 記錄捐款
     */
    recordDonation(data: DonationInput): Donation {
        const donation: Donation = {
            id: `don-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            ...data,
            status: 'received',
            allocations: [],
            createdAt: new Date(),
        };

        this.donations.set(donation.id, donation);
        this.allocations.set(donation.id, []);

        this.eventEmitter.emit('donation.received', donation);

        return donation;
    }

    /**
     * 分配捐款
     */
    allocateFunds(donationId: string, allocation: AllocationInput): FundAllocation {
        const donation = this.donations.get(donationId);
        if (!donation) throw new Error('Donation not found');

        const allocated: FundAllocation = {
            id: `alloc-${Date.now()}`,
            donationId,
            ...allocation,
            status: 'allocated',
            allocatedAt: new Date(),
        };

        donation.allocations.push(allocated.id);
        const allocs = this.allocations.get(donationId) || [];
        allocs.push(allocated);
        this.allocations.set(donationId, allocs);

        // 檢查是否完全分配
        const totalAllocated = allocs.reduce((sum, a) => sum + a.amount, 0);
        if (totalAllocated >= donation.amount) {
            donation.status = 'fully_allocated';
        } else {
            donation.status = 'partially_allocated';
        }

        return allocated;
    }

    /**
     * 取得捐款追蹤
     */
    getDonationTrail(donationId: string): DonationTrail {
        const donation = this.donations.get(donationId);
        if (!donation) throw new Error('Donation not found');

        const allocs = this.allocations.get(donationId) || [];
        const totalAllocated = allocs.reduce((sum, a) => sum + a.amount, 0);

        return {
            donation,
            allocations: allocs,
            totalAllocated,
            remaining: donation.amount - totalAllocated,
            timeline: this.buildTimeline(donation, allocs),
        };
    }

    /**
     * 取得捐款者報表
     */
    getDonorReport(donorId: string): DonorReport {
        const donorDonations = Array.from(this.donations.values())
            .filter((d) => d.donorId === donorId);

        const totalDonated = donorDonations.reduce((sum, d) => sum + d.amount, 0);

        return {
            donorId,
            totalDonations: donorDonations.length,
            totalAmount: totalDonated,
            donations: donorDonations.map((d) => ({
                id: d.id,
                amount: d.amount,
                date: d.createdAt,
                purpose: d.purpose,
                status: d.status,
            })),
            impactSummary: this.calculateImpact(donorDonations),
        };
    }

    /**
     * 取得公開統計
     */
    getPublicStats(): PublicDonationStats {
        const allDonations = Array.from(this.donations.values());

        return {
            totalDonations: allDonations.length,
            totalAmount: allDonations.reduce((sum, d) => sum + d.amount, 0),
            byPurpose: this.groupByPurpose(allDonations),
            recentDonations: allDonations
                .filter((d) => !d.anonymous)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 10)
                .map((d) => ({ amount: d.amount, purpose: d.purpose, date: d.createdAt })),
            lastUpdated: new Date(),
        };
    }

    // Private methods
    private buildTimeline(donation: Donation, allocs: FundAllocation[]): TimelineEvent[] {
        const events: TimelineEvent[] = [
            { date: donation.createdAt, event: '收到捐款', amount: donation.amount },
        ];

        for (const alloc of allocs) {
            events.push({
                date: alloc.allocatedAt,
                event: `分配至 ${alloc.purpose}`,
                amount: alloc.amount,
            });
        }

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    private calculateImpact(donations: Donation[]): string[] {
        const total = donations.reduce((sum, d) => sum + d.amount, 0);
        const impacts: string[] = [];
        if (total >= 10000) impacts.push(`可提供 ${Math.floor(total / 100)} 份緊急物資`);
        if (total >= 50000) impacts.push(`可支援 ${Math.floor(total / 1000)} 小時志工訓練`);
        return impacts;
    }

    private groupByPurpose(donations: Donation[]): Record<string, number> {
        return donations.reduce((acc, d) => {
            acc[d.purpose || 'general'] = (acc[d.purpose || 'general'] || 0) + d.amount;
            return acc;
        }, {} as Record<string, number>);
    }
}

// Types
interface DonationInput { donorId?: string; donorName?: string; amount: number; currency: string; purpose?: string; anonymous?: boolean; paymentMethod: string; }
interface Donation extends DonationInput { id: string; status: string; allocations: string[]; createdAt: Date; }
interface AllocationInput { purpose: string; amount: number; description?: string; incidentId?: string; }
interface FundAllocation extends AllocationInput { id: string; donationId: string; status: string; allocatedAt: Date; }
interface DonationTrail { donation: Donation; allocations: FundAllocation[]; totalAllocated: number; remaining: number; timeline: TimelineEvent[]; }
interface TimelineEvent { date: Date; event: string; amount: number; }
interface DonorReport { donorId: string; totalDonations: number; totalAmount: number; donations: any[]; impactSummary: string[]; }
interface PublicDonationStats { totalDonations: number; totalAmount: number; byPurpose: Record<string, number>; recentDonations: any[]; lastUpdated: Date; }
