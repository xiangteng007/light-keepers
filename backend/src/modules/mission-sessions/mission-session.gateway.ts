/**
 * Mission Session Gateway
 * Phase 5: WebSocket 即時同步
 * 
 * 功能：
 * - 任務會議室 (session room) 即時同步
 * - 事件/任務狀態廣播
 * - 在線人員追蹤
 * - SITREP 即時更新
 */

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
import { OnEvent } from '@nestjs/event-emitter';

interface SessionParticipant {
    socketId: string;
    userId: string;
    displayName: string;
    role: string;
    joinedAt: Date;
}

interface SessionRoom {
    sessionId: string;
    participants: Map<string, SessionParticipant>;
    createdAt: Date;
}

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/mission-session',
})
export class MissionSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(MissionSessionGateway.name);
    private sessionRooms: Map<string, SessionRoom> = new Map();
    private socketToSession: Map<string, string> = new Map();

    // ==================== 連線生命週期 ====================

    handleConnection(client: Socket) {
        this.logger.log(`Mission session client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Mission session client disconnected: ${client.id}`);

        // 清理參與者資料
        const sessionId = this.socketToSession.get(client.id);
        if (sessionId) {
            const room = this.sessionRooms.get(sessionId);
            if (room) {
                const participant = room.participants.get(client.id);
                room.participants.delete(client.id);

                // 廣播離開事件
                this.server.to(sessionId).emit('participantLeft', {
                    userId: participant?.userId,
                    displayName: participant?.displayName,
                    participantCount: room.participants.size,
                    timestamp: new Date(),
                });
            }
            this.socketToSession.delete(client.id);
        }
    }

    // ==================== 會議室管理 ====================

    @SubscribeMessage('joinSession')
    handleJoinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; userId: string; displayName: string; role: string },
    ) {
        const { sessionId, userId, displayName, role } = data;

        // 建立或取得會議室
        if (!this.sessionRooms.has(sessionId)) {
            this.sessionRooms.set(sessionId, {
                sessionId,
                participants: new Map(),
                createdAt: new Date(),
            });
        }

        const room = this.sessionRooms.get(sessionId)!;

        // 加入參與者
        const participant: SessionParticipant = {
            socketId: client.id,
            userId,
            displayName,
            role,
            joinedAt: new Date(),
        };
        room.participants.set(client.id, participant);
        this.socketToSession.set(client.id, sessionId);

        // 加入 Socket.IO 房間
        client.join(sessionId);

        this.logger.log(`User ${displayName} joined session ${sessionId}`);

        // 廣播加入事件
        this.server.to(sessionId).emit('participantJoined', {
            userId,
            displayName,
            role,
            participantCount: room.participants.size,
            timestamp: new Date(),
        });

        // 回傳參與者列表
        return {
            success: true,
            sessionId,
            participants: this.getParticipantList(sessionId),
        };
    }

    @SubscribeMessage('leaveSession')
    handleLeaveSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        client.leave(data.sessionId);

        const room = this.sessionRooms.get(data.sessionId);
        if (room) {
            const participant = room.participants.get(client.id);
            room.participants.delete(client.id);
            this.socketToSession.delete(client.id);

            this.server.to(data.sessionId).emit('participantLeft', {
                userId: participant?.userId,
                displayName: participant?.displayName,
                participantCount: room.participants.size,
                timestamp: new Date(),
            });
        }

        return { success: true };
    }

    @SubscribeMessage('getParticipants')
    handleGetParticipants(
        @MessageBody() data: { sessionId: string },
    ) {
        return {
            participants: this.getParticipantList(data.sessionId),
        };
    }

    // ==================== 任務同步 ====================

    @SubscribeMessage('taskStatusUpdate')
    handleTaskStatusUpdate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            sessionId: string;
            taskId: string;
            status: string;
            updatedBy: string;
        },
    ) {
        // 廣播給同會議室的所有人
        this.server.to(data.sessionId).emit('taskUpdated', {
            taskId: data.taskId,
            status: data.status,
            updatedBy: data.updatedBy,
            timestamp: new Date(),
        });

        return { success: true };
    }

    @SubscribeMessage('taskAssignment')
    handleTaskAssignment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            sessionId: string;
            taskId: string;
            assignedTeamId: string;
            assignedTeamName: string;
            assignedBy: string;
        },
    ) {
        this.server.to(data.sessionId).emit('taskAssigned', {
            ...data,
            timestamp: new Date(),
        });

        return { success: true };
    }

    // ==================== 事件/報告同步 ====================

    @SubscribeMessage('newFieldReport')
    handleNewFieldReport(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            sessionId: string;
            report: unknown;
            reportedBy: string;
        },
    ) {
        this.server.to(data.sessionId).emit('fieldReportReceived', {
            report: data.report,
            reportedBy: data.reportedBy,
            timestamp: new Date(),
        });

        return { success: true };
    }

    @SubscribeMessage('sitrepUpdate')
    handleSitrepUpdate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            sessionId: string;
            sitrep: unknown;
            updatedBy: string;
        },
    ) {
        this.server.to(data.sessionId).emit('sitrepUpdated', {
            sitrep: data.sitrep,
            updatedBy: data.updatedBy,
            timestamp: new Date(),
        });

        return { success: true };
    }

    // ==================== 指揮決策同步 ====================

    @SubscribeMessage('commandDecision')
    handleCommandDecision(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            sessionId: string;
            decisionType: string;
            description: string;
            decidedBy: string;
        },
    ) {
        this.server.to(data.sessionId).emit('decisionMade', {
            ...data,
            timestamp: new Date(),
        });

        return { success: true };
    }

    // ==================== Event Emitter 整合 ====================

    @OnEvent('mission.task.created')
    handleMissionTaskCreated(payload: { sessionId: string; task: unknown }) {
        this.server.to(payload.sessionId).emit('taskCreated', {
            task: payload.task,
            timestamp: new Date(),
        });
    }

    @OnEvent('mission.task.updated')
    handleMissionTaskUpdated(payload: { sessionId: string; taskId: string; changes: unknown }) {
        this.server.to(payload.sessionId).emit('taskUpdated', {
            taskId: payload.taskId,
            changes: payload.changes,
            timestamp: new Date(),
        });
    }

    @OnEvent('mission.sitrep.published')
    handleSitrepPublished(payload: { sessionId: string; sitrep: unknown }) {
        this.server.to(payload.sessionId).emit('sitrepPublished', {
            sitrep: payload.sitrep,
            timestamp: new Date(),
        });
    }

    @OnEvent('mission.session.ended')
    handleSessionEnded(payload: { sessionId: string; endedBy: string; summary: unknown }) {
        this.server.to(payload.sessionId).emit('sessionEnded', {
            endedBy: payload.endedBy,
            summary: payload.summary,
            timestamp: new Date(),
        });

        // 清理會議室
        this.sessionRooms.delete(payload.sessionId);
    }

    // ==================== 工具方法 ====================

    private getParticipantList(sessionId: string): SessionParticipant[] {
        const room = this.sessionRooms.get(sessionId);
        if (!room) return [];
        return Array.from(room.participants.values());
    }

    // 外部 API: 廣播到特定會議室
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    broadcastToSession(sessionId: string, event: string, data: any) {
        this.server.to(sessionId).emit(event, {
            ...data,
            timestamp: new Date(),
        });
    }

    // 取得會議室統計
    getSessionStats(sessionId: string): { participantCount: number; duration: number } | null {
        const room = this.sessionRooms.get(sessionId);
        if (!room) return null;

        const duration = Math.round((Date.now() - room.createdAt.getTime()) / 1000 / 60);
        return {
            participantCount: room.participants.size,
            duration,
        };
    }
}
