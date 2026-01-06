import { Injectable, Logger } from '@nestjs/common';

/**
 * Evacuation Simulation Service
 * Population flow simulation for optimal evacuation planning
 */
@Injectable()
export class EvacuationSimService {
    private readonly logger = new Logger(EvacuationSimService.name);

    private simulations: Map<string, EvacuationSimulation> = new Map();

    /**
     * Run evacuation simulation
     */
    async runSimulation(config: SimulationConfig): Promise<EvacuationSimulation> {
        const simulation: EvacuationSimulation = {
            id: `evac-sim-${Date.now()}`,
            name: config.name,
            area: config.area,
            population: config.population,
            shelters: config.shelters,
            routes: [],
            bottlenecks: [],
            estimatedTime: 0,
            status: 'running',
            progress: 0,
            createdAt: new Date(),
        };

        // Calculate routes for each population cluster
        const routes = await this.calculateEvacuationRoutes(config);
        simulation.routes = routes;

        // Identify bottlenecks
        simulation.bottlenecks = this.identifyBottlenecks(routes, config);

        // Calculate total evacuation time
        simulation.estimatedTime = this.calculateTotalEvacTime(routes);

        simulation.status = 'completed';
        simulation.progress = 100;

        this.simulations.set(simulation.id, simulation);

        return simulation;
    }

    /**
     * Get optimal shelter assignments
     */
    getShelterAssignments(config: SimulationConfig): ShelterAssignment[] {
        const assignments: ShelterAssignment[] = [];
        const shelterCapacities = new Map(config.shelters.map((s) => [s.id, s.capacity]));

        // Sort population clusters by distance to nearest shelter
        const sortedPop = [...config.population].sort((a, b) => {
            const aDist = Math.min(...config.shelters.map((s) => this.distance(a.location, s.location)));
            const bDist = Math.min(...config.shelters.map((s) => this.distance(b.location, s.location)));
            return aDist - bDist;
        });

        for (const pop of sortedPop) {
            // Find shelter with capacity
            const availableShelters = config.shelters
                .filter((s) => (shelterCapacities.get(s.id) || 0) >= pop.count)
                .sort((a, b) => this.distance(pop.location, a.location) - this.distance(pop.location, b.location));

            if (availableShelters.length > 0) {
                const shelter = availableShelters[0];
                const remaining = (shelterCapacities.get(shelter.id) || 0) - pop.count;
                shelterCapacities.set(shelter.id, remaining);

                assignments.push({
                    populationClusterId: pop.id,
                    populationCount: pop.count,
                    shelterId: shelter.id,
                    shelterName: shelter.name,
                    distance: this.distance(pop.location, shelter.location),
                    estimatedWalkTime: Math.ceil(this.distance(pop.location, shelter.location) / 80), // 80m/min walking
                });
            }
        }

        return assignments;
    }

    /**
     * Simulate traffic flow during evacuation
     */
    simulateTrafficFlow(routes: EvacRoute[]): TrafficSimResult {
        const roadLoads: Map<string, number> = new Map();

        for (const route of routes) {
            for (const segment of route.segments) {
                const load = roadLoads.get(segment.roadId) || 0;
                roadLoads.set(segment.roadId, load + route.population);
            }
        }

        const congestionPoints = Array.from(roadLoads.entries())
            .filter(([, load]) => load > 1000)
            .map(([roadId, load]) => ({
                roadId,
                loadPercentage: (load / 1000) * 100,
                delayMinutes: Math.ceil((load - 1000) / 200),
            }));

        return {
            totalPopulation: routes.reduce((sum, r) => sum + r.population, 0),
            roadLoads: Object.fromEntries(roadLoads),
            congestionPoints,
            estimatedClearanceTime: Math.max(...routes.map((r) => r.estimatedTime)) +
                congestionPoints.reduce((sum, c) => sum + c.delayMinutes, 0),
        };
    }

