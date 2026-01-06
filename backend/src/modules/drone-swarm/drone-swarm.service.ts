import { Injectable, Logger } from '@nestjs/common';

export interface Drone {
    id: string;
    name: string;
    model: string;
    status: 'idle' | 'flying' | 'returning' | 'charging' | 'maintenance' | 'offline';
    batteryLevel: number;
    position: { lat: number; lng: number; altitude: number };
    heading: number;
    speed: number;
    homeBase: { lat: number; lng: number };
    capabilities: ('camera' | 'thermal' | 'lidar' | 'speaker' | 'drop_payload')[];
    currentMission?: string;
    lastSeen: Date;
}

export interface SwarmMission {
    id: string;
    name: string;
    type: 'search' | 'survey' | 'delivery' | 'monitoring' | 'mapping';
    status: 'planned' | 'active' | 'paused' | 'completed' | 'aborted';
    drones: string[];
    searchArea?: { center: { lat: number; lng: number }; radius: number };
    waypoints?: { lat: number; lng: number; altitude: number; action?: string }[];
    priority: 'low' | 'medium' | 'high' | 'emergency';
    startedAt?: Date;
    completedAt?: Date;
    createdBy: string;
    createdAt: Date;
}

export interface DroneStream {
    droneId: string;
    streamUrl: string;
    type: 'video' | 'thermal';
    isLive: boolean;
    startedAt: Date;
}

export interface SearchPattern {
    type: 'grid' | 'spiral' | 'parallel' | 'expanding';
    parameters: {
        spacing: number;
        altitude: number;
        speed: number;
        overlap: number;
    };
}

export interface Detection {
    id: string;
    droneId: string;
    missionId: string;
    type: 'person' | 'vehicle' | 'fire' | 'flood' | 'structure_damage' | 'unknown';
    confidence: number;
    position: { lat: number; lng: number };
    imageUrl?: string;
    timestamp: Date;
    verified: boolean;
}

@Injectable()
export class DroneSwarmService {
    private readonly logger = new Logger(DroneSwarmService.name);
    private drones: Map<string, Drone> = new Map();
    private missions: Map<string, SwarmMission> = new Map();
    private streams: Map<string, DroneStream> = new Map();
    private detections: Map<string, Detection> = new Map();

    // ===== 無人機管理 =====

    registerDrone(data: Omit<Drone, 'id' | 'lastSeen'>): Drone {
        const drone: Drone = {
            ...data,
            id: `drone-${Date.now()}`,
            lastSeen: new Date(),
        };
        this.drones.set(drone.id, drone);
        this.logger.log(`Drone registered: ${drone.name} (${drone.model})`);
        return drone;
    }

    getDrone(id: string): Drone | undefined {
        return this.drones.get(id);
    }

    getAllDrones(): Drone[] {
        return Array.from(this.drones.values());
    }

    getAvailableDrones(): Drone[] {
        return Array.from(this.drones.values())
            .filter(d => d.status === 'idle' && d.batteryLevel > 20);
    }

    updateDroneStatus(id: string, updates: Partial<Drone>): Drone | null {
        const drone = this.drones.get(id);
        if (!drone) return null;
        Object.assign(drone, updates, { lastSeen: new Date() });
        return drone;
    }

    updateDronePosition(
        id: string,
        position: { lat: number; lng: number; altitude: number },
        heading: number,
        speed: number,
        batteryLevel: number
    ): Drone | null {
        const drone = this.drones.get(id);
        if (!drone) return null;
        drone.position = position;
        drone.heading = heading;
        drone.speed = speed;
        drone.batteryLevel = batteryLevel;
        drone.lastSeen = new Date();
        return drone;
    }

    // ===== 任務管理 =====

    createMission(data: Omit<SwarmMission, 'id' | 'createdAt' | 'status'>): SwarmMission {
        const mission: SwarmMission = {
            ...data,
            id: `mission-${Date.now()}`,
            status: 'planned',
            createdAt: new Date(),
        };
        this.missions.set(mission.id, mission);
        this.logger.log(`Swarm mission created: ${mission.name} (${mission.type})`);
        return mission;
    }

    getMission(id: string): SwarmMission | undefined {
        return this.missions.get(id);
    }

    getAllMissions(): SwarmMission[] {
        return Array.from(this.missions.values());
    }

    getActiveMissions(): SwarmMission[] {
        return Array.from(this.missions.values())
            .filter(m => m.status === 'active');
    }

