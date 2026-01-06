/**
 * Geofencing Service
 * Location-based zone monitoring and alerts
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface GeoZone {
    id: string;
    name: string;
    type: 'circle' | 'polygon';
    center?: { lat: number; lng: number }; // For circle
    radius?: number; // For circle, in meters
    polygon?: Array<{ lat: number; lng: number }>; // For polygon
    alertOnEntry: boolean;
    alertOnExit: boolean;
    alertMessage?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    active: boolean;
    createdAt: Date;
    expiresAt?: Date;
    metadata?: Record<string, any>;
}

export interface LocationPoint {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: Date;
}

export interface ProximityResult {
    zone: GeoZone;
    distance: number; // in meters
    isInside: boolean;
}

@Injectable()
export class GeofencingService {
    private readonly logger = new Logger(GeofencingService.name);
    private readonly ZONES_KEY = 'geofence:zones';

    constructor(private cache: CacheService) { }

    // ==================== Zone Management ====================

    /**
     * Create a new geofence zone
     */
    async createZone(zone: Omit<GeoZone, 'id' | 'createdAt'>): Promise<GeoZone> {
        const newZone: GeoZone = {
            ...zone,
            id: `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
        };

        const zones = await this.getAllZones();
        zones.push(newZone);
        await this.saveZones(zones);

        this.logger.log(`Created geofence zone: ${newZone.name}`);
        return newZone;
    }

    /**
     * Get all zones
     */
    async getAllZones(): Promise<GeoZone[]> {
        const zones = await this.cache.get<GeoZone[]>(this.ZONES_KEY);
        return zones || [];
    }

    /**
     * Get active zones only
     */
    async getActiveZones(): Promise<GeoZone[]> {
        const zones = await this.getAllZones();
        const now = new Date();
        return zones.filter(z => z.active && (!z.expiresAt || new Date(z.expiresAt) > now));
    }

    /**
     * Get zone by ID
     */
    async getZone(id: string): Promise<GeoZone | null> {
        const zones = await this.getAllZones();
        return zones.find(z => z.id === id) || null;
    }

    /**
     * Update a zone
     */
    async updateZone(id: string, updates: Partial<GeoZone>): Promise<GeoZone | null> {
        const zones = await this.getAllZones();
        const index = zones.findIndex(z => z.id === id);

        if (index === -1) return null;

        zones[index] = { ...zones[index], ...updates };
        await this.saveZones(zones);

        return zones[index];
    }

    /**
     * Delete a zone
     */
    async deleteZone(id: string): Promise<boolean> {
        const zones = await this.getAllZones();
        const filtered = zones.filter(z => z.id !== id);

        if (filtered.length === zones.length) return false;

        await this.saveZones(filtered);
        return true;
    }

    // ==================== Location Checking ====================

    /**
     * Check if a point is inside any active zones
     */
    async checkLocation(point: LocationPoint): Promise<ProximityResult[]> {
        const zones = await this.getActiveZones();
        const results: ProximityResult[] = [];

        for (const zone of zones) {
            const result = this.checkZone(point, zone);
            if (result) {
                results.push(result);
            }
        }

        return results.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Get zones within a radius of a point
     */
    async getZonesNear(point: LocationPoint, radiusMeters: number): Promise<ProximityResult[]> {
        const results = await this.checkLocation(point);
        return results.filter(r => r.distance <= radiusMeters);
    }

    /**
     * Check if point is inside a specific zone
     */
    checkZone(point: LocationPoint, zone: GeoZone): ProximityResult | null {
        if (zone.type === 'circle' && zone.center && zone.radius) {
            const distance = this.calculateDistance(point, zone.center);
            return {
                zone,
                distance,
                isInside: distance <= zone.radius,
            };
        }

        if (zone.type === 'polygon' && zone.polygon && zone.polygon.length >= 3) {
            const isInside = this.isPointInPolygon(point, zone.polygon);
            const distance = isInside ? 0 : this.distanceToPolygon(point, zone.polygon);
            return {
                zone,
                distance,
                isInside,
            };
        }

        return null;
    }

    // ==================== Geospatial Calculations ====================

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(point1: LocationPoint, point2: LocationPoint): number {
        const R = 6371000; // Earth radius in meters
        const φ1 = (point1.lat * Math.PI) / 180;
        const φ2 = (point2.lat * Math.PI) / 180;
        const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
        const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Check if point is inside polygon (Ray casting algorithm)
     */
    isPointInPolygon(point: LocationPoint, polygon: Array<{ lat: number; lng: number }>): boolean {
        let inside = false;
        const n = polygon.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].lng, yi = polygon[i].lat;
            const xj = polygon[j].lng, yj = polygon[j].lat;

            const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
                (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    }

    /**
     * Calculate minimum distance from point to polygon boundary
     */
    distanceToPolygon(point: LocationPoint, polygon: Array<{ lat: number; lng: number }>): number {
        let minDistance = Infinity;
        const n = polygon.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const dist = this.distanceToLineSegment(point, polygon[i], polygon[j]);
            if (dist < minDistance) {
                minDistance = dist;
            }
        }

        return minDistance;
    }

    /**
     * Calculate distance from point to line segment
     */
    distanceToLineSegment(
        point: LocationPoint,
        lineStart: { lat: number; lng: number },
        lineEnd: { lat: number; lng: number }
    ): number {
        const d = this.calculateDistance(lineStart, lineEnd);
        if (d === 0) return this.calculateDistance(point, lineStart);

        const t = Math.max(0, Math.min(1,
            ((point.lat - lineStart.lat) * (lineEnd.lat - lineStart.lat) +
                (point.lng - lineStart.lng) * (lineEnd.lng - lineStart.lng)) / (d * d)
        ));

        const projLat = lineStart.lat + t * (lineEnd.lat - lineStart.lat);
        const projLng = lineStart.lng + t * (lineEnd.lng - lineStart.lng);

        return this.calculateDistance(point, { lat: projLat, lng: projLng });
    }

    /**
     * Calculate bounding box for a set of points
     */
    getBoundingBox(points: Array<{ lat: number; lng: number }>): {
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
    } {
        const lats = points.map(p => p.lat);
        const lngs = points.map(p => p.lng);

        return {
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats),
            minLng: Math.min(...lngs),
            maxLng: Math.max(...lngs),
        };
    }

    // ==================== Private Methods ====================

    private async saveZones(zones: GeoZone[]): Promise<void> {
        await this.cache.set(this.ZONES_KEY, zones, { ttl: 0 }); // No expiry
    }
}
