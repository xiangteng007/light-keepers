/**
 * Route Planning Service
 * Evacuation and resource delivery route optimization
 */

import { Injectable, Logger } from '@nestjs/common';

export interface RoutePoint {
    lat: number;
    lng: number;
    name?: string;
    type?: 'origin' | 'destination' | 'waypoint' | 'shelter' | 'hazard';
}

export interface Route {
    id: string;
    origin: RoutePoint;
    destination: RoutePoint;
    waypoints: RoutePoint[];
    distance: number; // meters
    duration: number; // seconds
    polyline: Array<{ lat: number; lng: number }>;
    avoidedHazards: string[];
    alternativeRoutes?: Route[];
}

export interface ShortestPathResult {
    path: RoutePoint[];
    totalDistance: number;
    estimatedTime: number;
}

@Injectable()
export class RoutePlanningService {
    private readonly logger = new Logger(RoutePlanningService.name);

    // Predefined shelter locations (demo data)
    private shelters: RoutePoint[] = [
        { lat: 25.0330, lng: 121.5654, name: '台北市政府避難所', type: 'shelter' },
        { lat: 25.0418, lng: 121.5654, name: '松山區市民活動中心', type: 'shelter' },
        { lat: 25.0275, lng: 121.5599, name: '大安區活動中心', type: 'shelter' },
    ];

    // Active hazard zones (demo data)
    private hazardZones: Array<{ center: RoutePoint; radiusKm: number; type: string }> = [];

    // ==================== Route Planning ====================

    /**
     * Plan evacuation route from current location to nearest shelter
     */
    async planEvacuationRoute(
        origin: RoutePoint,
        preferredShelter?: string
    ): Promise<Route> {
        // Find nearest shelter
        const shelter = preferredShelter
            ? this.shelters.find(s => s.name === preferredShelter)
            : this.findNearestShelter(origin);

        if (!shelter) {
            throw new Error('No available shelters found');
        }

        return this.calculateRoute(origin, shelter, { avoidHazards: true });
    }

    /**
     * Plan resource delivery route with multiple stops
     */
    async planDeliveryRoute(
        origin: RoutePoint,
        destinations: RoutePoint[],
        options?: { optimize?: boolean }
    ): Promise<Route> {
        let waypoints = destinations;

        // Optimize order if requested
        if (options?.optimize) {
            waypoints = this.optimizeStopOrder(origin, destinations);
        }

        const finalDestination = waypoints.pop()!;

        return this.calculateRoute(origin, finalDestination, {
            waypoints,
            avoidHazards: true,
        });
    }

    /**
     * Find alternative routes avoiding specific areas
     */
    async findAlternativeRoutes(
        origin: RoutePoint,
        destination: RoutePoint,
        avoid: RoutePoint[],
        count: number = 3
    ): Promise<Route[]> {
        const routes: Route[] = [];

        // Generate main route
        const mainRoute = await this.calculateRoute(origin, destination, {
            avoidPoints: avoid,
        });
        routes.push(mainRoute);

        // Generate alternative routes by adding detours
        for (let i = 1; i < count; i++) {
            const detourPoint = this.generateDetourPoint(origin, destination, i);
            const altRoute = await this.calculateRoute(origin, destination, {
                waypoints: [detourPoint],
                avoidPoints: avoid,
            });
            altRoute.id = `route-alt-${i}`;
            routes.push(altRoute);
        }

        return routes;
    }

    // ==================== Shelter Management ====================

    /**
     * Get list of available shelters
     */
    getShelters(): RoutePoint[] {
        return this.shelters;
    }

    /**
     * Find nearest shelter to a location
     */
    findNearestShelter(location: RoutePoint): RoutePoint | null {
        if (this.shelters.length === 0) return null;

        let nearest = this.shelters[0];
        let minDistance = this.calculateDistance(location, nearest);

        for (const shelter of this.shelters) {
            const distance = this.calculateDistance(location, shelter);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = shelter;
            }
        }

