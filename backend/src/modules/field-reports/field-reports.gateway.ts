import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';

/**
 * Presence info for a connected user in a mission session
 */
interface MissionPresence {
    socketId: string;
    userId: string;
    displayName: string;
    callsign?: string;
    role: string;
    joinedAt: Date;
}

/**
 * Location update throttling info
 */
interface LocationThrottle {
    lastBroadcast: number;
    lastLat: number;
    lastLng: number;
}

/**
 * Field Reports Gateway
 * Handles real-time events for mission sessions including:
 * - Reports (created, updated, attachmentAdded)
 * - SOS signals (triggered, acked, resolved)
 * - Tasks (claimed, progress, updated)
 * - Live locations (broadcast, shareStarted, shareStopped)
 * - Presence (join, leave, list)
 */
@Injectable()
@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/field-reports',
})
export class FieldReportsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(FieldReportsGateway.name);

    // Map: missionSessionId -> Map<socketId, MissionPresence>
    private missionPresence = new Map<string, Map<string, MissionPresence>>();

    // Map: `${userId}:${missionSessionId}` -> LocationThrottle
    private locationThrottle = new Map<string, LocationThrottle>();

    private readonly BROADCAST_INTERVAL_MS = 2000;
    private readonly MIN_DISTANCE_M = 3;

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Remove from all mission rooms
        this.missionPresence.forEach((presenceMap, missionSessionId) => {
            if (presenceMap.has(client.id)) {
                const user = presenceMap.get(client.id)!;
                presenceMap.delete(client.id);
                // Broadcast leave event
                this.server.to(`mission:${missionSessionId}`).emit('presence:leave', {
                    userId: user.userId,
                    serverTs: new Date().toISOString(),
                });
            }
        });
    }

    /**
     * Join a mission session room
     */
    @SubscribeMessage('mission:join')
    handleMissionJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            missionSessionId: string;
            userId: string;
            displayName: string;
            callsign?: string;
            role: string;
        },
    ) {
        const room = `mission:${data.missionSessionId}`;
        client.join(room);

        // Track presence
        if (!this.missionPresence.has(data.missionSessionId)) {
            this.missionPresence.set(data.missionSessionId, new Map());
        }
        const presenceMap = this.missionPresence.get(data.missionSessionId)!;

        const presence: MissionPresence = {
            socketId: client.id,
            userId: data.userId,
            displayName: data.displayName,
            callsign: data.callsign,
            role: data.role,
            joinedAt: new Date(),
        };
        presenceMap.set(client.id, presence);

        // Broadcast join
        this.server.to(room).emit('presence:join', {
            userId: data.userId,
            displayName: data.displayName,
            callsign: data.callsign,
            role: data.role,
            serverTs: new Date().toISOString(),
        });

        // Send current presence list to joining client
        const users = Array.from(presenceMap.values()).map(p => ({
            userId: p.userId,
            displayName: p.displayName,
            callsign: p.callsign,
            role: p.role,
        }));
        client.emit('presence:list', { users });

        this.logger.log(`User ${data.userId} joined mission ${data.missionSessionId}`);
        return { success: true, room };
    }

    /**
     * Leave a mission session room
     */
    @SubscribeMessage('mission:leave')
    handleMissionLeave(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { missionSessionId: string },
    ) {
        const room = `mission:${data.missionSessionId}`;
        client.leave(room);

        const presenceMap = this.missionPresence.get(data.missionSessionId);
        if (presenceMap?.has(client.id)) {
            const user = presenceMap.get(client.id)!;
            presenceMap.delete(client.id);
            this.server.to(room).emit('presence:leave', {
                userId: user.userId,
                serverTs: new Date().toISOString(),
            });
        }

        return { success: true };
    }

    /**
     * Handle location update from field workers
     */
    @SubscribeMessage('location:update')
    handleLocationUpdate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            missionSessionId: string;
            userId: string;
            displayName: string;
            lat: number;
            lng: number;
            accuracyM?: number;
            heading?: number;
            speed?: number;
            mode: 'mission' | 'sos';
            tsClient?: string;
        },
    ) {
        const room = `mission:${data.missionSessionId}`;
        const key = `${data.userId}:${data.missionSessionId}`;
        const now = Date.now();

        // Check throttle
        const throttle = this.locationThrottle.get(key);
        if (throttle) {
            const timeDiff = now - throttle.lastBroadcast;
            if (timeDiff < this.BROADCAST_INTERVAL_MS) {
                // Skip broadcast if too soon
                return { throttled: true };
            }

            // Check distance
            const distance = this.haversineDistance(
                throttle.lastLat, throttle.lastLng,
                data.lat, data.lng,
            );
            if (distance < this.MIN_DISTANCE_M && timeDiff < 10000) {
                return { throttled: true, distance };
            }
        }

        // Update throttle
        this.locationThrottle.set(key, {
            lastBroadcast: now,
            lastLat: data.lat,
            lastLng: data.lng,
        });

        // Broadcast to room
        this.server.to(room).emit('location:broadcast', {
            missionSessionId: data.missionSessionId,
            userId: data.userId,
            displayName: data.displayName,
            lat: data.lat,
            lng: data.lng,
            accuracyM: data.accuracyM,
            heading: data.heading,
            speed: data.speed,
            mode: data.mode,
            lastAt: new Date().toISOString(),
        });

        return { success: true };
    }

    // ========== Broadcast methods called from services ==========

    /**
     * Broadcast to a mission session room
     */
    broadcastToSession(missionSessionId: string, event: string, payload: any) {
        const room = `mission:${missionSessionId}`;
        this.server.to(room).emit(event, {
            ...payload,
            serverTs: new Date().toISOString(),
        });
    }

    /**
     * Broadcast field report created
     */
    emitReportCreated(missionSessionId: string, report: any) {
        this.broadcastToSession(missionSessionId, 'report:created', {
            missionSessionId,
            report,
        });
    }

    /**
     * Broadcast field report updated
     */
    emitReportUpdated(missionSessionId: string, reportId: string, changes: any, version: number) {
        this.broadcastToSession(missionSessionId, 'report:updated', {
            missionSessionId,
            reportId,
            changes,
            version,
        });
    }

    /**
     * Broadcast attachment added to report
     */
    emitAttachmentAdded(missionSessionId: string, reportId: string, attachment: {
        id: string;
        showOnMap: boolean;
        photoLatLng?: { lat: number; lng: number };
        capturedAt?: string;
        locationSource?: string;
        thumbnailUrl?: string;
    }) {
        this.broadcastToSession(missionSessionId, 'report:attachmentAdded', {
            reportId,
            attachment,
        });
    }

    /**
     * Broadcast SOS triggered (HIGH PRIORITY)
     */
    emitSosTriggered(missionSessionId: string, sos: any) {
        this.broadcastToSession(missionSessionId, 'sos:triggered', {
            missionSessionId,
            sos,
            priority: 'critical',
        });
    }

    /**
     * Broadcast SOS acknowledged
     */
    emitSosAcked(missionSessionId: string, sosId: string, ackedBy: string, ackedAt: string) {
        this.broadcastToSession(missionSessionId, 'sos:acked', {
            sosId,
            ackedBy,
            ackedAt,
        });
    }

    /**
     * Broadcast SOS resolved
     */
    emitSosResolved(missionSessionId: string, sosId: string, resolvedBy: string, resolvedAt: string) {
        this.broadcastToSession(missionSessionId, 'sos:resolved', {
            sosId,
            resolvedBy,
            resolvedAt,
        });
    }

    /**
     * Broadcast task claimed
     */
    emitTaskClaimed(missionSessionId: string, taskId: string, claimedBy: string, claimedByName: string) {
        this.broadcastToSession(missionSessionId, 'task:claimed', {
            taskId,
            claimedBy,
            claimedByName,
        });
    }

    /**
     * Broadcast task progress update
     */
    emitTaskProgress(missionSessionId: string, taskId: string, progressUpdate: any) {
        this.broadcastToSession(missionSessionId, 'task:progress', {
            taskId,
            progressUpdate,
        });
    }

    /**
     * Broadcast location share started
     */
    emitLocationShareStarted(missionSessionId: string, userId: string, displayName: string, mode: string) {
        this.broadcastToSession(missionSessionId, 'location:shareStarted', {
            userId,
            displayName,
            mode,
        });
    }

    /**
     * Broadcast location share stopped
     */
    emitLocationShareStopped(missionSessionId: string, userId: string) {
        this.broadcastToSession(missionSessionId, 'location:shareStopped', {
            userId,
        });
    }

    /**
     * Get online users for a mission session
     */
    getOnlineUsers(missionSessionId: string): MissionPresence[] {
        const presenceMap = this.missionPresence.get(missionSessionId);
        return presenceMap ? Array.from(presenceMap.values()) : [];
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     */
    private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
