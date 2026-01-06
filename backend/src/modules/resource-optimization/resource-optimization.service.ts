import { Injectable, Logger } from '@nestjs/common';

/**
 * Resource Optimization Service
 * Linear programming-based resource allocation optimization
 */
@Injectable()
export class ResourceOptimizationService {
    private readonly logger = new Logger(ResourceOptimizationService.name);

    /**
     * Optimize resource allocation across locations
     */
    optimizeAllocation(config: OptimizationConfig): OptimizationResult {
        const { resources, demands, constraints } = config;

        // Simple greedy allocation (would use LP solver in production)
        const allocations: ResourceAllocation[] = [];
        const remainingResources = new Map(resources.map((r) => [r.id, r.available]));

        // Sort demands by priority (critical first)
        const sortedDemands = [...demands].sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        for (const demand of sortedDemands) {
            // Find best resource source for this demand
            const matchingResources = resources.filter((r) =>
                r.type === demand.resourceType &&
                (remainingResources.get(r.id) || 0) > 0
            );

            if (matchingResources.length === 0) continue;

            // Sort by distance/cost
            matchingResources.sort((a, b) => {
                const distA = this.calculateDistance(a.location, demand.location);
                const distB = this.calculateDistance(b.location, demand.location);
                return distA - distB;
            });

            let needed = demand.quantity;

            for (const resource of matchingResources) {
                if (needed <= 0) break;

                const available = remainingResources.get(resource.id) || 0;
                const allocate = Math.min(available, needed);

                if (allocate > 0) {
                    allocations.push({
                        resourceId: resource.id,
                        demandId: demand.id,
                        quantity: allocate,
                        distance: this.calculateDistance(resource.location, demand.location),
                        estimatedTime: this.estimateTransportTime(
                            resource.location,
                            demand.location,
                            resource.type,
                        ),
                    });

                    remainingResources.set(resource.id, available - allocate);
                    needed -= allocate;
                }
            }
        }

        // Calculate metrics
        const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
        const totalDemand = demands.reduce((sum, d) => sum + d.quantity, 0);
        const fulfillmentRate = totalDemand > 0 ? totalAllocated / totalDemand : 1;

        const unmetDemands = demands.filter((d) => {
            const allocated = allocations
                .filter((a) => a.demandId === d.id)
                .reduce((sum, a) => sum + a.quantity, 0);
            return allocated < d.quantity;
        });

        return {
            allocations,
            metrics: {
                totalAllocated,
                totalDemand,
                fulfillmentRate,
                unmetDemandsCount: unmetDemands.length,
                averageDistance: allocations.length > 0
                    ? allocations.reduce((sum, a) => sum + a.distance, 0) / allocations.length
                    : 0,
            },
            recommendations: this.generateRecommendations(unmetDemands, remainingResources),
            optimizedAt: new Date(),
        };
    }

    /**
     * Suggest optimal depot locations
     */
    suggestDepotLocations(
        demandPoints: GeoPoint[],
        numDepots: number,
    ): DepotSuggestion[] {
        // K-means clustering to find optimal depot locations
        const centroids = this.kMeansClustering(demandPoints, numDepots);

        return centroids.map((centroid, index) => ({
            id: `depot-${index + 1}`,
            location: centroid,
            coverageRadius: this.calculateCoverageRadius(centroid, demandPoints),
            demandPointsServed: demandPoints.filter((p) =>
                this.calculateDistance(p, centroid) <= 10000
            ).length,
        }));
    }

    /**
     * Optimize transport routes
     */
    optimizeRoutes(
        origin: GeoPoint,
        destinations: GeoPoint[],
    ): OptimizedRoute {
        // Nearest neighbor TSP approximation
        const route: GeoPoint[] = [origin];
        const remaining = [...destinations];

        while (remaining.length > 0) {
            const current = route[route.length - 1];
            let nearestIdx = 0;
            let nearestDist = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const dist = this.calculateDistance(current, remaining[i]);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = i;
                }
            }

