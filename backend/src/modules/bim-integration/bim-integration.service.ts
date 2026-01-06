import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * BIM Integration Service
 * Building Information Modeling for digital twin disaster response
 */
@Injectable()
export class BimIntegrationService {
    private readonly logger = new Logger(BimIntegrationService.name);

    private buildings: Map<string, BimBuilding> = new Map();
    private hazardOverlays: Map<string, HazardOverlay[]> = new Map();

    constructor(private configService: ConfigService) { }

    /**
     * Load BIM model for building
     */
    async loadBuildingModel(buildingId: string, modelUrl: string): Promise<BimBuilding> {
        const building: BimBuilding = {
            id: buildingId,
            modelUrl,
            floors: [],
            metadata: null,
            status: 'loading',
            loadedAt: null,
        };

        // Parse IFC/glTF model
        const metadata = await this.parseModelMetadata(modelUrl);
        building.metadata = metadata;
        building.floors = metadata.floors || [];
        building.status = 'ready';
        building.loadedAt = new Date();

        this.buildings.set(buildingId, building);
        this.logger.log(`BIM model loaded: ${buildingId}`);

        return building;
    }

    /**
     * Get floor plan with real-time overlays
     */
    getFloorPlan(buildingId: string, floorNumber: number): FloorPlanData | null {
        const building = this.buildings.get(buildingId);
        if (!building) return null;

        const floor = building.floors.find((f) => f.number === floorNumber);
        if (!floor) return null;

        const hazards = this.hazardOverlays.get(`${buildingId}-${floorNumber}`) || [];

        return {
            buildingId,
            floorNumber,
            geometry: floor.geometry,
            rooms: floor.rooms,
            exits: floor.exits,
            hazards,
            personnel: [], // Would integrate with indoor positioning
        };
    }

    /**
     * Add hazard overlay to floor
     */
    addHazardOverlay(buildingId: string, floorNumber: number, hazard: HazardOverlay): void {
        const key = `${buildingId}-${floorNumber}`;
        const overlays = this.hazardOverlays.get(key) || [];
        overlays.push({ ...hazard, id: `hazard-${Date.now()}`, createdAt: new Date() });
        this.hazardOverlays.set(key, overlays);
    }

    /**
     * Calculate shortest evacuation route
     */
    calculateEvacuationRoute(
        buildingId: string,
        fromFloor: number,
        fromRoom: string,
    ): EvacuationRoute | null {
        const building = this.buildings.get(buildingId);
        if (!building) return null;

        const floor = building.floors.find((f) => f.number === fromFloor);
        if (!floor) return null;

        // Find nearest safe exit avoiding hazards
        const hazards = this.hazardOverlays.get(`${buildingId}-${fromFloor}`) || [];
        const blockedExits = hazards
            .filter((h) => h.blocksExit)
            .map((h) => h.nearestExit);

        const safeExits = floor.exits.filter((e) => !blockedExits.includes(e.id));

        if (safeExits.length === 0) {
            // Recommend vertical evacuation
            return {
                type: 'vertical',
                path: [`Go to stairwell`, `Evacuate via ${fromFloor > 1 ? 'down' : 'up'}`],
                distance: 0,
                estimatedTime: 120,
                warnings: ['All ground level exits blocked'],
            };
        }

        const nearestExit = safeExits[0]; // Would use pathfinding in production

        return {
            type: 'horizontal',
            path: [fromRoom, ...nearestExit.path],
            exitId: nearestExit.id,
            distance: nearestExit.distance || 50,
            estimatedTime: Math.ceil((nearestExit.distance || 50) / 1.2),
            warnings: [],
        };
    }

    /**
     * Get structural damage assessment points
     */
    getStructuralPoints(buildingId: string): StructuralPoint[] {
        const building = this.buildings.get(buildingId);
        if (!building?.metadata?.structuralPoints) return [];

        return building.metadata.structuralPoints;
    }

    /**
     * Update structural status
     */
    updateStructuralStatus(
        buildingId: string,
        pointId: string,
        status: 'safe' | 'damaged' | 'critical',
        notes?: string,
    ): void {
        const building = this.buildings.get(buildingId);
        if (!building?.metadata?.structuralPoints) return;

        const point = building.metadata.structuralPoints.find((p) => p.id === pointId);
        if (point) {
            point.status = status;
            point.lastInspection = new Date();
            if (notes) point.notes = notes;
        }
    }

    // Private
    private async parseModelMetadata(modelUrl: string): Promise<BimMetadata> {
        // Would parse IFC/glTF in production
        return {
            name: 'Sample Building',
            address: 'Sample Address',
            floors: [
                {
                    number: 1,
                    name: 'Ground Floor',
                    geometry: { type: 'polygon', coordinates: [] },
                    rooms: [
                        { id: 'lobby', name: 'Lobby', type: 'common', capacity: 50 },
                        { id: 'office-1', name: 'Office 1', type: 'office', capacity: 20 },
                    ],
                    exits: [
                        { id: 'exit-main', name: 'Main Entrance', path: ['lobby'], distance: 10 },
                        { id: 'exit-rear', name: 'Rear Exit', path: ['hallway'], distance: 30 },
                    ],
                },
            ],
            structuralPoints: [
                { id: 'col-1', type: 'column', location: { x: 0, y: 0 }, status: 'safe', lastInspection: new Date() },
            ],
        };
    }
}

// Types
interface BimBuilding {
    id: string;
    modelUrl: string;
    floors: FloorData[];
    metadata: BimMetadata | null;
    status: 'loading' | 'ready' | 'error';
    loadedAt: Date | null;
}

interface BimMetadata {
    name: string;
    address: string;
    floors: FloorData[];
    structuralPoints: StructuralPoint[];
}

interface FloorData {
    number: number;
    name: string;
    geometry: any;
    rooms: RoomData[];
    exits: ExitData[];
}

interface RoomData {
    id: string;
    name: string;
    type: string;
    capacity: number;
}

interface ExitData {
    id: string;
    name: string;
    path: string[];
    distance?: number;
}

interface HazardOverlay {
    id?: string;
    type: 'fire' | 'flood' | 'smoke' | 'collapse' | 'chemical';
    area: { x: number; y: number; radius: number };
    severity: 'low' | 'medium' | 'high';
    blocksExit?: boolean;
    nearestExit?: string;
    createdAt?: Date;
}

interface FloorPlanData {
    buildingId: string;
    floorNumber: number;
    geometry: any;
    rooms: RoomData[];
    exits: ExitData[];
    hazards: HazardOverlay[];
    personnel: any[];
}

interface EvacuationRoute {
    type: 'horizontal' | 'vertical';
    path: string[];
    exitId?: string;
    distance: number;
    estimatedTime: number;
    warnings: string[];
}

interface StructuralPoint {
    id: string;
    type: 'column' | 'beam' | 'wall' | 'foundation';
    location: { x: number; y: number };
    status: 'safe' | 'damaged' | 'critical';
    lastInspection: Date;
    notes?: string;
}
