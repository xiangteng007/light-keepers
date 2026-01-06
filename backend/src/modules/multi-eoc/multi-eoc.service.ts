import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Multi-EOC Service
 * Cross-county Emergency Operations Center coordination
 */
@Injectable()
export class MultiEocService {
    private readonly logger = new Logger(MultiEocService.name);

    private eocRegistry: Map<string, EocInfo> = new Map();
    private federatedMissions: Map<string, FederatedMission> = new Map();
    private resourcePool: Map<string, SharedResource[]> = new Map();

    constructor(private configService: ConfigService) { }

    /**
     * Register EOC to federation
     */
    registerEoc(eoc: EocRegistration): EocInfo {
        const eocInfo: EocInfo = {
            id: eoc.id,
            name: eoc.name,
            region: eoc.region,
            jurisdiction: eoc.jurisdiction,
            endpoint: eoc.endpoint,
            capabilities: eoc.capabilities,
            status: 'online',
            lastSync: new Date(),
        };

        this.eocRegistry.set(eoc.id, eocInfo);
        this.logger.log(`EOC registered: ${eoc.name} (${eoc.region})`);

        return eocInfo;
    }

    /**
     * Create federated mission across multiple EOCs
     */
    async createFederatedMission(config: FederatedMissionConfig): Promise<FederatedMission> {
        const mission: FederatedMission = {
            id: `fed-${Date.now()}`,
            name: config.name,
            leadEocId: config.leadEocId,
            participatingEocs: config.participatingEocs,
            incidentType: config.incidentType,
            affectedArea: config.affectedArea,
            status: 'active',
            resourceRequests: [],
            sharedResources: [],
            communications: [],
            createdAt: new Date(),
        };

        // Notify all participating EOCs
        for (const eocId of config.participatingEocs) {
            await this.notifyEoc(eocId, 'mission.created', mission);
        }

        this.federatedMissions.set(mission.id, mission);

        return mission;
    }

    /**
     * Request resources from other EOCs
     */
    async requestResources(
        missionId: string,
        request: ResourceRequest,
    ): Promise<ResourceRequestResult> {
        const mission = this.federatedMissions.get(missionId);
        if (!mission) throw new Error('Mission not found');

        const availableResources: SharedResource[] = [];

        // Query all participating EOCs
        for (const eocId of mission.participatingEocs) {
            if (eocId === request.requestingEocId) continue;

            const resources = await this.queryEocResources(eocId, request.resourceType);
            availableResources.push(...resources);
        }

        // Auto-allocate if possible
        const allocated = availableResources.filter((r) => r.quantity >= request.quantity);

        if (allocated.length > 0) {
            const selected = allocated[0];
            mission.resourceRequests.push({
                id: `req-${Date.now()}`,
                ...request,
                status: 'approved',
                allocatedFrom: selected.eocId,
                allocatedAt: new Date(),
            });

            return { success: true, allocatedResource: selected };
        }

        mission.resourceRequests.push({
            id: `req-${Date.now()}`,
            ...request,
            status: 'pending',
            allocatedFrom: null,
            allocatedAt: null,
        });

        return { success: false, pending: true, availableOptions: availableResources };
    }

    /**
     * Share resource with federation
     */
    shareResource(eocId: string, resource: SharedResource): void {
        const pool = this.resourcePool.get(eocId) || [];
        pool.push({ ...resource, sharedAt: new Date() });
        this.resourcePool.set(eocId, pool);
    }

    /**
     * Get federation status
     */
    getFederationStatus(): FederationStatus {
        const eocs = Array.from(this.eocRegistry.values());
        const missions = Array.from(this.federatedMissions.values());

        return {
            totalEocs: eocs.length,
            onlineEocs: eocs.filter((e) => e.status === 'online').length,
            activeMissions: missions.filter((m) => m.status === 'active').length,
            sharedResources: Array.from(this.resourcePool.values()).flat().length,
        };
    }

    /**
     * Broadcast alert to all EOCs
     */
    async broadcastAlert(alert: FederationAlert): Promise<void> {
        for (const eoc of this.eocRegistry.values()) {
            await this.notifyEoc(eoc.id, 'alert.broadcast', alert);
        }
        this.logger.warn(`Federation alert broadcast: ${alert.title}`);
    }

    // Private
    private async notifyEoc(eocId: string, event: string, data: any): Promise<void> {
        const eoc = this.eocRegistry.get(eocId);
        if (!eoc) return;
        // Would send webhook/API call to EOC endpoint
    }

    private async queryEocResources(eocId: string, type: string): Promise<SharedResource[]> {
        const pool = this.resourcePool.get(eocId) || [];
        return pool.filter((r) => r.type === type && r.available);
    }
}

// Types
interface EocRegistration {
    id: string;
    name: string;
    region: string;
    jurisdiction: string[];
    endpoint: string;
    capabilities: string[];
}

interface EocInfo extends EocRegistration {
    status: 'online' | 'offline' | 'busy';
    lastSync: Date;
}

interface FederatedMissionConfig {
    name: string;
    leadEocId: string;
    participatingEocs: string[];
    incidentType: string;
    affectedArea: { lat: number; lng: number; radius: number };
}

interface FederatedMission extends FederatedMissionConfig {
    id: string;
    status: 'active' | 'completed' | 'suspended';
    resourceRequests: any[];
    sharedResources: SharedResource[];
    communications: any[];
    createdAt: Date;
}

interface ResourceRequest {
    requestingEocId: string;
    resourceType: string;
    quantity: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    destination: { lat: number; lng: number };
}

interface SharedResource {
    id: string;
    eocId: string;
    type: string;
    name: string;
    quantity: number;
    available: boolean;
    location: { lat: number; lng: number };
    sharedAt?: Date;
}

interface ResourceRequestResult {
    success: boolean;
    allocatedResource?: SharedResource;
    pending?: boolean;
    availableOptions?: SharedResource[];
}

interface FederationStatus {
    totalEocs: number;
    onlineEocs: number;
    activeMissions: number;
    sharedResources: number;
}

interface FederationAlert {
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    affectedRegions: string[];
}
