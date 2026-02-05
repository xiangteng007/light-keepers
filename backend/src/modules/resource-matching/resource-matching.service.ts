import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Resource Matching Service
 * Platform for matching donated resources with disaster needs
 */
@Injectable()
export class ResourceMatchingService {
    private readonly logger = new Logger(ResourceMatchingService.name);

    private donations: Map<string, Donation> = new Map();
    private needs: Map<string, ResourceNeed> = new Map();
    private matches: Map<string, ResourceMatch> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    /**
     * Submit donation offer
     */
    submitDonation(donor: DonorInfo, items: DonationItem[]): Donation {
        const donation: Donation = {
            id: `don-${Date.now()}`,
            donor,
            items,
            status: 'pending',
            matchedNeeds: [],
            createdAt: new Date(),
            expiresAt: items[0]?.perishable
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        this.donations.set(donation.id, donation);

        // Auto-match with existing needs
        this.autoMatch(donation);

        return donation;
    }

    /**
     * Submit resource need
     */
    submitNeed(request: NeedRequest): ResourceNeed {
        const need: ResourceNeed = {
            id: `need-${Date.now()}`,
            ...request,
            status: 'open',
            matchedDonations: [],
            fulfilledQuantity: 0,
            createdAt: new Date(),
        };

        this.needs.set(need.id, need);

        // Check existing donations for matches
        this.findMatchingDonations(need);

        return need;
    }

    /**
     * Get available donations
     */
    getAvailableDonations(itemType?: string, region?: string): Donation[] {
        return Array.from(this.donations.values())
            .filter((d) => d.status === 'pending' || d.status === 'partially_matched')
            .filter((d) => !itemType || d.items.some((i) => i.type === itemType))
            .filter((d) => !region || d.donor.region === region || d.donor.shippingOptions.includes(region));
    }

    /**
     * Get open needs
     */
    getOpenNeeds(itemType?: string, urgency?: string): ResourceNeed[] {
        return Array.from(this.needs.values())
            .filter((n) => n.status === 'open' || n.status === 'partially_fulfilled')
            .filter((n) => !itemType || n.itemType === itemType)
            .filter((n) => !urgency || n.urgency === urgency)
            .sort((a, b) => {
                const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return (urgencyOrder[a.urgency] || 4) - (urgencyOrder[b.urgency] || 4);
            });
    }

    /**
     * Create match between donation and need
     */
    createMatch(donationId: string, needId: string, quantity: number): ResourceMatch {
        const donation = this.donations.get(donationId);
        const need = this.needs.get(needId);

        if (!donation) throw new Error('Donation not found');
        if (!need) throw new Error('Need not found');

        const match: ResourceMatch = {
            id: `match-${Date.now()}`,
            donationId,
            needId,
            itemType: need.itemType,
            quantity,
            status: 'pending_confirmation',
            donorContact: donation.donor.phone,
            recipientContact: need.contactPhone,
            pickupLocation: donation.donor.address,
            deliveryLocation: need.deliveryAddress,
            createdAt: new Date(),
            confirmedAt: null,
            completedAt: null,
        };

        this.matches.set(match.id, match);

        donation.matchedNeeds.push(match.id);
        need.matchedDonations.push(match.id);
        need.fulfilledQuantity += quantity;

        // Update statuses
        this.updateDonationStatus(donation);
        this.updateNeedStatus(need);

        this.eventEmitter.emit('resource.matched', match);

        return match;
    }

    /**
     * Confirm match
     */
    confirmMatch(matchId: string, confirmedBy: 'donor' | 'recipient'): ResourceMatch {
        const match = this.matches.get(matchId);
        if (!match) throw new Error('Match not found');

        match.status = 'confirmed';
        match.confirmedAt = new Date();

        this.eventEmitter.emit('resource.match.confirmed', { match, confirmedBy });

        return match;
    }

    /**
     * Complete match (delivery done)
     */
    completeMatch(matchId: string, feedback?: MatchFeedback): ResourceMatch {
        const match = this.matches.get(matchId);
        if (!match) throw new Error('Match not found');

        match.status = 'completed';
        match.completedAt = new Date();

        this.eventEmitter.emit('resource.match.completed', { match, feedback });

        return match;
    }

    /**
     * Get matching statistics
     */
    getStatistics(period?: { from: Date; to: Date }): MatchingStats {
        const donations = Array.from(this.donations.values());
        const needs = Array.from(this.needs.values());
        const matches = Array.from(this.matches.values());

        const filtered = period
            ? matches.filter((m) => m.createdAt >= period.from && m.createdAt <= period.to)
            : matches;

        return {
            totalDonations: donations.length,
            activeDonations: donations.filter((d) => d.status !== 'completed').length,
            totalNeeds: needs.length,
            fulfilledNeeds: needs.filter((n) => n.status === 'fulfilled').length,
            totalMatches: filtered.length,
            completedMatches: filtered.filter((m) => m.status === 'completed').length,
            averageMatchTime: this.calculateAverageMatchTime(filtered),
            topItemTypes: this.getTopItemTypes(filtered),
        };
    }

    /**
     * Get donor leaderboard
     */
    getDonorLeaderboard(limit: number = 10): DonorRanking[] {
        const donorStats: Map<string, { name: string; donations: number; matches: number }> = new Map();

        for (const donation of this.donations.values()) {
            const key = donation.donor.phone;
            const current = donorStats.get(key) || { name: donation.donor.name, donations: 0, matches: 0 };
            current.donations++;
            current.matches += donation.matchedNeeds.length;
            donorStats.set(key, current);
        }

        return Array.from(donorStats.entries())
            .map(([id, stats]) => ({ id, ...stats }))
            .sort((a, b) => b.matches - a.matches)
            .slice(0, limit)
            .map((d, index) => ({ rank: index + 1, ...d }));
    }

    // Private methods
    private autoMatch(donation: Donation): void {
        for (const item of donation.items) {
            const matchingNeeds = Array.from(this.needs.values())
                .filter((n) => n.itemType === item.type)
                .filter((n) => n.status === 'open' || n.status === 'partially_fulfilled')
                .filter((n) => donation.donor.shippingOptions.includes(n.region) || n.canPickup);

            for (const need of matchingNeeds) {
                const remainingNeed = need.quantity - need.fulfilledQuantity;
                if (remainingNeed > 0 && item.quantity > 0) {
                    const matchQty = Math.min(item.quantity, remainingNeed);
                    this.createMatch(donation.id, need.id, matchQty);
                    item.quantity -= matchQty;
                }
            }
        }
    }

    private findMatchingDonations(need: ResourceNeed): void {
        const matchingDonations = Array.from(this.donations.values())
            .filter((d) => d.status === 'pending' || d.status === 'partially_matched')
            .filter((d) => d.items.some((i) => i.type === need.itemType && i.quantity > 0))
            .filter((d) => d.donor.shippingOptions.includes(need.region) || need.canPickup);

        for (const donation of matchingDonations) {
            const item = donation.items.find((i) => i.type === need.itemType && i.quantity > 0);
            if (item) {
                const remainingNeed = need.quantity - need.fulfilledQuantity;
                if (remainingNeed > 0) {
                    const matchQty = Math.min(item.quantity, remainingNeed);
                    this.createMatch(donation.id, need.id, matchQty);
                    item.quantity -= matchQty;
                }
            }
        }
    }

    private updateDonationStatus(donation: Donation): void {
        const totalRemaining = donation.items.reduce((sum, i) => sum + i.quantity, 0);
        if (totalRemaining === 0) {
            donation.status = 'completed';
        } else if (donation.matchedNeeds.length > 0) {
            donation.status = 'partially_matched';
        }
    }

    private updateNeedStatus(need: ResourceNeed): void {
        if (need.fulfilledQuantity >= need.quantity) {
            need.status = 'fulfilled';
        } else if (need.fulfilledQuantity > 0) {
            need.status = 'partially_fulfilled';
        }
    }

    private calculateAverageMatchTime(matches: ResourceMatch[]): number {
        const completed = matches.filter((m) => m.completedAt);
        if (completed.length === 0) return 0;

        const totalHours = completed.reduce((sum, m) => {
            return sum + (m.completedAt!.getTime() - m.createdAt.getTime()) / 3600000;
        }, 0);

        return Math.round(totalHours / completed.length);
    }

    private getTopItemTypes(matches: ResourceMatch[]): { type: string; count: number }[] {
        const counts: Map<string, number> = new Map();

        for (const match of matches) {
            counts.set(match.itemType, (counts.get(match.itemType) || 0) + 1);
        }

        return Array.from(counts.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }
}

// Types
export interface DonorInfo {
    name: string;
    phone: string;
    email?: string;
    address: string;
    region: string;
    shippingOptions: string[];
    anonymous?: boolean;
}

export interface DonationItem {
    type: string;
    name: string;
    quantity: number;
    unit: string;
    condition: 'new' | 'good' | 'fair';
    perishable?: boolean;
    expiryDate?: Date;
}

export interface Donation {
    id: string;
    donor: DonorInfo;
    items: DonationItem[];
    status: 'pending' | 'partially_matched' | 'completed' | 'expired';
    matchedNeeds: string[];
    createdAt: Date;
    expiresAt: Date;
}

export interface NeedRequest {
    organizationName: string;
    contactName: string;
    contactPhone: string;
    itemType: string;
    itemName: string;
    quantity: number;
    unit: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    region: string;
    deliveryAddress: string;
    canPickup: boolean;
    description?: string;
}

export interface ResourceNeed extends NeedRequest {
    id: string;
    status: 'open' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
    matchedDonations: string[];
    fulfilledQuantity: number;
    createdAt: Date;
}

export interface ResourceMatch {
    id: string;
    donationId: string;
    needId: string;
    itemType: string;
    quantity: number;
    status: 'pending_confirmation' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
    donorContact: string;
    recipientContact: string;
    pickupLocation: string;
    deliveryLocation: string;
    createdAt: Date;
    confirmedAt: Date | null;
    completedAt: Date | null;
}

export interface MatchFeedback {
    rating: number;
    comment?: string;
}

export interface MatchingStats {
    totalDonations: number;
    activeDonations: number;
    totalNeeds: number;
    fulfilledNeeds: number;
    totalMatches: number;
    completedMatches: number;
    averageMatchTime: number;
    topItemTypes: { type: string; count: number }[];
}

export interface DonorRanking {
    rank: number;
    id: string;
    name: string;
    donations: number;
    matches: number;
}
