import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * NGO Integration Service
 * Integration with Red Cross, Tzu Chi, and other relief organizations
 */
@Injectable()
export class NgoIntegrationService {
    private readonly logger = new Logger(NgoIntegrationService.name);

    private registeredNgos: Map<string, NgoProfile> = new Map();
    private resourceOffers: Map<string, ResourceOffer[]> = new Map();
    private coordinationRequests: Map<string, CoordinationRequest[]> = new Map();

    constructor(private configService: ConfigService) {
        this.initializeKnownNgos();
    }

    /**
     * Register NGO partner
     */
    registerNgo(profile: NgoRegistration): NgoProfile {
        const ngo: NgoProfile = {
            id: `ngo-${Date.now()}`,
            ...profile,
            status: 'active',
            registeredAt: new Date(),
            lastSync: null,
        };

        this.registeredNgos.set(ngo.id, ngo);
        this.resourceOffers.set(ngo.id, []);

        this.logger.log(`NGO registered: ${ngo.name}`);

        return ngo;
    }

    /**
     * Get available NGO resources
     */
    getAvailableResources(type?: string, region?: string): AvailableResource[] {
        const resources: AvailableResource[] = [];

        for (const [ngoId, offers] of this.resourceOffers) {
            const ngo = this.registeredNgos.get(ngoId);
            if (!ngo) continue;

            for (const offer of offers) {
                if (type && offer.type !== type) continue;
                if (region && !offer.regions.includes(region)) continue;

                resources.push({
                    ...offer,
                    ngoId,
                    ngoName: ngo.name,
                });
            }
        }

        return resources;
    }

    /**
     * Submit resource offer from NGO
     */
    submitResourceOffer(ngoId: string, offer: ResourceOfferInput): ResourceOffer {
        const ngo = this.registeredNgos.get(ngoId);
        if (!ngo) throw new Error('NGO not found');

        const resourceOffer: ResourceOffer = {
            id: `offer-${Date.now()}`,
            ...offer,
            status: 'available',
            submittedAt: new Date(),
        };

        const offers = this.resourceOffers.get(ngoId) || [];
        offers.push(resourceOffer);
        this.resourceOffers.set(ngoId, offers);

        return resourceOffer;
    }

    /**
     * Request coordination with NGO
     */
    async requestCoordination(request: CoordinationRequestInput): Promise<CoordinationRequest> {
        const ngo = this.registeredNgos.get(request.ngoId);
        if (!ngo) throw new Error('NGO not found');

        const coordRequest: CoordinationRequest = {
            id: `coord-${Date.now()}`,
            ...request,
            status: 'pending',
            createdAt: new Date(),
            response: null,
        };

        const requests = this.coordinationRequests.get(request.ngoId) || [];
        requests.push(coordRequest);
        this.coordinationRequests.set(request.ngoId, requests);

        // Notify NGO via webhook if configured
        if (ngo.webhookUrl) {
            await this.notifyNgo(ngo, 'coordination_request', coordRequest);
        }

        return coordRequest;
    }

    /**
     * Get NGO coordination status
     */
    getCoordinationStatus(requestId: string): CoordinationRequest | null {
        for (const requests of this.coordinationRequests.values()) {
            const request = requests.find((r) => r.id === requestId);
            if (request) return request;
        }
        return null;
    }

    /**
     * Update coordination response (by NGO)
     */
    respondToCoordination(
        requestId: string,
        ngoId: string,
        response: CoordinationResponse,
    ): CoordinationRequest {
        const requests = this.coordinationRequests.get(ngoId);
        if (!requests) throw new Error('No requests for this NGO');

        const request = requests.find((r) => r.id === requestId);
        if (!request) throw new Error('Request not found');

        request.status = response.accepted ? 'accepted' : 'declined';
        request.response = response;

        return request;
    }

    /**
     * Sync resources with NGO API
     */
    async syncWithNgo(ngoId: string): Promise<SyncResult> {
        const ngo = this.registeredNgos.get(ngoId);
        if (!ngo) throw new Error('NGO not found');
        if (!ngo.apiEndpoint) {
            return { success: false, error: 'No API endpoint configured' };
        }

        try {
            // Would call actual NGO API
            ngo.lastSync = new Date();
            return { success: true, syncedAt: ngo.lastSync };
        } catch (error) {
            return { success: false, error: 'Sync failed' };
        }
    }

    // Private methods
    private initializeKnownNgos(): void {
        const knownNgos = [
            { name: '中華民國紅十字會', type: 'international', capabilities: ['medical', 'shelter', 'supplies'] },
            { name: '慈濟基金會', type: 'domestic', capabilities: ['supplies', 'volunteers', 'meals'] },
            { name: '世界展望會', type: 'international', capabilities: ['childcare', 'supplies', 'psycho'] },
        ];

        for (const ngo of knownNgos) {
            this.registerNgo({
                name: ngo.name,
                type: ngo.type as 'international' | 'domestic' | 'local',
                capabilities: ngo.capabilities,
                contactEmail: '',
                regions: ['全國'],
            });
        }
    }

    private async notifyNgo(ngo: NgoProfile, event: string, data: any): Promise<void> {
        if (!ngo.webhookUrl) return;

        try {
            await fetch(ngo.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, data }),
            });
        } catch (error) {
            this.logger.error(`Failed to notify NGO ${ngo.name}`, error);
        }
    }
}

// Types
interface NgoRegistration {
    name: string;
    type: 'international' | 'domestic' | 'local';
    capabilities: string[];
    contactEmail: string;
    contactPhone?: string;
    webhookUrl?: string;
    apiEndpoint?: string;
    regions: string[];
}

interface NgoProfile extends NgoRegistration {
    id: string;
    status: 'active' | 'inactive';
    registeredAt: Date;
    lastSync: Date | null;
}

interface ResourceOfferInput {
    type: string;
    name: string;
    quantity: number;
    unit: string;
    regions: string[];
    availableFrom: Date;
    availableUntil?: Date;
    conditions?: string;
}

interface ResourceOffer extends ResourceOfferInput {
    id: string;
    status: 'available' | 'reserved' | 'deployed';
    submittedAt: Date;
}

interface AvailableResource extends ResourceOffer {
    ngoId: string;
    ngoName: string;
}

interface CoordinationRequestInput {
    ngoId: string;
    missionId: string;
    requestType: 'resources' | 'personnel' | 'expertise' | 'logistics';
    description: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    requiredBy?: Date;
}

interface CoordinationRequest extends CoordinationRequestInput {
    id: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed';
    createdAt: Date;
    response: CoordinationResponse | null;
}

interface CoordinationResponse {
    accepted: boolean;
    message?: string;
    resourcesProvided?: string[];
    personnelCount?: number;
    estimatedArrival?: Date;
}

interface SyncResult {
    success: boolean;
    syncedAt?: Date;
    error?: string;
}