            route.push(remaining[nearestIdx]);
            remaining.splice(nearestIdx, 1);
        }

        const totalDistance = route.reduce((sum, point, index) => {
            if (index === 0) return 0;
            return sum + this.calculateDistance(route[index - 1], point);
        }, 0);

        return {
            route,
            totalDistance,
            estimatedTime: Math.ceil(totalDistance / 500), // ~30 km/h average
            stops: route.length - 1,
        };
    }

    // Private helpers
    private calculateDistance(a: GeoPoint, b: GeoPoint): number {
        const R = 6371000;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    private estimateTransportTime(from: GeoPoint, to: GeoPoint, type: string): number {
        const distance = this.calculateDistance(from, to);
        const speed = type === 'medical' ? 60000 : 30000; // m/h
        return Math.ceil(distance / speed * 60);
    }

    private generateRecommendations(
        unmetDemands: ResourceDemand[],
        remaining: Map<string, number>,
    ): string[] {
        const recommendations: string[] = [];

        if (unmetDemands.length > 0) {
            recommendations.push(`${unmetDemands.length} 項需求無法滿足，建議請求外部支援`);
        }

        const criticalUnmet = unmetDemands.filter((d) => d.priority === 'critical');
        if (criticalUnmet.length > 0) {
            recommendations.push(`緊急: ${criticalUnmet.length} 項關鍵需求缺口`);
        }

        return recommendations;
    }

    private kMeansClustering(points: GeoPoint[], k: number): GeoPoint[] {
        if (points.length <= k) return points;

        // Initialize centroids randomly
        const centroids = points.slice(0, k).map((p) => ({ ...p }));

        for (let iter = 0; iter < 10; iter++) {
            const clusters: GeoPoint[][] = Array.from({ length: k }, () => []);

            // Assign points to nearest centroid
            for (const point of points) {
                let nearestIdx = 0;
                let nearestDist = Infinity;

                for (let i = 0; i < centroids.length; i++) {
                    const dist = this.calculateDistance(point, centroids[i]);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = i;
                    }
                }
                clusters[nearestIdx].push(point);
            }

            // Update centroids
            for (let i = 0; i < k; i++) {
                if (clusters[i].length > 0) {
                    centroids[i] = {
                        lat: clusters[i].reduce((s, p) => s + p.lat, 0) / clusters[i].length,
                        lng: clusters[i].reduce((s, p) => s + p.lng, 0) / clusters[i].length,
                    };
                }
            }
        }

        return centroids;
    }

    private calculateCoverageRadius(center: GeoPoint, points: GeoPoint[]): number {
        const distances = points.map((p) => this.calculateDistance(center, p));
        return Math.max(...distances);
    }
}

// Types
interface GeoPoint { lat: number; lng: number; }

interface ResourceSource {
    id: string;
    type: string;
    available: number;
    location: GeoPoint;
}

interface ResourceDemand {
    id: string;
    resourceType: string;
    quantity: number;
    location: GeoPoint;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

interface OptimizationConfig {
    resources: ResourceSource[];
    demands: ResourceDemand[];
    constraints?: { maxDistance?: number; maxTime?: number };
}

interface ResourceAllocation {
    resourceId: string;
    demandId: string;
    quantity: number;
    distance: number;
    estimatedTime: number;
}

interface OptimizationResult {
    allocations: ResourceAllocation[];
    metrics: {
        totalAllocated: number;
        totalDemand: number;
        fulfillmentRate: number;
        unmetDemandsCount: number;
        averageDistance: number;
    };
    recommendations: string[];
    optimizedAt: Date;
}

interface DepotSuggestion {
    id: string;
    location: GeoPoint;
    coverageRadius: number;
    demandPointsServed: number;
}

interface OptimizedRoute {
    route: GeoPoint[];
    totalDistance: number;
    estimatedTime: number;
    stops: number;
}
