import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Drone Swarm Service
 * Multi-drone coordination for search and rescue operations
 */
@Injectable()
export class DroneSwarmService {
    private readonly logger = new Logger(DroneSwarmService.name);

    // Registered drones in the swarm
    private drones: Map<string, SwarmDrone> = new Map();

    // Active swarm missions
    private missions: Map<string, SwarmMission> = new Map();

    // Swarm coordination state
    private swarmState: SwarmState = {
        mode: 'idle',
        activeDrones: 0,
        coverageArea: 0,
    };

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Register drone to swarm
     */
    registerDrone(drone: DroneRegistration): SwarmDrone {
        const swarmDrone: SwarmDrone = {
            id: drone.id,
            model: drone.model,
            capabilities: drone.capabilities,
            status: 'standby',
            battery: 100,
            position: drone.homePosition,
            homePosition: drone.homePosition,
            currentTask: null,
            lastHeartbeat: new Date(),
        };

        this.drones.set(drone.id, swarmDrone);
        this.logger.log(`Drone ${drone.id} registered to swarm`);

        this.eventEmitter.emit('swarm.drone.registered', swarmDrone);
        return swarmDrone;
    }

    /**
     * Create area search mission with multiple drones
     */
    async createSearchMission(config: SearchMissionConfig): Promise<SwarmMission> {
        const availableDrones = this.getAvailableDrones(config.requiredCapabilities);

        if (availableDrones.length < config.minDrones) {
            throw new Error(`Insufficient drones: ${availableDrones.length}/${config.minDrones}`);
        }

        const assignedDrones = availableDrones.slice(0, config.maxDrones || availableDrones.length);

        // Calculate search grid
        const searchGrid = this.calculateSearchGrid(
            config.searchArea,
            assignedDrones.length,
        );

        const mission: SwarmMission = {
            id: `mission-${Date.now()}`,
            type: 'area-search',
            status: 'planning',
            searchArea: config.searchArea,
            assignedDrones: assignedDrones.map((d) => d.id),
            searchGrid,
            progress: 0,
            startTime: null,
            estimatedDuration: this.estimateSearchDuration(searchGrid, assignedDrones.length),
            findings: [],
            createdAt: new Date(),
        };

        this.missions.set(mission.id, mission);

        // Assign grid sectors to drones
        assignedDrones.forEach((drone, index) => {
            drone.status = 'assigned';
            drone.currentTask = {
                missionId: mission.id,
                type: 'search-sector',
                sector: searchGrid[index % searchGrid.length],
                startTime: null,
            };
        });

        this.logger.log(`Search mission ${mission.id} created with ${assignedDrones.length} drones`);
        this.eventEmitter.emit('swarm.mission.created', mission);

        return mission;
    }

    /**
     * Start swarm mission
     */
    async startMission(missionId: string): Promise<void> {
        const mission = this.missions.get(missionId);
        if (!mission) {
            throw new Error(`Mission not found: ${missionId}`);
        }

        mission.status = 'executing';
        mission.startTime = new Date();

        // Launch all assigned drones
        for (const droneId of mission.assignedDrones) {
            const drone = this.drones.get(droneId);
            if (drone) {
                drone.status = 'flying';
                if (drone.currentTask) {
                    drone.currentTask.startTime = new Date();
                }

                this.eventEmitter.emit('swarm.drone.launched', {
                    droneId,
                    missionId,
                    task: drone.currentTask,
                });
            }
        }

        this.swarmState.mode = 'searching';
        this.swarmState.activeDrones = mission.assignedDrones.length;

        this.logger.log(`Mission ${missionId} started`);
        this.eventEmitter.emit('swarm.mission.started', mission);
    }

    /**
     * Update drone telemetry
     */
    updateDroneTelemetry(droneId: string, telemetry: DroneTelemetry): void {
        const drone = this.drones.get(droneId);
        if (!drone) {
            return;
        }

        drone.position = telemetry.position;
        drone.battery = telemetry.battery;
        drone.lastHeartbeat = new Date();

        // Check for low battery
        if (telemetry.battery < 20 && drone.status === 'flying') {
            this.initiateEmergencyReturn(droneId);
        }

        // Update mission progress
        if (drone.currentTask) {
            this.updateMissionProgress(drone.currentTask.missionId);
        }
    }

