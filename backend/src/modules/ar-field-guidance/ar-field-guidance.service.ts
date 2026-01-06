import { Injectable, Logger } from '@nestjs/common';

export interface ArMarker {
    id: string;
    type: 'victim' | 'hazard' | 'exit' | 'equipment' | 'team_member' | 'checkpoint';
    position: { x: number; y: number; z: number };
    floorId: string;
    buildingId: string;
    label: string;
    icon: string;
    color: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
    createdAt: Date;
    expiresAt?: Date;
}

export interface ArRoute {
    id: string;
    name: string;
    waypoints: { x: number; y: number; z: number; floorId: string }[];
    distance: number;
    estimatedTime: number;
    hazards: string[];
    createdAt: Date;
}

export interface FloorPlan {
    id: string;
    buildingId: string;
    floor: number;
    name: string;
    imageUrl: string;
    scale: number;
    origin: { x: number; y: number };
    bounds: { width: number; height: number };
}

export interface ArSession {
    id: string;
    userId: string;
    deviceId: string;
    buildingId: string;
    currentFloor: string;
    position: { x: number; y: number; z: number };
    heading: number;
    activeRoute?: string;
    startedAt: Date;
    lastUpdated: Date;
}

@Injectable()
export class ArFieldGuidanceService {
    private readonly logger = new Logger(ArFieldGuidanceService.name);
    private markers: Map<string, ArMarker> = new Map();
    private routes: Map<string, ArRoute> = new Map();
    private floorPlans: Map<string, FloorPlan> = new Map();
    private sessions: Map<string, ArSession> = new Map();

    // ===== AR 標記管理 =====

    createMarker(data: Omit<ArMarker, 'id' | 'createdAt'>): ArMarker {
        const marker: ArMarker = {
            ...data,
            id: `arm-${Date.now()}`,
            createdAt: new Date(),
        };
        this.markers.set(marker.id, marker);
        this.logger.log(`AR marker created: ${marker.type} at ${marker.buildingId}/${marker.floorId}`);
        return marker;
    }

    getMarker(id: string): ArMarker | undefined {
        return this.markers.get(id);
    }

    getMarkersByFloor(buildingId: string, floorId: string): ArMarker[] {
        return Array.from(this.markers.values())
            .filter(m => m.buildingId === buildingId && m.floorId === floorId)
            .filter(m => !m.expiresAt || m.expiresAt > new Date());
    }

    getMarkersByType(type: ArMarker['type']): ArMarker[] {
        return Array.from(this.markers.values())
            .filter(m => m.type === type);
    }

    updateMarker(id: string, updates: Partial<ArMarker>): ArMarker | null {
        const marker = this.markers.get(id);
        if (!marker) return null;
        Object.assign(marker, updates);
        return marker;
    }

    deleteMarker(id: string): boolean {
        return this.markers.delete(id);
    }

    // ===== 路線規劃 =====

    createRoute(data: Omit<ArRoute, 'id' | 'createdAt' | 'distance' | 'estimatedTime'>): ArRoute {
        const distance = this.calculateRouteDistance(data.waypoints);
        const route: ArRoute = {
            ...data,
            id: `arr-${Date.now()}`,
            distance,
            estimatedTime: Math.ceil(distance / 1.2), // 假設步行速度 1.2 m/s
            createdAt: new Date(),
        };
        this.routes.set(route.id, route);
        return route;
    }

    private calculateRouteDistance(waypoints: { x: number; y: number; z: number }[]): number {
        let distance = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            const dz = waypoints[i].z - waypoints[i - 1].z;
            distance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return distance;
    }

    getRoute(id: string): ArRoute | undefined {
        return this.routes.get(id);
    }

    findShortestPath(
        buildingId: string,
        from: { x: number; y: number; z: number; floorId: string },
        to: { x: number; y: number; z: number; floorId: string }
    ): ArRoute {
        // 簡化的路徑規劃 (實際應使用 A* 或類似演算法)
        const route: ArRoute = {
            id: `arr-${Date.now()}`,
            name: 'Shortest Path',
            waypoints: [from, to],
            distance: this.calculateRouteDistance([from, to]),
            estimatedTime: 0,
            hazards: [],
            createdAt: new Date(),
        };
        route.estimatedTime = Math.ceil(route.distance / 1.2);
        return route;
    }

    findEvacuationRoute(buildingId: string, floorId: string, position: { x: number; y: number; z: number }): ArRoute {
        // 找最近的出口
        const exits = this.getMarkersByType('exit')
            .filter(m => m.buildingId === buildingId);

        if (exits.length === 0) {
            throw new Error('No exits found');
        }

        const nearestExit = exits.reduce((nearest, exit) => {
            const dist = Math.sqrt(
                Math.pow(exit.position.x - position.x, 2) +
                Math.pow(exit.position.y - position.y, 2)
            );
            const nearestDist = Math.sqrt(
                Math.pow(nearest.position.x - position.x, 2) +
                Math.pow(nearest.position.y - position.y, 2)
            );
            return dist < nearestDist ? exit : nearest;
        });

        return this.findShortestPath(
            buildingId,
            { ...position, floorId },
            { ...nearestExit.position, floorId: nearestExit.floorId }
        );
    }

    // ===== 樓層平面圖 =====

    addFloorPlan(data: FloorPlan): FloorPlan {
        this.floorPlans.set(data.id, data);
        return data;
    }

    getFloorPlan(id: string): FloorPlan | undefined {
        return this.floorPlans.get(id);
    }

    getFloorPlansByBuilding(buildingId: string): FloorPlan[] {
        return Array.from(this.floorPlans.values())
            .filter(fp => fp.buildingId === buildingId)
            .sort((a, b) => a.floor - b.floor);
    }

    // ===== AR Session 管理 =====

    startSession(data: Omit<ArSession, 'id' | 'startedAt' | 'lastUpdated'>): ArSession {
        const session: ArSession = {
            ...data,
            id: `ars-${Date.now()}`,
            startedAt: new Date(),
            lastUpdated: new Date(),
        };
        this.sessions.set(session.id, session);
        return session;
    }

    updateSessionPosition(
        sessionId: string,
        position: { x: number; y: number; z: number },
        heading: number,
        floorId?: string
    ): ArSession | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        session.position = position;
        session.heading = heading;
        if (floorId) session.currentFloor = floorId;
        session.lastUpdated = new Date();

        return session;
    }

    getSession(id: string): ArSession | undefined {
        return this.sessions.get(id);
    }

    getActiveSessions(buildingId?: string): ArSession[] {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5分鐘內
        return Array.from(this.sessions.values())
            .filter(s => s.lastUpdated > cutoff)
            .filter(s => !buildingId || s.buildingId === buildingId);
    }

    endSession(id: string): boolean {
        return this.sessions.delete(id);
    }

    // ===== 視覺化資料 =====

    getArView(
        buildingId: string,
        floorId: string,
        position: { x: number; y: number; z: number },
        heading: number,
        viewRadius: number = 50
    ): { markers: ArMarker[]; teamMembers: ArSession[]; activeRoute?: ArRoute } {
        const markers = this.getMarkersByFloor(buildingId, floorId)
            .filter(m => {
                const dist = Math.sqrt(
                    Math.pow(m.position.x - position.x, 2) +
                    Math.pow(m.position.y - position.y, 2)
                );
                return dist <= viewRadius;
            });

        const teamMembers = this.getActiveSessions(buildingId)
            .filter(s => s.currentFloor === floorId);

        return { markers, teamMembers };
    }
}
