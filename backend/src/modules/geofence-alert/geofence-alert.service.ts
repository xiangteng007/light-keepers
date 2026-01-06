import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Geofence Alert Service
 * Geographic perimeter alerts for disaster zones
 */
@Injectable()
export class GeofenceAlertService {
    private readonly logger = new Logger(GeofenceAlertService.name);
    private geofences: Map<string, Geofence> = new Map();
    private userLocations: Map<string, UserLocation> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    /**
     * 建立地理圍欄
     */
    createGeofence(config: GeofenceConfig): Geofence {
        const geofence: Geofence = {
            id: `geo-${Date.now()}`,
            ...config,
            status: 'active',
            enteredUsers: [],
            createdAt: new Date(),
        };

        this.geofences.set(geofence.id, geofence);
        this.eventEmitter.emit('geofence.created', geofence);

        return geofence;
    }

    /**
     * 更新使用者位置
     */
    updateUserLocation(userId: string, lat: number, lng: number): GeofenceCheckResult {
        const location: UserLocation = { userId, lat, lng, timestamp: new Date() };
        const previousLocation = this.userLocations.get(userId);
        this.userLocations.set(userId, location);

        const results: GeofenceEvent[] = [];

        for (const [, geofence] of this.geofences) {
            if (geofence.status !== 'active') continue;

            const wasInside = previousLocation
                ? this.isInsideGeofence(previousLocation.lat, previousLocation.lng, geofence)
                : false;
            const isInside = this.isInsideGeofence(lat, lng, geofence);

            if (!wasInside && isInside) {
                // 進入圍欄
                results.push({ type: 'enter', geofence, userId });
                geofence.enteredUsers.push(userId);
                this.eventEmitter.emit('geofence.enter', { geofence, userId, location });
            } else if (wasInside && !isInside) {
                // 離開圍欄
                results.push({ type: 'exit', geofence, userId });
                geofence.enteredUsers = geofence.enteredUsers.filter((u) => u !== userId);
                this.eventEmitter.emit('geofence.exit', { geofence, userId, location });
            }
        }

        return { userId, currentLocation: location, events: results };
    }

    /**
     * 取得災區圍欄
     */
    getDisasterZones(): Geofence[] {
        return Array.from(this.geofences.values())
            .filter((g) => g.type === 'disaster_zone')
            .filter((g) => g.status === 'active');
    }

    /**
     * 取得圍欄內使用者
     */
    getUsersInGeofence(geofenceId: string): string[] {
        const geofence = this.geofences.get(geofenceId);
        return geofence?.enteredUsers || [];
    }

    /**
     * 批量檢查使用者是否在危險區
     */
    checkUsersInDangerZones(): DangerZoneAlert[] {
        const alerts: DangerZoneAlert[] = [];

        for (const [userId, location] of this.userLocations) {
            for (const [, geofence] of this.geofences) {
                if (geofence.type === 'danger_zone' && geofence.status === 'active') {
                    if (this.isInsideGeofence(location.lat, location.lng, geofence)) {
                        alerts.push({
                            userId,
                            geofenceId: geofence.id,
                            geofenceName: geofence.name,
                            dangerLevel: geofence.dangerLevel || 'high',
                            message: `使用者位於危險區域: ${geofence.name}`,
                            location,
                        });
                    }
                }
            }
        }

        return alerts;
    }

    /**
     * 停用圍欄
     */
    deactivateGeofence(geofenceId: string): void {
        const geofence = this.geofences.get(geofenceId);
        if (geofence) {
            geofence.status = 'inactive';
            this.eventEmitter.emit('geofence.deactivated', geofence);
        }
    }

    /**
     * 建立快速圍欄 (圓形)
     */
    createQuickCircleZone(name: string, centerLat: number, centerLng: number, radiusMeters: number, type: string): Geofence {
        return this.createGeofence({
            name,
            type: type as any,
            shape: 'circle',
            center: { lat: centerLat, lng: centerLng },
            radius: radiusMeters,
            alertOnEnter: true,
            alertOnExit: true,
        });
    }

    // Private methods
    private isInsideGeofence(lat: number, lng: number, geofence: Geofence): boolean {
        if (geofence.shape === 'circle' && geofence.center && geofence.radius) {
            const distance = this.haversineDistance(lat, lng, geofence.center.lat, geofence.center.lng);
            return distance <= geofence.radius;
        }

        if (geofence.shape === 'polygon' && geofence.vertices) {
            return this.isPointInPolygon(lat, lng, geofence.vertices);
        }

        return false;
    }

    private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000; // meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private isPointInPolygon(lat: number, lng: number, vertices: { lat: number; lng: number }[]): boolean {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].lng, yi = vertices[i].lat;
            const xj = vertices[j].lng, yj = vertices[j].lat;
            if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
}

// Types
interface GeofenceConfig {
    name: string;
    type: 'disaster_zone' | 'danger_zone' | 'shelter' | 'checkpoint' | 'custom';
    shape: 'circle' | 'polygon';
    center?: { lat: number; lng: number };
    radius?: number;
    vertices?: { lat: number; lng: number }[];
    alertOnEnter: boolean;
    alertOnExit: boolean;
    dangerLevel?: 'low' | 'medium' | 'high' | 'critical';
    expiresAt?: Date;
}
interface Geofence extends GeofenceConfig {
    id: string;
    status: 'active' | 'inactive';
    enteredUsers: string[];
    createdAt: Date;
}
interface UserLocation { userId: string; lat: number; lng: number; timestamp: Date; }
interface GeofenceEvent { type: 'enter' | 'exit'; geofence: Geofence; userId: string; }
interface GeofenceCheckResult { userId: string; currentLocation: UserLocation; events: GeofenceEvent[]; }
interface DangerZoneAlert {
    userId: string; geofenceId: string; geofenceName: string;
    dangerLevel: string; message: string; location: UserLocation;
}
