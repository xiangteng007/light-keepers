/**
 * Last-Mile Routing Service
 * Phase 5.3: 最後一哩路路徑規劃
 * 
 * 功能:
 * 1. 動態路網阻斷管理
 * 2. A* 離線路徑計算
 * 3. 替代路線建議
 */

import { Injectable, Logger } from '@nestjs/common';

// ============ Types ============

export interface GeoPoint {
    lat: number;
    lng: number;
}

export interface RoadBlock {
    id: string;
    missionSessionId: string;
    location: GeoPoint;
    radius: number; // meters
    reason: string;
    severity: 'complete' | 'partial' | 'slow';
    reportedBy?: string;
    createdAt: Date;
    expiresAt?: Date;
}

export interface RouteRequest {
    origin: GeoPoint;
    destination: GeoPoint;
    missionSessionId: string;
    avoidBlocks?: boolean;
    vehicleType?: 'car' | 'motorcycle' | 'walking' | 'emergency';
}

export interface RouteResult {
    success: boolean;
    route?: RoutePoint[];
    distance: number; // meters
    duration: number; // seconds
    warnings: string[];
    blocksAvoided: string[];
}

export interface RoutePoint {
    lat: number;
    lng: number;
    instruction?: string;
}

// ============ Service ============

@Injectable()
export class RoutingService {
    private readonly logger = new Logger(RoutingService.name);

    // In-memory road blocks storage
    private roadBlocks: Map<string, RoadBlock[]> = new Map();

    // ==================== Road Block Management ====================

    /**
     * 新增路網阻斷點
     */
    addRoadBlock(block: Omit<RoadBlock, 'id' | 'createdAt'>): RoadBlock {
        const id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newBlock: RoadBlock = {
            ...block,
            id,
            createdAt: new Date(),
        };

        const blocks = this.roadBlocks.get(block.missionSessionId) || [];
        blocks.push(newBlock);
        this.roadBlocks.set(block.missionSessionId, blocks);

        this.logger.log(`Road block added: ${id} at ${block.location.lat},${block.location.lng}`);
        return newBlock;
    }

    /**
     * 移除路網阻斷點
     */
    removeRoadBlock(missionSessionId: string, blockId: string): boolean {
        const blocks = this.roadBlocks.get(missionSessionId);
        if (!blocks) return false;

        const index = blocks.findIndex(b => b.id === blockId);
        if (index >= 0) {
            blocks.splice(index, 1);
            this.logger.log(`Road block removed: ${blockId}`);
            return true;
        }
        return false;
    }

    /**
     * 取得任務的所有阻斷點
     */
    getRoadBlocks(missionSessionId: string): RoadBlock[] {
        return this.roadBlocks.get(missionSessionId) || [];
    }

    /**
     * 清除過期阻斷點
     */
    cleanupExpiredBlocks(missionSessionId: string): number {
        const blocks = this.roadBlocks.get(missionSessionId);
        if (!blocks) return 0;

        const now = new Date();
        const before = blocks.length;
        const filtered = blocks.filter(b => !b.expiresAt || b.expiresAt > now);
        this.roadBlocks.set(missionSessionId, filtered);

        return before - filtered.length;
    }

    // ==================== Route Calculation ====================

    /**
     * 計算路徑 (簡化版 A* - 實際應整合 GraphHopper/ORS)
     */
    async calculateRoute(request: RouteRequest): Promise<RouteResult> {
        const { origin, destination, missionSessionId, avoidBlocks = true } = request;

        // Get road blocks for this mission
        const blocks = avoidBlocks ? this.getRoadBlocks(missionSessionId) : [];
        const activeBlocks = blocks.filter(b => !b.expiresAt || b.expiresAt > new Date());

        // Calculate direct distance
        const distance = this.haversineDistance(origin, destination);

        // Check if any blocks are on the direct path
        const blocksOnPath: string[] = [];
        const warnings: string[] = [];

        for (const block of activeBlocks) {
            if (this.isPointNearLine(block.location, origin, destination, block.radius)) {
                blocksOnPath.push(block.id);
                warnings.push(`路徑經過阻斷區: ${block.reason}`);
            }
        }

        // Generate simple route (in production, use actual routing engine)
        const route = this.generateSimpleRoute(origin, destination, blocksOnPath.length > 0);

        // Estimate duration based on distance
        const speed = request.vehicleType === 'walking' ? 5 :
            request.vehicleType === 'motorcycle' ? 40 : 30; // km/h
        const duration = (distance / 1000) / speed * 3600; // seconds

        return {
            success: true,
            route,
            distance,
            duration,
            warnings,
            blocksAvoided: blocksOnPath,
        };
    }

    /**
     * 批量計算多個目的地的路徑
     */
    async calculateMultiRoute(
        origin: GeoPoint,
        destinations: GeoPoint[],
        missionSessionId: string
    ): Promise<{ destination: GeoPoint; result: RouteResult }[]> {
        const results = await Promise.all(
            destinations.map(async (destination) => ({
                destination,
                result: await this.calculateRoute({
                    origin,
                    destination,
                    missionSessionId,
                }),
            }))
        );

        // Sort by distance
        return results.sort((a, b) => a.result.distance - b.result.distance);
    }

    // ==================== Helpers ====================

    /**
     * Haversine distance (meters)
     */
    private haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
        const R = 6371000; // Earth radius in meters
        const lat1 = p1.lat * Math.PI / 180;
        const lat2 = p2.lat * Math.PI / 180;
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLng = (p2.lng - p1.lng) * Math.PI / 180;

        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Check if point is near the line between two points
     */
    private isPointNearLine(
        point: GeoPoint,
        lineStart: GeoPoint,
        lineEnd: GeoPoint,
        threshold: number
    ): boolean {
        // Simple perpendicular distance check
        const d1 = this.haversineDistance(point, lineStart);
        const d2 = this.haversineDistance(point, lineEnd);
        const lineLength = this.haversineDistance(lineStart, lineEnd);

        // If point is close to either endpoint
        if (d1 < threshold || d2 < threshold) return true;

        // If point is within the bounding box and distance to line is small
        if (d1 + d2 < lineLength * 1.5 && Math.min(d1, d2) < threshold * 2) {
            return true;
        }

        return false;
    }

    /**
     * Generate simple waypoints (mock - use real routing in production)
     */
    private generateSimpleRoute(
        origin: GeoPoint,
        destination: GeoPoint,
        hasBlocks: boolean
    ): RoutePoint[] {
        const points: RoutePoint[] = [
            { ...origin, instruction: '出發' },
        ];

        // If blocks exist, add detour waypoint
        if (hasBlocks) {
            const midLat = (origin.lat + destination.lat) / 2;
            const midLng = (origin.lng + destination.lng) / 2;
            // Offset to simulate detour
            points.push({
                lat: midLat + 0.002,
                lng: midLng + 0.002,
                instruction: '繞道避開阻斷區',
            });
        }

        points.push({ ...destination, instruction: '抵達目的地' });

        return points;
    }
}