    startMission(id: string): SwarmMission | null {
        const mission = this.missions.get(id);
        if (!mission || mission.status !== 'planned') return null;

        // 指派無人機
        for (const droneId of mission.drones) {
            const drone = this.drones.get(droneId);
            if (drone) {
                drone.status = 'flying';
                drone.currentMission = id;
            }
        }

        mission.status = 'active';
        mission.startedAt = new Date();
        this.logger.log(`Mission started: ${mission.name}`);
        return mission;
    }

    pauseMission(id: string): SwarmMission | null {
        const mission = this.missions.get(id);
        if (!mission || mission.status !== 'active') return null;
        mission.status = 'paused';
        return mission;
    }

    resumeMission(id: string): SwarmMission | null {
        const mission = this.missions.get(id);
        if (!mission || mission.status !== 'paused') return null;
        mission.status = 'active';
        return mission;
    }

    completeMission(id: string): SwarmMission | null {
        const mission = this.missions.get(id);
        if (!mission) return null;

        // 釋放無人機
        for (const droneId of mission.drones) {
            const drone = this.drones.get(droneId);
            if (drone) {
                drone.status = 'returning';
                drone.currentMission = undefined;
            }
        }

        mission.status = 'completed';
        mission.completedAt = new Date();
        this.logger.log(`Mission completed: ${mission.name}`);
        return mission;
    }

    abortMission(id: string): SwarmMission | null {
        const mission = this.missions.get(id);
        if (!mission) return null;

        for (const droneId of mission.drones) {
            const drone = this.drones.get(droneId);
            if (drone) {
                drone.status = 'returning';
                drone.currentMission = undefined;
            }
        }

        mission.status = 'aborted';
        mission.completedAt = new Date();
        this.logger.warn(`Mission aborted: ${mission.name}`);
        return mission;
    }

    // ===== 搜索模式生成 =====

    generateSearchPattern(
        center: { lat: number; lng: number },
        radius: number,
        pattern: SearchPattern
    ): { lat: number; lng: number; altitude: number }[] {
        const waypoints: { lat: number; lng: number; altitude: number }[] = [];
        const { spacing, altitude } = pattern.parameters;

        if (pattern.type === 'grid') {
            const steps = Math.ceil((radius * 2) / spacing);
            for (let y = -steps / 2; y <= steps / 2; y++) {
                for (let x = -steps / 2; x <= steps / 2; x++) {
                    waypoints.push({
                        lat: center.lat + (y * spacing) / 111000,
                        lng: center.lng + (x * spacing) / (111000 * Math.cos(center.lat * Math.PI / 180)),
                        altitude,
                    });
                }
            }
        } else if (pattern.type === 'spiral') {
            const rotations = radius / spacing;
            for (let i = 0; i < rotations * 36; i++) {
                const angle = (i * 10) * Math.PI / 180;
                const r = (i / 36) * spacing;
                waypoints.push({
                    lat: center.lat + (r * Math.cos(angle)) / 111000,
                    lng: center.lng + (r * Math.sin(angle)) / (111000 * Math.cos(center.lat * Math.PI / 180)),
                    altitude,
                });
            }
        }

        return waypoints;
    }

    // ===== 影像串流 =====

    startStream(droneId: string, type: 'video' | 'thermal'): DroneStream | null {
        const drone = this.drones.get(droneId);
        if (!drone) return null;

        const stream: DroneStream = {
            droneId,
            streamUrl: `rtmp://stream.example.com/${droneId}/${type}`,
            type,
            isLive: true,
            startedAt: new Date(),
        };
        this.streams.set(`${droneId}-${type}`, stream);
        return stream;
    }

    getStream(droneId: string, type: 'video' | 'thermal'): DroneStream | undefined {
        return this.streams.get(`${droneId}-${type}`);
    }

    stopStream(droneId: string, type: 'video' | 'thermal'): boolean {
        return this.streams.delete(`${droneId}-${type}`);
    }

    getAllStreams(): DroneStream[] {
        return Array.from(this.streams.values()).filter(s => s.isLive);
    }

    // ===== 偵測結果 =====

    addDetection(data: Omit<Detection, 'id' | 'timestamp' | 'verified'>): Detection {
        const detection: Detection = {
            ...data,
            id: `det-${Date.now()}`,
            timestamp: new Date(),
            verified: false,
        };
        this.detections.set(detection.id, detection);
        this.logger.log(`Detection: ${detection.type} (${detection.confidence}%) at ${detection.position.lat}, ${detection.position.lng}`);
        return detection;
    }

    getDetections(missionId?: string): Detection[] {
        return Array.from(this.detections.values())
            .filter(d => !missionId || d.missionId === missionId);
    }

    verifyDetection(id: string, verified: boolean): Detection | null {
        const detection = this.detections.get(id);
        if (!detection) return null;
        detection.verified = verified;
        return detection;
    }
}
