/**
 * Drone Operations Service
 * Phase 6.4: 無人機操作與資料整合
 * 
 * 功能:
 * 1. 無人機狀態追蹤
 * 2. 任務規劃
 * 3. 影像/感測資料接收
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export enum DroneStatus {
    IDLE = 'IDLE',
    PREFLIGHT = 'PREFLIGHT',
    TAKEOFF = 'TAKEOFF',
    IN_FLIGHT = 'IN_FLIGHT',
    HOVERING = 'HOVERING',
    LANDING = 'LANDING',
    RETURNING = 'RETURNING',
    EMERGENCY = 'EMERGENCY',
    OFFLINE = 'OFFLINE',
}

export enum MissionType {
    SURVEILLANCE = 'SURVEILLANCE',   // 監視
    SEARCH = 'SEARCH',               // 搜索
    MAPPING = 'MAPPING',             // 建圖
    DELIVERY = 'DELIVERY',           // 運送
    RELAY = 'RELAY',                 // 通訊中繼
    SPECTRUM_SCAN = 'SPECTRUM_SCAN', // 頻譜掃描
}

export interface DroneUnit {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    status: DroneStatus;
    position?: {
        lat: number;
        lng: number;
        altitude: number; // meters AGL
        heading: number; // degrees
        speed: number; // m/s
    };
    telemetry?: {
        batteryPercent: number;
        batteryVoltage: number;
        signalStrength: number;
        gpsCount: number;
        flightTime: number; // seconds
        distanceFromHome: number; // meters
    };
    homePosition?: { lat: number; lng: number };
    operatorId?: string;
    lastUpdate: Date;
}

export interface DroneMission {
    id: string;
    droneId: string;
    type: MissionType;
    status: 'planned' | 'active' | 'paused' | 'completed' | 'aborted';
    waypoints: MissionWaypoint[];
    parameters?: Record<string, any>;
    startedAt?: Date;
    completedAt?: Date;
    createdBy: string;
}

export interface MissionWaypoint {
    index: number;
    lat: number;
    lng: number;
    altitude: number;
    speed?: number;
    action?: 'hover' | 'photo' | 'video_start' | 'video_stop' | 'scan';
    duration?: number; // seconds to hover
}

export interface DroneDetection {
    droneId: string;
    timestamp: Date;
    type: 'person' | 'vehicle' | 'heat_signature' | 'debris' | 'signal';
    position: { lat: number; lng: number };
    confidence: number;
    imageUrl?: string;
    metadata?: Record<string, any>;
}

// ============ Service ============

@Injectable()
export class DroneOpsService {
    private readonly logger = new Logger(DroneOpsService.name);

    // In-memory storage
    private drones: Map<string, DroneUnit> = new Map();
    private missions: Map<string, DroneMission> = new Map();
    private detections: DroneDetection[] = [];

    constructor(private readonly eventEmitter: EventEmitter2) { }

    // ==================== Drone Management ====================

    registerDrone(drone: Omit<DroneUnit, 'status' | 'lastUpdate'>): DroneUnit {
        const unit: DroneUnit = {
            ...drone,
            status: DroneStatus.OFFLINE,
            lastUpdate: new Date(),
        };
        this.drones.set(unit.id, unit);
        this.logger.log(`Drone registered: ${unit.name} (${unit.model})`);
        return unit;
    }

    updateTelemetry(droneId: string, data: Partial<DroneUnit>): DroneUnit | null {
        const drone = this.drones.get(droneId);
        if (!drone) return null;

        Object.assign(drone, data, { lastUpdate: new Date() });

        // Check for low battery
        if (drone.telemetry && drone.telemetry.batteryPercent < 20) {
            this.eventEmitter.emit('drone.lowBattery', {
                droneId,
                battery: drone.telemetry.batteryPercent,
            });
        }

        this.eventEmitter.emit('drone.telemetry', drone);
        return drone;
    }

    getDrone(droneId: string): DroneUnit | undefined {
        return this.drones.get(droneId);
    }

    getAllDrones(): DroneUnit[] {
        return Array.from(this.drones.values());
    }

    getActiveDrones(): DroneUnit[] {
        return this.getAllDrones().filter(d =>
            d.status !== DroneStatus.OFFLINE && d.status !== DroneStatus.IDLE
        );
    }

    // ==================== Mission Management ====================

    createMission(mission: Omit<DroneMission, 'id' | 'status'>): DroneMission {
        const id = `mission-${Date.now()}`;
        const newMission: DroneMission = {
            ...mission,
            id,
            status: 'planned',
        };
        this.missions.set(id, newMission);
        this.logger.log(`Mission created: ${id} (${mission.type})`);
        return newMission;
    }

    startMission(missionId: string): DroneMission | null {
        const mission = this.missions.get(missionId);
        if (!mission) return null;

        mission.status = 'active';
        mission.startedAt = new Date();

        const drone = this.drones.get(mission.droneId);
        if (drone) {
            drone.status = DroneStatus.TAKEOFF;
        }

        this.eventEmitter.emit('drone.missionStart', mission);
        return mission;
    }

    completeMission(missionId: string): DroneMission | null {
        const mission = this.missions.get(missionId);
        if (!mission) return null;

        mission.status = 'completed';
        mission.completedAt = new Date();

        const drone = this.drones.get(mission.droneId);
        if (drone) {
            drone.status = DroneStatus.RETURNING;
        }

        this.eventEmitter.emit('drone.missionComplete', mission);
        return mission;
    }

    abortMission(missionId: string, reason: string): DroneMission | null {
        const mission = this.missions.get(missionId);
        if (!mission) return null;

        mission.status = 'aborted';
        mission.completedAt = new Date();

        const drone = this.drones.get(mission.droneId);
        if (drone) {
            drone.status = DroneStatus.RETURNING;
        }

        this.logger.warn(`Mission aborted: ${missionId} - ${reason}`);
        this.eventEmitter.emit('drone.missionAbort', { mission, reason });
        return mission;
    }

    getMission(missionId: string): DroneMission | undefined {
        return this.missions.get(missionId);
    }

    getMissionsByDrone(droneId: string): DroneMission[] {
        return Array.from(this.missions.values()).filter(m => m.droneId === droneId);
    }

    // ==================== Detections ====================

    addDetection(detection: Omit<DroneDetection, 'timestamp'>): void {
        const newDetection: DroneDetection = {
            ...detection,
            timestamp: new Date(),
        };
        this.detections.push(newDetection);

        if (this.detections.length > 10000) {
            this.detections = this.detections.slice(-5000);
        }

        this.logger.log(`Detection: ${detection.type} at ${detection.position.lat},${detection.position.lng}`);
        this.eventEmitter.emit('drone.detection', newDetection);
    }

    getDetections(droneId?: string, limit: number = 100): DroneDetection[] {
        let filtered = this.detections;
        if (droneId) {
            filtered = filtered.filter(d => d.droneId === droneId);
        }
        return filtered.slice(-limit);
    }

    // ==================== Emergency Commands ====================

    returnToHome(droneId: string): boolean {
        const drone = this.drones.get(droneId);
        if (!drone) return false;

        drone.status = DroneStatus.RETURNING;
        this.logger.warn(`RTH commanded for drone: ${drone.name}`);
        this.eventEmitter.emit('drone.rth', { droneId });
        return true;
    }

    emergencyLand(droneId: string): boolean {
        const drone = this.drones.get(droneId);
        if (!drone) return false;

        drone.status = DroneStatus.EMERGENCY;
        this.logger.error(`EMERGENCY LAND for drone: ${drone.name}`);
        this.eventEmitter.emit('drone.emergency', { droneId, command: 'land' });
        return true;
    }
}
