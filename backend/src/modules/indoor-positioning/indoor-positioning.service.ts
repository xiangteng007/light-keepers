/**
 * Indoor Positioning Service
 * Phase 6.2: 室內藍軍追蹤 (Indoor BFT)
 * 
 * 功能:
 * 1. BLE Beacon 定位
 * 2. 樓層平面圖疊加
 * 3. 室內導航
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface BLEBeacon {
    id: string;
    uuid: string;
    major: number;
    minor: number;
    location: {
        buildingId: string;
        floorNumber: number;
        x: number; // meters from origin
        y: number;
        z?: number;
    };
    txPower: number; // dBm at 1 meter
    name?: string;
}

export interface IndoorPosition {
    userId: string;
    userName?: string;
    buildingId: string;
    floorNumber: number;
    x: number;
    y: number;
    accuracy: number; // meters
    timestamp: Date;
    beaconsDetected: { beaconId: string; rssi: number }[];
}

export interface FloorPlan {
    id: string;
    buildingId: string;
    floorNumber: number;
    name: string;
    imageUrl: string;
    width: number;  // meters
    height: number; // meters
    origin: { lat: number; lng: number };
    rotation: number; // degrees
    scale: number; // pixels per meter
}

export interface Building {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    address?: string;
    floors: FloorPlan[];
    beacons: BLEBeacon[];
}

// ============ Service ============

@Injectable()
export class IndoorPositioningService {
    private readonly logger = new Logger(IndoorPositioningService.name);

    // In-memory storage
    private buildings: Map<string, Building> = new Map();
    private positions: Map<string, IndoorPosition> = new Map();

    constructor(private readonly eventEmitter: EventEmitter2) { }

    // ==================== Building Management ====================

    registerBuilding(building: Building): void {
        this.buildings.set(building.id, building);
        this.logger.log(`Building registered: ${building.name} with ${building.floors.length} floors`);
    }

    getBuilding(buildingId: string): Building | undefined {
        return this.buildings.get(buildingId);
    }

    getAllBuildings(): Building[] {
        return Array.from(this.buildings.values());
    }

    // ==================== Beacon Management ====================

    addBeacon(buildingId: string, beacon: BLEBeacon): void {
        const building = this.buildings.get(buildingId);
        if (building) {
            building.beacons.push(beacon);
            this.logger.log(`Beacon added: ${beacon.uuid} to ${building.name}`);
        }
    }

    getBeaconsByFloor(buildingId: string, floorNumber: number): BLEBeacon[] {
        const building = this.buildings.get(buildingId);
        if (!building) return [];
        return building.beacons.filter(b => b.location.floorNumber === floorNumber);
    }

    // ==================== Position Calculation ====================

    /**
     * 三邊測量定位 (Trilateration)
     * 輸入: 偵測到的 beacons 及其 RSSI
     */
    calculatePosition(
        userId: string,
        userName: string | undefined,
        buildingId: string,
        detectedBeacons: { beaconId: string; rssi: number }[]
    ): IndoorPosition | null {
        const building = this.buildings.get(buildingId);
        if (!building || detectedBeacons.length < 3) {
            return null;
        }

        // Find matching beacons
        const matchedBeacons: { beacon: BLEBeacon; distance: number }[] = [];

        for (const detected of detectedBeacons) {
            const beacon = building.beacons.find(b => b.id === detected.beaconId);
            if (beacon) {
                const distance = this.rssiToDistance(detected.rssi, beacon.txPower);
                matchedBeacons.push({ beacon, distance });
            }
        }

        if (matchedBeacons.length < 3) {
            return null;
        }

        // Trilateration with top 3 closest beacons
        matchedBeacons.sort((a, b) => a.distance - b.distance);
        const top3 = matchedBeacons.slice(0, 3);

        // Determine floor (use most common floor among detected beacons)
        const floorCounts = new Map<number, number>();
        for (const { beacon } of top3) {
            const floor = beacon.location.floorNumber;
            floorCounts.set(floor, (floorCounts.get(floor) || 0) + 1);
        }
        let maxFloor = 0, maxCount = 0;
        floorCounts.forEach((count, floor) => {
            if (count > maxCount) {
                maxCount = count;
                maxFloor = floor;
            }
        });

        // Simple weighted centroid (for demo - real implementation uses trilateration)
        const position = this.weightedCentroid(top3);

        const indoorPosition: IndoorPosition = {
            userId,
            userName,
            buildingId,
            floorNumber: maxFloor,
            x: position.x,
            y: position.y,
            accuracy: this.estimateAccuracy(top3),
            timestamp: new Date(),
            beaconsDetected: detectedBeacons,
        };

        // Store and emit
        this.positions.set(userId, indoorPosition);
        this.eventEmitter.emit('indoor.position', indoorPosition);

        return indoorPosition;
    }

    /**
     * RSSI 轉距離 (Log-Distance Path Loss Model)
     */
    private rssiToDistance(rssi: number, txPower: number): number {
        if (rssi >= txPower) return 0.1;

        const n = 2.0; // Path loss exponent (2 = free space, 2.5-4 = indoor)
        return Math.pow(10, (txPower - rssi) / (10 * n));
    }

    /**
     * 加權重心計算
     */
    private weightedCentroid(beacons: { beacon: BLEBeacon; distance: number }[]): { x: number; y: number } {
        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;

        for (const { beacon, distance } of beacons) {
            const weight = 1 / Math.max(distance, 0.1);
            totalWeight += weight;
            weightedX += beacon.location.x * weight;
            weightedY += beacon.location.y * weight;
        }

        return {
            x: weightedX / totalWeight,
            y: weightedY / totalWeight,
        };
    }

    /**
     * 估計精度
     */
    private estimateAccuracy(beacons: { beacon: BLEBeacon; distance: number }[]): number {
        if (beacons.length === 0) return 10;
        const avgDistance = beacons.reduce((sum, b) => sum + b.distance, 0) / beacons.length;
        return Math.min(avgDistance * 0.3, 5); // Cap at 5 meters
    }

    // ==================== Query ====================

    getPosition(userId: string): IndoorPosition | undefined {
        return this.positions.get(userId);
    }

    getAllPositions(buildingId?: string): IndoorPosition[] {
        const all = Array.from(this.positions.values());
        if (buildingId) {
            return all.filter(p => p.buildingId === buildingId);
        }
        return all;
    }

    getPositionsByFloor(buildingId: string, floorNumber: number): IndoorPosition[] {
        return this.getAllPositions(buildingId).filter(p => p.floorNumber === floorNumber);
    }
}
