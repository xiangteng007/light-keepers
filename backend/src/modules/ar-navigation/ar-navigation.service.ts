import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * AR Navigation Service
 * WebXR-based augmented reality navigation for disaster response
 */
@Injectable()
export class ArNavigationService {
    private readonly logger = new Logger(ArNavigationService.name);

    // Active AR sessions
    private arSessions: Map<string, ArSession> = new Map();

    // Registered hazard zones for visualization
    private hazardZones: HazardZone[] = [];

    // Navigation waypoints
    private waypoints: Map<string, NavigationWaypoint[]> = new Map();

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create AR session for device
     */
    async createSession(deviceId: string, config: ArSessionConfig): Promise<ArSession> {
        const session: ArSession = {
            id: `ar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            deviceId,
            userId: config.userId,
            mode: config.mode || 'navigation',
            status: 'initializing',
            createdAt: new Date(),
            lastUpdate: new Date(),
            devicePose: null,
            anchors: [],
            settings: {
                showHazards: config.showHazards ?? true,
                showWaypoints: config.showWaypoints ?? true,
                showTeamMembers: config.showTeamMembers ?? true,
                renderQuality: config.renderQuality || 'medium',
            },
        };

        this.arSessions.set(session.id, session);
        this.logger.log(`AR session created: ${session.id} for device ${deviceId}`);

        this.eventEmitter.emit('ar.session.created', session);
        return session;
    }

    /**
     * Update device pose (position + orientation)
     */
    async updateDevicePose(sessionId: string, pose: DevicePose): Promise<void> {
        const session = this.arSessions.get(sessionId);
        if (!session) {
            throw new Error(`AR session not found: ${sessionId}`);
        }

        session.devicePose = pose;
        session.lastUpdate = new Date();
        session.status = 'tracking';

        // Calculate visible objects based on pose
        const visibleObjects = await this.calculateVisibleObjects(session);

        this.eventEmitter.emit('ar.pose.updated', {
            sessionId,
            pose,
            visibleObjects,
        });
    }

    /**
     * Add 3D navigation path overlay
     */
    async setNavigationPath(
        sessionId: string,
        destination: GeoPoint,
        options?: NavigationOptions,
    ): Promise<NavigationPath> {
        const session = this.arSessions.get(sessionId);
        if (!session) {
            throw new Error(`AR session not found: ${sessionId}`);
        }

        // Generate 3D waypoints along the path
        const waypoints = await this.generatePathWaypoints(
            session.devicePose?.position || { lat: 0, lng: 0, alt: 0 },
            destination,
            options,
        );

        const path: NavigationPath = {
            id: `nav-${Date.now()}`,
            sessionId,
            destination,
            waypoints,
            totalDistance: this.calculatePathDistance(waypoints),
            estimatedTime: this.estimateWalkingTime(waypoints),
            createdAt: new Date(),
            status: 'active',
        };

        this.waypoints.set(sessionId, waypoints);

        this.logger.log(
            `Navigation path set: ${path.id} with ${waypoints.length} waypoints`,
        );

        return path;
    }

    /**
     * Register hazard zone for AR visualization
     */
    registerHazardZone(zone: HazardZone): void {
        this.hazardZones.push(zone);

        // Notify all active sessions
        this.arSessions.forEach((session) => {
            if (session.settings.showHazards) {
                this.eventEmitter.emit('ar.hazard.registered', {
                    sessionId: session.id,
                    zone,
                });
            }
        });
    }

    /**
     * Get AR markers for current position
     */
    async getArMarkers(sessionId: string): Promise<ArMarker[]> {
        const session = this.arSessions.get(sessionId);
        if (!session || !session.devicePose) {
            return [];
        }

        const markers: ArMarker[] = [];
        const pos = session.devicePose.position;
        const viewRange = 100; // meters

        // Add hazard zone markers
        if (session.settings.showHazards) {
            for (const zone of this.hazardZones) {
                const distance = this.calculateDistance(pos, zone.center);
                if (distance <= viewRange) {
                    markers.push({
                        id: `hazard-${zone.id}`,
                        type: 'hazard',
                        position: zone.center,
                        label: zone.name,
                        icon: this.getHazardIcon(zone.type),
                        color: this.getHazardColor(zone.severity),
                        distance,
                        metadata: {
                            hazardType: zone.type,
                            severity: zone.severity,
                            radius: zone.radius,
                        },
                    });
                }
            }
        }

        // Add waypoint markers
        if (session.settings.showWaypoints) {
            const pathWaypoints = this.waypoints.get(sessionId) || [];
            pathWaypoints.forEach((wp, index) => {
                const distance = this.calculateDistance(pos, wp.position);
                if (distance <= viewRange) {
                    markers.push({
                        id: `waypoint-${index}`,
                        type: 'waypoint',
                        position: wp.position,
                        label: wp.instruction || `Point ${index + 1}`,
                        icon: 'navigation',
                        color: '#2196F3',
                        distance,
                        metadata: {
                            order: index,
                            isNext: index === 0,
                        },
                    });
                }
            });
        }

        return markers.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    /**
     * End AR session
     */
    endSession(sessionId: string): void {
        const session = this.arSessions.get(sessionId);
        if (session) {
            session.status = 'ended';
            this.arSessions.delete(sessionId);
            this.waypoints.delete(sessionId);

            this.eventEmitter.emit('ar.session.ended', { sessionId });
            this.logger.log(`AR session ended: ${sessionId}`);
        }
    }

    // Private helper methods
    private async calculateVisibleObjects(session: ArSession): Promise<any[]> {
        // Calculate objects within view frustum
        return [];
    }

    private async generatePathWaypoints(
        start: GeoPoint,
        end: GeoPoint,
        options?: NavigationOptions,
    ): Promise<NavigationWaypoint[]> {
        // Generate intermediate waypoints for 3D path rendering
        const waypoints: NavigationWaypoint[] = [];
        const steps = 10;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            waypoints.push({
                position: {
                    lat: start.lat + (end.lat - start.lat) * t,
                    lng: start.lng + (end.lng - start.lng) * t,
                    alt: (start.alt || 0) + ((end.alt || 0) - (start.alt || 0)) * t,
                },
                instruction: i === steps ? 'Arrived at destination' : undefined,
                distance: 0,
            });
        }

        return waypoints;
    }

    private calculatePathDistance(waypoints: NavigationWaypoint[]): number {
        let total = 0;
        for (let i = 1; i < waypoints.length; i++) {
            total += this.calculateDistance(
                waypoints[i - 1].position,
                waypoints[i].position,
            );
        }
        return total;
    }

    private estimateWalkingTime(waypoints: NavigationWaypoint[]): number {
        const distance = this.calculatePathDistance(waypoints);
        const walkingSpeed = 1.4; // m/s
        return Math.ceil(distance / walkingSpeed);
    }

    private calculateDistance(a: GeoPoint, b: GeoPoint): number {
        const R = 6371000; // Earth radius in meters
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;

        const x =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

        return R * c;
    }

    private getHazardIcon(type: string): string {
        const icons: Record<string, string> = {
            fire: '🔥',
            flood: '🌊',
            collapse: '🏚️',
            chemical: '☣️',
            radiation: '☢️',
            default: '⚠️',
        };
        return icons[type] || icons.default;
    }

    private getHazardColor(severity: string): string {
        const colors: Record<string, string> = {
            low: '#FFC107',
            medium: '#FF9800',
            high: '#F44336',
            critical: '#9C27B0',
        };
        return colors[severity] || colors.medium;
    }
}

// Type definitions
interface ArSession {
    id: string;
    deviceId: string;
    userId: string;
    mode: 'navigation' | 'survey' | 'marking';
    status: 'initializing' | 'tracking' | 'lost' | 'ended';
    createdAt: Date;
    lastUpdate: Date;
    devicePose: DevicePose | null;
    anchors: ArAnchor[];
    settings: ArSessionSettings;
}

interface ArSessionConfig {
    userId: string;
    mode?: 'navigation' | 'survey' | 'marking';
    showHazards?: boolean;
    showWaypoints?: boolean;
    showTeamMembers?: boolean;
    renderQuality?: 'low' | 'medium' | 'high';
}

interface DevicePose {
    position: GeoPoint;
    orientation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    heading: number;
    accuracy: number;
}

interface GeoPoint {
    lat: number;
    lng: number;
    alt?: number;
}

interface ArAnchor {
    id: string;
    position: GeoPoint;
    createdAt: Date;
}

interface ArSessionSettings {
    showHazards: boolean;
    showWaypoints: boolean;
    showTeamMembers: boolean;
    renderQuality: 'low' | 'medium' | 'high';
}

interface HazardZone {
    id: string;
    name: string;
    type: string;
    severity: string;
    center: GeoPoint;
    radius: number;
}

interface NavigationWaypoint {
    position: GeoPoint;
    instruction?: string;
    distance: number;
}

interface NavigationPath {
    id: string;
    sessionId: string;
    destination: GeoPoint;
    waypoints: NavigationWaypoint[];
    totalDistance: number;
    estimatedTime: number;
    createdAt: Date;
    status: 'active' | 'completed' | 'cancelled';
}

interface NavigationOptions {
    avoidHazards?: boolean;
    preferIndoor?: boolean;
    accessibility?: boolean;
}

interface ArMarker {
    id: string;
    type: 'hazard' | 'waypoint' | 'team' | 'resource' | 'victim';
    position: GeoPoint;
    label: string;
    icon: string;
    color: string;
    distance?: number;
    metadata?: Record<string, any>;
}
