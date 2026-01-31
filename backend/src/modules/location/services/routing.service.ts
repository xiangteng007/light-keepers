import { Injectable, Logger } from '@nestjs/common';

export interface RoutePoint {
    lat: number;
    lng: number;
    elevation?: number;
}

export interface RouteSegment {
    from: RoutePoint;
    to: RoutePoint;
    distance: number;
    duration: number;
    mode: 'driving' | 'walking' | 'emergency';
    instructions?: string;
}

export interface Route {
    id: string;
    origin: RoutePoint;
    destination: RoutePoint;
    segments: RouteSegment[];
    totalDistance: number;
    totalDuration: number;
    mode: string;
    calculatedAt: Date;
}

@Injectable()
export class RoutingService {
    private readonly logger = new Logger(RoutingService.name);

    async calculateRoute(
        origin: RoutePoint,
        destination: RoutePoint,
        mode: 'driving' | 'walking' | 'emergency' = 'driving'
    ): Promise<Route> {
        const distance = this.haversineDistance(origin, destination);
        const speed = mode === 'walking' ? 5 : mode === 'emergency' ? 80 : 40;
        const duration = (distance / speed) * 60;

        return {
            id: `route-${Date.now()}`,
            origin,
            destination,
            segments: [{
                from: origin,
                to: destination,
                distance,
                duration,
                mode,
            }],
            totalDistance: distance,
            totalDuration: duration,
            mode,
            calculatedAt: new Date(),
        };
    }

    async calculateMultiStop(
        waypoints: RoutePoint[],
        mode: 'driving' | 'walking' | 'emergency' = 'driving'
    ): Promise<Route> {
        if (waypoints.length < 2) throw new Error('At least 2 waypoints required');

        const segments: RouteSegment[] = [];
        let totalDistance = 0;
        let totalDuration = 0;

        for (let i = 0; i < waypoints.length - 1; i++) {
            const route = await this.calculateRoute(waypoints[i], waypoints[i + 1], mode);
            segments.push(...route.segments);
            totalDistance += route.totalDistance;
            totalDuration += route.totalDuration;
        }

        return {
            id: `route-${Date.now()}`,
            origin: waypoints[0],
            destination: waypoints[waypoints.length - 1],
            segments,
            totalDistance,
            totalDuration,
            mode,
            calculatedAt: new Date(),
        };
    }

    optimizeWaypoints(waypoints: RoutePoint[]): RoutePoint[] {
        // Nearest neighbor TSP approximation
        if (waypoints.length <= 2) return waypoints;

        const result: RoutePoint[] = [waypoints[0]];
        const remaining = waypoints.slice(1);

        while (remaining.length > 0) {
            const last = result[result.length - 1];
            let minDist = Infinity;
            let minIdx = 0;

            for (let i = 0; i < remaining.length; i++) {
                const dist = this.haversineDistance(last, remaining[i]);
                if (dist < minDist) {
                    minDist = dist;
                    minIdx = i;
                }
            }

            result.push(remaining[minIdx]);
            remaining.splice(minIdx, 1);
        }

        return result;
    }

    private haversineDistance(p1: RoutePoint, p2: RoutePoint): number {
        const R = 6371;
        const dLat = this.toRad(p2.lat - p1.lat);
        const dLng = this.toRad(p2.lng - p1.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(p1.lat)) * Math.cos(this.toRad(p2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
