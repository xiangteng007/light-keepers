/**
 * socket.gateway.ts
 * 
 * v4.0: Socket.IO Gateway
 * 處理前端 WebSocket 連線與事件廣播
 */
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TYPES } from '../../common/events/event-types';
import { WsJwtGuard } from '../../modules/auth/guards/ws-jwt.guard';

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    namespace: '/api/v1',
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(SocketGateway.name);

    // 追蹤線上使用者: userId -> Set<socketId>
    private activeUsers = new Map<string, Set<string>>();

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway Initialized');
    }

    async handleConnection(client: Socket) {
        // Guard 會處理驗證，這裡記錄連線
        const userId = client.handshake.query.userId as string;
        if (userId) {
            if (!this.activeUsers.has(userId)) {
                this.activeUsers.set(userId, new Set());
            }
            this.activeUsers.get(userId).add(client.id);
            client.join(`user:${userId}`);
            this.logger.debug(`Client connected: ${client.id} (User: ${userId})`);

            // 廣播上線事件
            this.server.emit('users:online', { userId, status: 'online' });
        } else {
            this.logger.debug(`Client connected (Anonymous): ${client.id}`);
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId && this.activeUsers.has(userId)) {
            const userSockets = this.activeUsers.get(userId);
            userSockets.delete(client.id);
            if (userSockets.size === 0) {
                this.activeUsers.delete(userId);
                this.server.emit('users:online', { userId, status: 'offline' });
            }
        }
        this.logger.debug(`Client disconnected: ${client.id}`);
    }

    // ===== 事件訂閱 =====

    @SubscribeMessage('subscribe:topic')
    handleSubscribe(client: Socket, topic: string) {
        client.join(topic);
        return { event: 'subscribed', data: topic };
    }

    @SubscribeMessage('unsubscribe:topic')
    handleUnsubscribe(client: Socket, topic: string) {
        client.leave(topic);
        return { event: 'unsubscribed', data: topic };
    }

    // ===== 系統事件廣播 =====

    /**
     * GeoIntel 警報更新
     */
    @OnEvent(EVENT_TYPES.GEO_INTEL_UPDATED)
    handleGeoIntelUpdate(payload: any) {
        this.server.emit('geo:update', payload);

        // 如果是高緊急度，額外發送 alert 事件
        if (payload.alert?.urgency >= 7 || payload.alert?.severity === 'critical' || payload.alert?.severity === 'warning') {
            this.server.emit('geo:alert', payload.alert);
        }
    }

    /**
     * AI 任務完成
     */
    @OnEvent(EVENT_TYPES.AI_TASK_COMPLETED)
    handleAiTaskCompleted(payload: any) {
        this.server.emit(`ai:task:${payload.taskId}`, payload);
        this.server.emit('ai:update', payload);
    }

    /**
     * 離線同步狀態
     */
    @OnEvent(EVENT_TYPES.OFFLINE_SYNC_COMPLETED)
    handleSyncCompleted(payload: any) {
        // 廣播給特定用戶 (如果 payload 有 userId)
        if (payload.userId) {
            this.server.to(`user:${payload.userId}`).emit('sync:completed', payload);
        }
    }

    /**
     * 離線同步衝突
     */
    @OnEvent(EVENT_TYPES.OFFLINE_SYNC_CONFLICT)
    handleSyncConflict(payload: any) {
        if (payload.userId) {
            this.server.to(`user:${payload.userId}`).emit('sync:conflict', payload);
        }
    }

    /**
     * 廣播通知
     */
    @OnEvent(EVENT_TYPES.NOTIFICATIONS_BATCH_COMPLETED)
    handleNotificationBroadcast(payload: any) {
        // 只發送摘要，避免洗版
        this.server.emit('notification:broadcast', {
            total: payload.total,
            success: payload.successful,
            timestamp: new Date(),
        });
    }

    /**
     * 任務更新
     */
    @OnEvent(EVENT_TYPES.UPDATED)
    handleTaskUpdate(payload: any) {
        if (payload.assigneeId) {
            this.server.to(`user:${payload.assigneeId}`).emit('task:update', payload);
        }
    }

    /**
     * 事件(Incident)更新
     */
    @OnEvent(EVENT_TYPES.INCIDENT_EVENTS.UPDATED)
    handleIncidentUpdate(payload: any) {
        this.server.emit('incident:update', payload);
    }
}
