/**
 * Notification WebSocket Gateway
 * Real-time notification delivery via WebSocket
 */

import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { NotificationQueueService, NotificationPriority } from './notification-queue.service';

interface NotificationEvent {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    recipients: string[];
    priority?: NotificationPriority;
    timestamp: string;
}

@WebSocketGateway({
    namespace: '/notifications',
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationGateway.name);
    private readonly userSockets = new Map<string, Set<string>>(); // userId -> socketIds

    constructor(
        @Inject(forwardRef(() => NotificationQueueService))
        private notificationQueue: NotificationQueueService,
    ) { }

    afterInit(): void {
        // Register this gateway as the in-app notification handler
        this.notificationQueue.setInAppHandler((event: NotificationEvent) => {
            this.handleInAppNotification(event);
        });
        this.logger.log('Notification gateway initialized');
    }

    handleConnection(client: Socket): void {
        this.logger.debug(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        this.logger.debug(`Client disconnected: ${client.id}`);

        // Remove from all user mappings
        for (const [userId, sockets] of this.userSockets.entries()) {
            sockets.delete(client.id);
            if (sockets.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    /**
     * Subscribe to notifications for a user
     */
    @SubscribeMessage('subscribe')
    handleSubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string },
    ): void {
        if (!data.userId) return;

        if (!this.userSockets.has(data.userId)) {
            this.userSockets.set(data.userId, new Set());
        }
        this.userSockets.get(data.userId)!.add(client.id);

        // Join user-specific room
        client.join(`user:${data.userId}`);

        this.logger.debug(`User ${data.userId} subscribed with socket ${client.id}`);
        client.emit('subscribed', { userId: data.userId });
    }

    /**
     * Unsubscribe from notifications
     */
    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string },
    ): void {
        if (!data.userId) return;

        const sockets = this.userSockets.get(data.userId);
        if (sockets) {
            sockets.delete(client.id);
            if (sockets.size === 0) {
                this.userSockets.delete(data.userId);
            }
        }

        client.leave(`user:${data.userId}`);
        this.logger.debug(`User ${data.userId} unsubscribed`);
    }

    /**
     * Handle in-app notification events
     */
    private handleInAppNotification(event: NotificationEvent): void {
        this.logger.debug(`Broadcasting notification: ${event.title}`);

        // Send to specific recipients
        for (const userId of event.recipients) {
            this.server.to(`user:${userId}`).emit('notification', {
                type: event.type,
                title: event.title,
                body: event.body,
                data: event.data,
                priority: event.priority,
                timestamp: event.timestamp,
            });
        }
    }

    /**
     * Broadcast to all connected clients
     */
    broadcastAll(event: string, data: unknown): void {
        this.server.emit(event, data);
    }

    /**
     * Send to specific user
     */
    sendToUser(userId: string, event: string, data: unknown): void {
        this.server.to(`user:${userId}`).emit(event, data);
    }

    /**
     * Get online user count
     */
    getOnlineCount(): number {
        return this.userSockets.size;
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
    }
}
