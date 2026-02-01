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

    /**
     * P1: Transfer command authority between EOCs
     */
    async transferCommand(
        missionId: string,
        fromEocId: string,
        toEocId: string,
        reason: string,
    ): Promise<{ success: boolean; transferredAt?: Date }> {
        const mission = this.federatedMissions.get(missionId);
        if (!mission) throw new Error('Mission not found');

        const fromEoc = this.eocRegistry.get(fromEocId);
        const toEoc = this.eocRegistry.get(toEocId);
        
        if (!fromEoc || !toEoc) {
            throw new Error('Invalid EOC ID');
        }

        if (mission.leadEocId !== fromEocId) {
            throw new Error('Only lead EOC can transfer command');
        }

        const now = new Date();
        
        // Record transfer
        if (!mission.commandTransfers) {
            mission.commandTransfers = [];
        }
        mission.commandTransfers.push({
            from: fromEocId,
            to: toEocId,
            reason,
            transferredAt: now,
        });
        
        // Update lead
        mission.leadEocId = toEocId;
        
        // Notify all participating EOCs
        for (const eocId of mission.participatingEocs) {
            await this.notifyEoc(eocId, 'command.transferred', {
                missionId,
                newLeadEocId: toEocId,
                previousLeadEocId: fromEocId,
                reason,
            });
        }

        this.logger.log(`Command transferred: ${fromEoc.name} → ${toEoc.name} for mission ${missionId}`);

        return { success: true, transferredAt: now };
    }

    /**
     * P1: Merge Common Operational Picture (COP) from multiple EOCs
     */
    mergeOperationalPicture(eocIds: string[]): CommonOperationalPicture {
        const incidents: any[] = [];
        const resources: SharedResource[] = [];
        const personnel: any[] = [];
        const boundaries: any[] = [];

        for (const eocId of eocIds) {
            const eoc = this.eocRegistry.get(eocId);
            if (!eoc) continue;

            // Add EOC's shared resources
            const eocResources = this.resourcePool.get(eocId) || [];
            resources.push(...eocResources);

            // Add EOC boundary
            boundaries.push({
                eocId,
                eocName: eoc.name,
                jurisdiction: eoc.jurisdiction,
            });
        }

        // Merge active missions
        for (const mission of this.federatedMissions.values()) {
            if (eocIds.includes(mission.leadEocId) || 
                mission.participatingEocs.some(id => eocIds.includes(id))) {
                incidents.push({
                    missionId: mission.id,
                    name: mission.name,
                    type: mission.incidentType,
                    leadEoc: mission.leadEocId,
                    status: mission.status,
                    affectedArea: mission.affectedArea,
                });
            }
        }

        return {
            generatedAt: new Date(),
            eocCount: eocIds.length,
            incidents,
            resources,
            personnel,
            boundaries,
            legend: {
                resourceTypes: [...new Set(resources.map(r => r.type))],
            },
        };
    }

    /**
     * P1: Share resources between specific EOCs
     */
    shareResourcesBetweenEocs(
        fromEocId: string,
        toEocId: string,
        resources: SharedResource[],
    ): { success: boolean; transferred: number } {
        const fromEoc = this.eocRegistry.get(fromEocId);
        const toEoc = this.eocRegistry.get(toEocId);

        if (!fromEoc || !toEoc) {
            return { success: false, transferred: 0 };
        }

        let transferred = 0;
        const fromPool = this.resourcePool.get(fromEocId) || [];
        const toPool = this.resourcePool.get(toEocId) || [];

        for (const resource of resources) {
            const index = fromPool.findIndex(r => r.id === resource.id);
            if (index !== -1) {
                const [transferredResource] = fromPool.splice(index, 1);
                transferredResource.eocId = toEocId;
                transferredResource.sharedAt = new Date();
                toPool.push(transferredResource);
                transferred++;
            }
        }

        this.resourcePool.set(fromEocId, fromPool);
        this.resourcePool.set(toEocId, toPool);

        this.logger.log(`Transferred ${transferred} resources: ${fromEoc.name} → ${toEoc.name}`);

        return { success: true, transferred };
    }

    /**
     * P1: Request mutual aid from neighboring EOCs
     */
    async requestMutualAid(
        requestingEocId: string,
        aidRequest: MutualAidRequest,
    ): Promise<MutualAidResponse[]> {
        const requestingEoc = this.eocRegistry.get(requestingEocId);
        if (!requestingEoc) throw new Error('Requesting EOC not found');

        const responses: MutualAidResponse[] = [];

        // Find nearby EOCs by region
        for (const [eocId, eoc] of this.eocRegistry.entries()) {
            if (eocId === requestingEocId) continue;
            
            // Check if EOC has requested capability
            if (aidRequest.requiredCapabilities.some(cap => eoc.capabilities.includes(cap))) {
                await this.notifyEoc(eocId, 'mutual_aid.request', {
                    requestingEocId,
                    requestingEocName: requestingEoc.name,
                    ...aidRequest,
                });

                responses.push({
                    eocId,
                    eocName: eoc.name,
                    status: 'pending',
                    estimatedResponseTime: null,
                });
            }
        }

        this.logger.log(`Mutual aid request from ${requestingEoc.name}: ${aidRequest.incidentType}`);

        return responses;
    }

    // Private
    private async notifyEoc(eocId: string, event: string, data: any): Promise<void> {
        const eoc = this.eocRegistry.get(eocId);
        if (!eoc) return;
        // Would send webhook/API call to EOC endpoint
        this.logger.debug(`Notifying EOC ${eocId}: ${event}`);
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
    commandTransfers?: Array<{
        from: string;
        to: string;
        reason: string;
        transferredAt: Date;
    }>;
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

// P1: New interfaces for enhanced coordination

interface CommonOperationalPicture {
    generatedAt: Date;
    eocCount: number;
    incidents: any[];
    resources: SharedResource[];
    personnel: any[];
    boundaries: any[];
    legend: {
        resourceTypes: string[];
    };
}

interface MutualAidRequest {
    incidentType: string;
    requiredCapabilities: string[];
    requiredResources: Array<{
        type: string;
        quantity: number;
    }>;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    duration?: string;
    location: { lat: number; lng: number };
}

interface MutualAidResponse {
    eocId: string;
    eocName: string;
    status: 'pending' | 'accepted' | 'rejected';
    estimatedResponseTime: number | null;
    offeredResources?: SharedResource[];
}