    /**
     * Report finding from drone
     */
    reportFinding(droneId: string, finding: SwarmFinding): void {
        const drone = this.drones.get(droneId);
        if (!drone?.currentTask) {
            return;
        }

        const mission = this.missions.get(drone.currentTask.missionId);
        if (!mission) {
            return;
        }

        const enrichedFinding: SwarmFinding = {
            ...finding,
            id: `finding-${Date.now()}`,
            droneId,
            timestamp: new Date(),
        };

        mission.findings.push(enrichedFinding);

        this.logger.log(`Finding reported by ${droneId}: ${finding.type} at ${JSON.stringify(finding.position)}`);
        this.eventEmitter.emit('swarm.finding.reported', enrichedFinding);

        // If critical finding, notify other drones to converge
        if (finding.type === 'person-detected' || finding.type === 'sos-signal') {
            this.coordinateConvergence(mission.id, finding.position);
        }
    }

    /**
     * Coordinate drones to converge on a point
     */
    private coordinateConvergence(missionId: string, position: GeoPosition): void {
        const mission = this.missions.get(missionId);
        if (!mission) {
            return;
        }

        // Direct nearest drones to converge
        const nearestDrones = this.getNearestDrones(position, 3);

        nearestDrones.forEach((drone) => {
            if (drone.id !== mission.assignedDrones[0]) {
                drone.currentTask = {
                    missionId,
                    type: 'converge',
                    targetPosition: position,
                    startTime: new Date(),
                };

                this.eventEmitter.emit('swarm.drone.converging', {
                    droneId: drone.id,
                    targetPosition: position,
                });
            }
        });
    }

    /**
     * Initiate emergency return for drone
     */
    private initiateEmergencyReturn(droneId: string): void {
        const drone = this.drones.get(droneId);
        if (!drone) {
            return;
        }

        drone.status = 'returning';
        drone.currentTask = {
            missionId: drone.currentTask?.missionId || '',
            type: 'return-home',
            targetPosition: drone.homePosition,
            startTime: new Date(),
        };

        this.logger.warn(`Emergency return initiated for drone ${droneId} (battery: ${drone.battery}%)`);
        this.eventEmitter.emit('swarm.drone.emergency-return', { droneId, battery: drone.battery });
    }

    /**
     * Get swarm status
     */
    getSwarmStatus(): SwarmStatus {
        const drones = Array.from(this.drones.values());
        const missions = Array.from(this.missions.values());

        return {
            state: this.swarmState,
            drones: drones.map((d) => ({
                id: d.id,
                status: d.status,
                battery: d.battery,
                position: d.position,
            })),
            activeMissions: missions.filter((m) => m.status === 'executing').length,
            totalFindings: missions.reduce((sum, m) => sum + m.findings.length, 0),
        };
    }

    /**
     * End mission and recall all drones
     */
    async endMission(missionId: string): Promise<void> {
        const mission = this.missions.get(missionId);
        if (!mission) {
            return;
        }

        mission.status = 'completed';

        // Recall all drones
        for (const droneId of mission.assignedDrones) {
            const drone = this.drones.get(droneId);
            if (drone) {
                drone.status = 'returning';
                drone.currentTask = {
                    missionId,
                    type: 'return-home',
                    targetPosition: drone.homePosition,
                    startTime: new Date(),
                };
            }
        }

        this.swarmState.mode = 'idle';
        this.swarmState.activeDrones = 0;

        this.logger.log(`Mission ${missionId} ended with ${mission.findings.length} findings`);
        this.eventEmitter.emit('swarm.mission.ended', mission);
    }

    // Private helpers
    private getAvailableDrones(requiredCapabilities?: string[]): SwarmDrone[] {
        return Array.from(this.drones.values()).filter((drone) => {
            if (drone.status !== 'standby') return false;
            if (drone.battery < 30) return false;
            if (requiredCapabilities) {
                return requiredCapabilities.every((cap) =>
                    drone.capabilities.includes(cap),
                );
            }
            return true;
        });
    }