        return nearest;
    }

    /**
     * Add shelter location
     */
    addShelter(shelter: RoutePoint): void {
        shelter.type = 'shelter';
        this.shelters.push(shelter);
    }

    // ==================== Hazard Zones ====================

    /**
     * Add hazard zone to avoid in routing
     */
    addHazardZone(center: RoutePoint, radiusKm: number, type: string): void {
        this.hazardZones.push({ center, radiusKm, type });
        this.logger.log(`Added hazard zone: ${type} at ${center.lat}, ${center.lng}`);
    }

    /**
     * Clear all hazard zones
     */
    clearHazardZones(): void {
        this.hazardZones = [];
    }

    /**
     * Check if a point is in any hazard zone
     */
    isInHazardZone(point: RoutePoint): { inZone: boolean; hazardType?: string } {
        for (const zone of this.hazardZones) {
            const distance = this.calculateDistance(point, zone.center);
            if (distance <= zone.radiusKm) {
                return { inZone: true, hazardType: zone.type };
            }
        }
        return { inZone: false };
    }

    // ==================== Private Helpers ====================

    private async calculateRoute(
        origin: RoutePoint,
        destination: RoutePoint,
        options?: {
            waypoints?: RoutePoint[];
            avoidHazards?: boolean;
            avoidPoints?: RoutePoint[];
        }
    ): Promise<Route> {
        const waypoints = options?.waypoints || [];
        const avoidedHazards: string[] = [];

        // Generate simple polyline (in production, use Google Maps/OpenRouteService)
        const polyline = this.generateSimplePolyline(origin, destination, waypoints);

        // Check for hazard intersections
        if (options?.avoidHazards) {
            for (const zone of this.hazardZones) {
                for (const point of polyline) {
                    const distance = this.calculateDistance(point, zone.center);
                    if (distance <= zone.radiusKm) {
                        avoidedHazards.push(zone.type);
                        break;
                    }
                }
            }
        }

        // Calculate distance and duration
        const distance = this.calculateTotalDistance(polyline);
        const duration = Math.round(distance / 0.833); // ~50 km/h average

        return {
            id: `route-${Date.now()}`,
            origin,
            destination,
            waypoints,
            distance: Math.round(distance * 1000), // Convert to meters
            duration,
            polyline,
            avoidedHazards: [...new Set(avoidedHazards)],
        };
    }

    private generateSimplePolyline(
        origin: RoutePoint,
        destination: RoutePoint,
        waypoints: RoutePoint[]
    ): Array<{ lat: number; lng: number }> {
        const points: Array<{ lat: number; lng: number }> = [];
        const allPoints = [origin, ...waypoints, destination];

        for (let i = 0; i < allPoints.length - 1; i++) {
            const start = allPoints[i];
            const end = allPoints[i + 1];

            // Add intermediate points
            const steps = 10;
            for (let j = 0; j <= steps; j++) {
                points.push({
                    lat: start.lat + (end.lat - start.lat) * (j / steps),
                    lng: start.lng + (end.lng - start.lng) * (j / steps),
                });
            }
        }

        return points;
    }

    private calculateDistance(a: RoutePoint, b: RoutePoint): number {
        const R = 6371; // Earth radius in km
        const dLat = (b.lat - a.lat) * Math.PI / 180;
        const dLng = (b.lng - a.lng) * Math.PI / 180;
        const lat1 = a.lat * Math.PI / 180;
        const lat2 = b.lat * Math.PI / 180;

        const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

        return 2 * R * Math.asin(Math.sqrt(h));
    }

    private calculateTotalDistance(polyline: Array<{ lat: number; lng: number }>): number {
        let total = 0;
        for (let i = 0; i < polyline.length - 1; i++) {
            total += this.calculateDistance(polyline[i], polyline[i + 1]);
        }
        return total;
    }

    private optimizeStopOrder(origin: RoutePoint, destinations: RoutePoint[]): RoutePoint[] {
        // Simple nearest neighbor algorithm
        const remaining = [...destinations];
        const ordered: RoutePoint[] = [];
        let current = origin;

        while (remaining.length > 0) {
            let nearestIdx = 0;
            let nearestDist = this.calculateDistance(current, remaining[0]);

            for (let i = 1; i < remaining.length; i++) {
                const dist = this.calculateDistance(current, remaining[i]);
                if (dist < nearestDist) {
                    nearestIdx = i;
                    nearestDist = dist;
                }
            }

            current = remaining.splice(nearestIdx, 1)[0];
            ordered.push(current);
        }

        return ordered;
    }

    private generateDetourPoint(
        origin: RoutePoint,
        destination: RoutePoint,
        index: number
    ): RoutePoint {
        // Generate a detour point perpendicular to the main route
        const midLat = (origin.lat + destination.lat) / 2;
        const midLng = (origin.lng + destination.lng) / 2;
        const offset = 0.02 * index * (index % 2 === 0 ? 1 : -1);

        return {
            lat: midLat + offset,
            lng: midLng + offset,
            type: 'waypoint',
        };
    }
}