    /**
     * Get real-time evacuation status
     */
    getEvacuationStatus(simulationId: string): EvacuationStatus {
        const sim = this.simulations.get(simulationId);
        if (!sim) throw new Error('Simulation not found');

        return {
            simulationId,
            totalPopulation: sim.population.reduce((sum, p) => sum + p.count, 0),
            evacuated: 0, // Would track actual evacuation in production
            inTransit: 0,
            remaining: sim.population.reduce((sum, p) => sum + p.count, 0),
            shelterStatus: sim.shelters.map((s) => ({
                id: s.id,
                name: s.name,
                capacity: s.capacity,
                current: 0,
                available: s.capacity,
            })),
            estimatedCompletion: new Date(Date.now() + sim.estimatedTime * 60000),
        };
    }

    // Private methods
    private async calculateEvacuationRoutes(config: SimulationConfig): Promise<EvacRoute[]> {
        return config.population.map((pop) => {
            const nearestShelter = config.shelters.reduce((nearest, s) =>
                this.distance(pop.location, s.location) < this.distance(pop.location, nearest.location) ? s : nearest
            );

            const dist = this.distance(pop.location, nearestShelter.location);

            return {
                id: `route-${pop.id}`,
                from: pop.location,
                to: nearestShelter.location,
                shelterId: nearestShelter.id,
                population: pop.count,
                distance: dist,
                estimatedTime: Math.ceil(dist / 80), // 80m/min
                segments: [{ roadId: `road-${pop.id}`, length: dist }],
            };
        });
    }

    private identifyBottlenecks(routes: EvacRoute[], config: SimulationConfig): Bottleneck[] {
        const bottlenecks: Bottleneck[] = [];

        // Check shelter capacity
        for (const shelter of config.shelters) {
            const assignedPop = routes
                .filter((r) => r.shelterId === shelter.id)
                .reduce((sum, r) => sum + r.population, 0);

            if (assignedPop > shelter.capacity) {
                bottlenecks.push({
                    type: 'shelter_overflow',
                    location: shelter.location,
                    description: `${shelter.name} 超過容量 ${assignedPop - shelter.capacity} 人`,
                    severity: 'high',
                });
            }
        }

        return bottlenecks;
    }

    private calculateTotalEvacTime(routes: EvacRoute[]): number {
        return Math.max(...routes.map((r) => r.estimatedTime));
    }

    private distance(a: GeoPoint, b: GeoPoint): number {
        const R = 6371000;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }
}

// Types
interface GeoPoint { lat: number; lng: number; }

interface PopulationCluster {
    id: string;
    location: GeoPoint;
    count: number;
    vulnerableCount?: number;
}

interface Shelter {
    id: string;
    name: string;
    location: GeoPoint;
    capacity: number;
    type: string;
}

interface SimulationConfig {
    name: string;
    area: { bounds: { north: number; south: number; east: number; west: number } };
    population: PopulationCluster[];
    shelters: Shelter[];
}

interface EvacRoute {
    id: string;
    from: GeoPoint;
    to: GeoPoint;
    shelterId: string;
    population: number;
    distance: number;
    estimatedTime: number;
    segments: { roadId: string; length: number }[];
}

interface Bottleneck {
    type: string;
    location: GeoPoint;
    description: string;
    severity: 'low' | 'medium' | 'high';
}

interface EvacuationSimulation {
    id: string;
    name: string;
    area: any;
    population: PopulationCluster[];
    shelters: Shelter[];
    routes: EvacRoute[];
    bottlenecks: Bottleneck[];
    estimatedTime: number;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    createdAt: Date;
}

interface ShelterAssignment {
    populationClusterId: string;
    populationCount: number;
    shelterId: string;
    shelterName: string;
    distance: number;
    estimatedWalkTime: number;
}

interface TrafficSimResult {
    totalPopulation: number;
    roadLoads: Record<string, number>;
    congestionPoints: { roadId: string; loadPercentage: number; delayMinutes: number }[];
    estimatedClearanceTime: number;
}

interface EvacuationStatus {
    simulationId: string;
    totalPopulation: number;
    evacuated: number;
    inTransit: number;
    remaining: number;
    shelterStatus: { id: string; name: string; capacity: number; current: number; available: number }[];
    estimatedCompletion: Date;
}