    private getNearestDrones(position: GeoPosition, count: number): SwarmDrone[] {
        return Array.from(this.drones.values())
            .filter((d) => d.status === 'flying')
            .sort((a, b) => {
                const distA = this.calculateDistance(a.position, position);
                const distB = this.calculateDistance(b.position, position);
                return distA - distB;
            })
            .slice(0, count);
    }

    private calculateSearchGrid(area: SearchArea, droneCount: number): SearchSector[] {
        const sectors: SearchSector[] = [];
        const cols = Math.ceil(Math.sqrt(droneCount));
        const rows = Math.ceil(droneCount / cols);

        const latStep = (area.bounds.north - area.bounds.south) / rows;
        const lngStep = (area.bounds.east - area.bounds.west) / cols;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                sectors.push({
                    id: `sector-${r}-${c}`,
                    bounds: {
                        north: area.bounds.north - r * latStep,
                        south: area.bounds.north - (r + 1) * latStep,
                        east: area.bounds.west + (c + 1) * lngStep,
                        west: area.bounds.west + c * lngStep,
                    },
                    altitude: area.altitude || 50,
                    pattern: 'lawnmower',
                });
            }
        }

        return sectors;
    }

    private calculateDistance(a: GeoPosition, b: GeoPosition): number {
        const R = 6371000;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;

        const x =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    private estimateSearchDuration(grid: SearchSector[], droneCount: number): number {
        // Rough estimate: 5 minutes per sector per drone
        return Math.ceil((grid.length / droneCount) * 5 * 60);
    }

    private updateMissionProgress(missionId: string): void {
        const mission = this.missions.get(missionId);
        if (!mission) return;
        // Progress calculation would be based on completed sectors
    }
}

// Type definitions
interface SwarmDrone {
    id: string;
    model: string;
    capabilities: string[];
    status: 'standby' | 'assigned' | 'flying' | 'returning' | 'charging' | 'error';
    battery: number;
    position: GeoPosition;
    homePosition: GeoPosition;
    currentTask: DroneTask | null;
    lastHeartbeat: Date;
}

interface DroneRegistration {
    id: string;
    model: string;
    capabilities: string[];
    homePosition: GeoPosition;
}

interface GeoPosition {
    lat: number;
    lng: number;
    alt?: number;
}

interface DroneTask {
    missionId: string;
    type: 'search-sector' | 'converge' | 'return-home';
    sector?: SearchSector;
    targetPosition?: GeoPosition;
    startTime: Date | null;
}

interface SwarmMission {
    id: string;
    type: 'area-search' | 'perimeter-patrol' | 'point-survey';
    status: 'planning' | 'executing' | 'paused' | 'completed' | 'aborted';
    searchArea: SearchArea;
    assignedDrones: string[];
    searchGrid: SearchSector[];
    progress: number;
    startTime: Date | null;
    estimatedDuration: number;
    findings: SwarmFinding[];
    createdAt: Date;
}

interface SearchMissionConfig {
    searchArea: SearchArea;
    minDrones: number;
    maxDrones?: number;
    requiredCapabilities?: string[];
    priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface SearchArea {
    bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    altitude?: number;
}

interface SearchSector {
    id: string;
    bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    altitude: number;
    pattern: 'lawnmower' | 'spiral' | 'expanding-square';
}

interface DroneTelemetry {
    position: GeoPosition;
    battery: number;
    speed?: number;
    heading?: number;
}

interface SwarmFinding {
    id?: string;
    droneId?: string;
    type: 'person-detected' | 'vehicle' | 'debris' | 'sos-signal' | 'hazard' | 'other';
    position: GeoPosition;
    confidence: number;
    imageUrl?: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}

interface SwarmState {
    mode: 'idle' | 'searching' | 'converging' | 'returning';
    activeDrones: number;
    coverageArea: number;
}

interface SwarmStatus {
    state: SwarmState;
    drones: {
        id: string;
        status: string;
        battery: number;
        position: GeoPosition;
    }[];
    activeMissions: number;
    totalFindings: number;
}
