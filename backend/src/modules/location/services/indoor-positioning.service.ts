import { Injectable, Logger } from '@nestjs/common';

export interface Beacon {
    id: string;
    uuid: string;
    major: number;
    minor: number;
    position: { x: number; y: number; floor: number };
    buildingId: string;
}

export interface IndoorPosition {
    x: number;
    y: number;
    floor: number;
    accuracy: number;
    timestamp: Date;
    method: 'beacon' | 'wifi' | 'magnetic' | 'hybrid';
}

@Injectable()
export class IndoorPositioningService {
    private readonly logger = new Logger(IndoorPositioningService.name);
    private beacons: Map<string, Beacon> = new Map();

    registerBeacon(beacon: Beacon): void {
        this.beacons.set(beacon.id, beacon);
    }

    calculatePosition(signals: Array<{ beaconId: string; rssi: number }>): IndoorPosition | null {
        if (signals.length < 3) return null;

        const positions = signals
            .map(s => {
                const beacon = this.beacons.get(s.beaconId);
                if (!beacon) return null;
                const distance = this.rssiToDistance(s.rssi);
                return { ...beacon.position, distance };
            })
            .filter(p => p !== null);

        if (positions.length < 3) return null;

        // Trilateration (simplified)
        const { x, y } = this.trilaterate(positions as any);
        const floor = positions[0]!.floor;

        return {
            x,
            y,
            floor,
            accuracy: 2.5,
            timestamp: new Date(),
            method: 'beacon',
        };
    }

    getBeaconsByBuilding(buildingId: string): Beacon[] {
        return Array.from(this.beacons.values()).filter(b => b.buildingId === buildingId);
    }

    private rssiToDistance(rssi: number): number {
        const txPower = -59; // 1m reference
        const n = 2.0;
        return Math.pow(10, (txPower - rssi) / (10 * n));
    }

    private trilaterate(points: Array<{ x: number; y: number; distance: number }>): { x: number; y: number } {
        // Simplified weighted centroid
        let sumX = 0, sumY = 0, sumW = 0;
        for (const p of points) {
            const w = 1 / (p.distance * p.distance);
            sumX += p.x * w;
            sumY += p.y * w;
            sumW += w;
        }
        return { x: sumX / sumW, y: sumY / sumW };
    }
}
