/**
 * Evacuation Plan Service
 * 
 * Staff evacuation planning and route management
 */
import { Injectable, Logger } from '@nestjs/common';

export interface EvacuationPlan {
    id: string;
    name: string;
    locationId: string;
    triggers: EvacuationTrigger[];
    routes: EvacuationRoute[];
    assemblyPoints: AssemblyPoint[];
    contacts: EmergencyContact[];
    createdAt: Date;
    updatedAt: Date;
}

export interface EvacuationTrigger {
    type: 'earthquake' | 'flood' | 'fire' | 'civil_unrest' | 'security_threat' | 'other';
    threshold?: string;
    authorizedBy: string[];
}

export interface EvacuationRoute {
    id: string;
    name: string;
    primary: boolean;
    waypoints: { lat: number; lon: number; description?: string }[];
    estimatedTimeMinutes: number;
    conditions?: string;
}

export interface AssemblyPoint {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    capacity: number;
    facilities: string[];
    contacts: string[];
}

export interface EmergencyContact {
    name: string;
    role: string;
    phone: string;
    email?: string;
    available24h: boolean;
}

@Injectable()
export class EvacuationPlanService {
    private readonly logger = new Logger(EvacuationPlanService.name);

    // In-memory cache for active plans (production: use database)
    private readonly activePlans = new Map<string, EvacuationPlan>();

    /**
     * Create a new evacuation plan
     */
    async createPlan(
        locationId: string,
        planData: Partial<EvacuationPlan>
    ): Promise<EvacuationPlan> {
        const plan: EvacuationPlan = {
            id: `evac-${Date.now()}`,
            name: planData.name || `Evacuation Plan - ${locationId}`,
            locationId,
            triggers: planData.triggers || [],
            routes: planData.routes || [],
            assemblyPoints: planData.assemblyPoints || [],
            contacts: planData.contacts || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.activePlans.set(plan.id, plan);
        this.logger.log(`Created evacuation plan: ${plan.id} for location ${locationId}`);
        return plan;
    }

    /**
     * Get evacuation plan by ID
     */
    async getPlan(planId: string): Promise<EvacuationPlan | null> {
        return this.activePlans.get(planId) || null;
    }

    /**
     * Get all plans for a location
     */
    async getPlansForLocation(locationId: string): Promise<EvacuationPlan[]> {
        return Array.from(this.activePlans.values())
            .filter(p => p.locationId === locationId);
    }

    /**
     * Initiate evacuation
     */
    async initiateEvacuation(
        planId: string,
        triggeredBy: string,
        reason: string
    ): Promise<{
        success: boolean;
        message: string;
        notifiedStaff: number;
    }> {
        const plan = await this.getPlan(planId);
        if (!plan) {
            return { success: false, message: 'Plan not found', notifiedStaff: 0 };
        }

        this.logger.warn(`🚨 EVACUATION INITIATED: ${plan.name} by ${triggeredBy}`);
        this.logger.warn(`Reason: ${reason}`);

        // TODO: Integrate with notification system
        // - Push notifications to all staff in location
        // - SMS alerts
        // - Update mission dashboard
        // - Log to security incidents

        return {
            success: true,
            message: `Evacuation initiated for ${plan.name}`,
            notifiedStaff: 0, // Would be actual count from notification system
        };
    }

    /**
     * Get nearest assembly point
     */
    async getNearestAssemblyPoint(
        planId: string,
        currentLat: number,
        currentLon: number
    ): Promise<AssemblyPoint | null> {
        const plan = await this.getPlan(planId);
        if (!plan || plan.assemblyPoints.length === 0) return null;

        // Calculate distances and find nearest
        const withDistance = plan.assemblyPoints.map(ap => ({
            ...ap,
            distance: this.haversineDistance(
                currentLat, currentLon,
                ap.latitude, ap.longitude
            ),
        }));

        withDistance.sort((a, b) => a.distance - b.distance);
        return withDistance[0];
    }

    /**
     * Calculate distance between two points (km)
     */
    private haversineDistance(
        lat1: number, lon1: number,
        lat2: number, lon2: number
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
