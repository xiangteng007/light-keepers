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
import { Logger } from '@nestjs/common';
import { OverlayDto } from './dto';

interface PresenceInfo {
    socketId: string;
    userId: string;
    displayName: string;
    joinedAt: Date;
    cursor?: { lng: number; lat: number };
}

interface JoinSessionPayload {
    sessionId: string;
    userId: string;
    displayName: string;
}

interface CursorUpdatePayload {
    sessionId: string;
    cursor: { lng: number; lat: number };
}

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/emergency-response',
})
export class OverlayGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(OverlayGateway.name);

    // sessionId -> Map<socketId, PresenceInfo>
    private presence: Map<string, Map<string, PresenceInfo>> = new Map();

    // socketId -> sessionId (for cleanup on disconnect)
    private socketToSession: Map<string, string> = new Map();

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        const sessionId = this.socketToSession.get(client.id);
        if (sessionId) {
            this.removePresence(sessionId, client.id);
            this.socketToSession.delete(client.id);
        }
    }

    @SubscribeMessage('joinSession')
    handleJoinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: JoinSessionPayload,
    ) {
        const room = `session:${data.sessionId}`;
        client.join(room);

        // Track presence
        if (!this.presence.has(data.sessionId)) {
            this.presence.set(data.sessionId, new Map());
        }

        const sessionPresence = this.presence.get(data.sessionId)!;
        sessionPresence.set(client.id, {
            socketId: client.id,
            userId: data.userId,
            displayName: data.displayName,
            joinedAt: new Date(),
        });

        this.socketToSession.set(client.id, data.sessionId);

        // Broadcast presence update
        this.server.to(room).emit('presence:joined', {
            userId: data.userId,
            displayName: data.displayName,
        });

        // Send current presence list to the new client
        const presenceList = Array.from(sessionPresence.values()).map(p => ({
            userId: p.userId,
            displayName: p.displayName,
            cursor: p.cursor,
        }));
        client.emit('presence:list', presenceList);

        this.logger.log(`User ${data.displayName} joined session ${data.sessionId}`);
        return { success: true };
    }

    @SubscribeMessage('leaveSession')
    handleLeaveSession(@ConnectedSocket() client: Socket) {
        const sessionId = this.socketToSession.get(client.id);
        if (sessionId) {
            const room = `session:${sessionId}`;
            client.leave(room);
            this.removePresence(sessionId, client.id);
            this.socketToSession.delete(client.id);
        }
        return { success: true };
    }

    @SubscribeMessage('cursor:update')
    handleCursorUpdate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: CursorUpdatePayload,
    ) {
        const sessionPresence = this.presence.get(data.sessionId);
        if (sessionPresence) {
            const info = sessionPresence.get(client.id);
            if (info) {
                info.cursor = data.cursor;

                // Broadcast cursor update to others in session
                client.to(`session:${data.sessionId}`).emit('cursor:moved', {
                    userId: info.userId,
                    cursor: data.cursor,
                });
            }
        }
    }

    // Methods called by OverlaysService to broadcast events

    emitOverlayCreated(sessionId: string, overlay: OverlayDto) {
        this.server.to(`session:${sessionId}`).emit('overlay:created', overlay);
        this.logger.debug(`Emitted overlay:created for ${overlay.id} in session ${sessionId}`);
    }

    emitOverlayUpdated(sessionId: string, overlay: OverlayDto) {
        this.server.to(`session:${sessionId}`).emit('overlay:updated', overlay);
        this.logger.debug(`Emitted overlay:updated for ${overlay.id} in session ${sessionId}`);
    }

    emitOverlayRemoved(sessionId: string, overlayId: string) {
        this.server.to(`session:${sessionId}`).emit('overlay:removed', { id: overlayId });
        this.logger.debug(`Emitted overlay:removed for ${overlayId} in session ${sessionId}`);
    }

    emitLockAcquired(sessionId: string, overlayId: string, userId: string, displayName: string) {
        this.server.to(`session:${sessionId}`).emit('lock:acquired', {
            overlayId,
            userId,
            displayName,
        });
    }

    emitLockReleased(sessionId: string, overlayId: string) {
        this.server.to(`session:${sessionId}`).emit('lock:released', { overlayId });
    }

    // Helper methods

    private removePresence(sessionId: string, socketId: string) {
        const sessionPresence = this.presence.get(sessionId);
        if (sessionPresence) {
            const info = sessionPresence.get(socketId);
            if (info) {
                sessionPresence.delete(socketId);

                // Broadcast presence update
                this.server.to(`session:${sessionId}`).emit('presence:left', {
                    userId: info.userId,
                });

                // Clean up empty session
                if (sessionPresence.size === 0) {
                    this.presence.delete(sessionId);
                }
            }
        }
    }

    getSessionPresence(sessionId: string): PresenceInfo[] {
        const sessionPresence = this.presence.get(sessionId);
        return sessionPresence ? Array.from(sessionPresence.values()) : [];
    }
}
