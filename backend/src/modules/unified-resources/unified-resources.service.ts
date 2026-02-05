/**
 * Unified Resources Service
 * 
 * Facade service for all resource management operations:
 * - Donation matching and fulfillment
 * - Resource allocation optimization
 * - Depot location suggestions
 * - Transport route optimization
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { 
    ResourceMatchingService, 
    Donation, 
    DonationItem,
    ResourceNeed, 
    ResourceMatch, 
    MatchingStats, 
    DonorRanking 
} from '../resource-matching/resource-matching.service';
import { ResourceOptimizationService, OptimizationResult, DepotSuggestion, OptimizedRoute } from '../resource-optimization/resource-optimization.service';

@Injectable()
export class UnifiedResourcesService {
    private readonly logger = new Logger(UnifiedResourcesService.name);

    constructor(
        @Inject(forwardRef(() => ResourceMatchingService))
        private readonly matchingService: ResourceMatchingService,
        @Inject(forwardRef(() => ResourceOptimizationService))
        private readonly optimizationService: ResourceOptimizationService,
    ) {}

    // ==================== Status ====================

    /**
     * Get overall resource management status
     */
    getStatus(): { 
        matchingReady: boolean;
        optimizationReady: boolean;
    } {
        return {
            matchingReady: true,
            optimizationReady: true,
        };
    }

    // ==================== Donation Matching ====================

    /**
     * Submit a new donation
     */
    submitDonation(donor: {
        name: string;
        phone: string;
        email?: string;
        address: string;
        region: string;
        shippingOptions: string[];
        anonymous?: boolean;
    }, items: {
        type: string;
        name: string;
        quantity: number;
        unit: string;
        condition: 'new' | 'good' | 'fair';
        perishable?: boolean;
        expiryDate?: Date;
    }[]): Donation {
        return this.matchingService.submitDonation(donor, items);
    }

    /**
     * Submit a resource need
     */
    submitNeed(request: {
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
    }): ResourceNeed {
        return this.matchingService.submitNeed(request);
    }

    /**
     * Get available donations
     */
    getAvailableDonations(itemType?: string, region?: string): Donation[] {
        return this.matchingService.getAvailableDonations(itemType, region);
    }

    /**
     * Get open needs
     */
    getOpenNeeds(itemType?: string, urgency?: string): ResourceNeed[] {
        return this.matchingService.getOpenNeeds(itemType, urgency);
    }

    /**
     * Create a match between donation and need
     */
    createMatch(donationId: string, needId: string, quantity: number): ResourceMatch {
        return this.matchingService.createMatch(donationId, needId, quantity);
    }

    /**
     * Confirm a match
     */
    confirmMatch(matchId: string, confirmedBy: 'donor' | 'recipient'): ResourceMatch {
        return this.matchingService.confirmMatch(matchId, confirmedBy);
    }

    /**
     * Complete a match (delivery done)
     */
    completeMatch(matchId: string, feedback?: { rating: number; comment?: string }): ResourceMatch {
        return this.matchingService.completeMatch(matchId, feedback);
    }

    /**
     * Get matching statistics
     */
    getMatchingStats(period?: { from: Date; to: Date }): MatchingStats {
        return this.matchingService.getStatistics(period);
    }

    /**
     * Get donor leaderboard
     */
    getDonorLeaderboard(limit: number = 10): DonorRanking[] {
        return this.matchingService.getDonorLeaderboard(limit);
    }

    // ==================== Resource Optimization ====================

    /**
     * Optimize resource allocation across locations
     */
    optimizeAllocation(config: {
        resources: Array<{
            id: string;
            type: string;
            available: number;
            location: { lat: number; lng: number };
        }>;
        demands: Array<{
            id: string;
            resourceType: string;
            quantity: number;
            location: { lat: number; lng: number };
            priority: 'low' | 'medium' | 'high' | 'critical';
        }>;
        constraints?: {
            maxDistance?: number;
            maxTime?: number;
        };
    }): OptimizationResult {
        return this.optimizationService.optimizeAllocation(config);
    }

    /**
     * Suggest optimal depot locations
     */
    suggestDepotLocations(
        demandPoints: Array<{ lat: number; lng: number }>,
        numDepots: number,
    ): DepotSuggestion[] {
        return this.optimizationService.suggestDepotLocations(demandPoints, numDepots);
    }

    /**
     * Optimize transport routes
     */
    optimizeRoutes(
        origin: { lat: number; lng: number },
        destinations: Array<{ lat: number; lng: number }>,
    ): OptimizedRoute {
        return this.optimizationService.optimizeRoutes(origin, destinations);
    }

    // ==================== Combined Operations ====================

    /**
     * Smart resource allocation combining matching and optimization
     */
    async smartAllocateResources(params: {
        region?: string;
        itemType?: string;
        urgency?: 'low' | 'medium' | 'high' | 'critical';
    }): Promise<{
        availableDonations: Donation[];
        openNeeds: ResourceNeed[];
        suggestedAllocations: OptimizationResult | null;
        timestamp: Date;
    }> {
        this.logger.log(`Smart allocation for region: ${params.region || 'all'}`);

        // Get available donations and open needs
        const availableDonations = this.matchingService.getAvailableDonations(params.itemType, params.region);
        const openNeeds = this.matchingService.getOpenNeeds(params.itemType, params.urgency);

        // Convert to optimization format if we have data
        let suggestedAllocations = null;
        if (availableDonations.length > 0 && openNeeds.length > 0) {
            const resources = availableDonations
                .filter((d: Donation) => d.donor?.address)
                .map((d: Donation) => ({
                    id: d.id,
                    type: d.items?.[0]?.type || 'general',
                    available: d.items?.reduce((sum: number, i: DonationItem) => sum + (i.quantity || 0), 0) || 0,
                    location: { lat: 25.0330, lng: 121.5654 }, // Default if no geo
                }));

            const demands = openNeeds.map((n: any) => ({
                id: n.id,
                resourceType: n.itemType || 'general',
                quantity: n.quantity || 0,
                location: { lat: 25.0330, lng: 121.5654 }, // Default if no geo
                priority: n.urgency || 'medium',
            }));

            if (resources.length > 0 && demands.length > 0) {
                suggestedAllocations = this.optimizationService.optimizeAllocation({
                    resources,
                    demands,
                });
            }
        }

        return {
            availableDonations,
            openNeeds,
            suggestedAllocations,
            timestamp: new Date(),
        };
    }
}
