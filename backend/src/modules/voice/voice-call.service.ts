/**
 * Voice Call Service
 * WebRTC signaling server with LINE integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface CallSession {
    id: string;
    type: 'individual' | 'group' | 'broadcast';
    initiator: string;
    participants: string[];
    status: 'ringing' | 'active' | 'ended';
    missionId?: string;
    startedAt: Date;
    endedAt?: Date;
}

export interface VoiceUser {
    id: string;
    name: string;
    socketId: string;
    status: 'available' | 'busy' | 'offline';
    lineUserId?: string;
}

@Injectable()
@WebSocketGateway({
    namespace: '/voice',
    cors: { origin: '*' }
})
export class VoiceCallService implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(VoiceCallService.name);

    @WebSocketServer()
    server: Server;

    // Active sessions and users
    private activeCalls: Map<string, CallSession> = new Map();
    private onlineUsers: Map<string, VoiceUser> = new Map();
    private socketToUser: Map<string, string> = new Map();

    // ==================== Connection Handling ====================

    handleConnection(client: Socket): void {
        this.logger.log(`Voice client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        const userId = this.socketToUser.get(client.id);
        if (userId) {
            this.setUserOffline(userId);
            this.socketToUser.delete(client.id);
        }
        this.logger.log(`Voice client disconnected: ${client.id}`);
    }

    // ==================== User Registration ====================

    @SubscribeMessage('register')
    handleRegister(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string; name: string; lineUserId?: string }
    ): void {
        const user: VoiceUser = {
            id: data.userId,
            name: data.name,
            socketId: client.id,
            status: 'available',
            lineUserId: data.lineUserId,
        };

        this.onlineUsers.set(data.userId, user);
        this.socketToUser.set(client.id, data.userId);

        // Join personal room
        client.join(`user:${data.userId}`);

        // Broadcast user status
        this.server.emit('user-online', { userId: data.userId, name: data.name });

        this.logger.log(`User registered for voice: ${data.name} (${data.userId})`);
    }

    // ==================== Call Initiation ====================

    @SubscribeMessage('call-initiate')
    async handleCallInitiate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            targetUserId: string;
            type: 'individual' | 'group';
            missionId?: string;
        }
    ): Promise<void> {
        const callerId = this.socketToUser.get(client.id);
        if (!callerId) return;

        const caller = this.onlineUsers.get(callerId);
        const target = this.onlineUsers.get(data.targetUserId);

        if (!target || target.status !== 'available') {
            client.emit('call-failed', {
                reason: target ? 'User busy' : 'User offline',
                targetUserId: data.targetUserId
            });
            return;
        }

        // Create call session
        const session: CallSession = {
            id: `call-${Date.now()}`,
            type: data.type,
            initiator: callerId,
            participants: [callerId, data.targetUserId],
            status: 'ringing',
            missionId: data.missionId,
            startedAt: new Date(),
        };

        this.activeCalls.set(session.id, session);

        // Update user statuses
        if (caller) caller.status = 'busy';
        target.status = 'busy';

        // Notify target user
        this.server.to(`user:${data.targetUserId}`).emit('incoming-call', {
            callId: session.id,
            callerId,
            callerName: caller?.name,
            type: data.type,
            missionId: data.missionId,
        });

        // Confirm to caller
        client.emit('call-ringing', { callId: session.id, targetUserId: data.targetUserId });

        this.logger.log(`Call initiated: ${session.id} from ${callerId} to ${data.targetUserId}`);
    }

    @SubscribeMessage('call-accept')
    handleCallAccept(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { callId: string }
    ): void {
        const session = this.activeCalls.get(data.callId);
        if (!session) return;

        session.status = 'active';

        // Notify all participants
        for (const participantId of session.participants) {
            this.server.to(`user:${participantId}`).emit('call-connected', {
                callId: data.callId,
                participants: session.participants,
            });
        }

        this.logger.log(`Call accepted: ${data.callId}`);
    }

    @SubscribeMessage('call-reject')
    handleCallReject(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { callId: string; reason?: string }
    ): void {
        const session = this.activeCalls.get(data.callId);
        if (!session) return;

        this.endCall(data.callId, 'rejected');
    }

    @SubscribeMessage('call-end')
    handleCallEnd(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { callId: string }
    ): void {
        this.endCall(data.callId, 'ended');
    }

    // ==================== WebRTC Signaling ====================

    @SubscribeMessage('offer')
    handleOffer(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { callId: string; targetUserId: string; offer: any }
    ): void {
        this.server.to(`user:${data.targetUserId}`).emit('offer', {
            callId: data.callId,
            offer: data.offer,
            fromUserId: this.socketToUser.get(client.id),
        });
    }

    @SubscribeMessage('answer')
    handleAnswer(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { callId: string; targetUserId: string; answer: any }
    ): void {
        this.server.to(`user:${data.targetUserId}`).emit('answer', {
            callId: data.callId,
            answer: data.answer,
            fromUserId: this.socketToUser.get(client.id),
        });
    }

    @SubscribeMessage('ice-candidate')
    handleIceCandidate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { callId: string; targetUserId: string; candidate: any }
    ): void {
        this.server.to(`user:${data.targetUserId}`).emit('ice-candidate', {
            callId: data.callId,
            candidate: data.candidate,
            fromUserId: this.socketToUser.get(client.id),
        });
    }

    // ==================== Group Calls ====================

    @SubscribeMessage('group-call-initiate')
    async handleGroupCallInitiate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            participants: string[];
            missionId?: string;
            name?: string;
        }
    ): Promise<void> {
        const callerId = this.socketToUser.get(client.id);
        if (!callerId) return;

        const session: CallSession = {
            id: `group-${Date.now()}`,
            type: 'group',
            initiator: callerId,
            participants: [callerId, ...data.participants],
            status: 'active',
            missionId: data.missionId,
            startedAt: new Date(),
        };

        this.activeCalls.set(session.id, session);

        // Create a room for the group call
        const roomName = `call:${session.id}`;
        client.join(roomName);

        // Notify all participants
        for (const participantId of data.participants) {
            const participant = this.onlineUsers.get(participantId);
            if (participant && participant.status === 'available') {
                this.server.to(`user:${participantId}`).emit('group-call-invite', {
                    callId: session.id,
                    initiatorId: callerId,
                    initiatorName: this.onlineUsers.get(callerId)?.name,
                    participants: session.participants,
                    missionId: data.missionId,
                    name: data.name || '群組通話',
                });
            }
        }

        client.emit('group-call-created', { callId: session.id });
        this.logger.log(`Group call initiated: ${session.id} with ${data.participants.length} participants`);
    }

    @SubscribeMessage('group-call-join')
    handleGroupCallJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { callId: string }
    ): void {
        const session = this.activeCalls.get(data.callId);
        const userId = this.socketToUser.get(client.id);
        if (!session || !userId) return;

        const roomName = `call:${session.id}`;
        client.join(roomName);

        // Notify other participants
        client.to(roomName).emit('participant-joined', {
            callId: data.callId,
            userId,
            userName: this.onlineUsers.get(userId)?.name,
        });

        // Send current participants to new joiner
        client.emit('group-call-state', {
            callId: data.callId,
            participants: session.participants.filter(p =>
                this.onlineUsers.get(p)?.status === 'busy'
            ),
        });

        this.logger.log(`User ${userId} joined group call ${data.callId}`);
    }

    // ==================== LINE Integration ====================

    /**
     * Initiate call to LINE user via LINE Notify or Rich Menu
     */
    async initiateLineCall(
        lineUserId: string,
        callerId: string,
        missionId?: string
    ): Promise<{ success: boolean; callbackUrl?: string }> {
        // Generate a unique call link
        const callToken = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const callbackUrl = `${process.env.FRONTEND_URL}/voice/join?token=${callToken}&mission=${missionId || ''}`;

        // Send LINE message with call link
        try {
            await this.sendLineCallNotification(lineUserId, callerId, callbackUrl);

            return { success: true, callbackUrl };
        } catch (error) {
            this.logger.error('Failed to send LINE call notification', error);
            return { success: false };
        }
    }

    private async sendLineCallNotification(
        lineUserId: string,
        callerId: string,
        callbackUrl: string
    ): Promise<void> {
        const callerName = this.onlineUsers.get(callerId)?.name || '指揮中心';

        // LINE Messaging API push message
        const message = {
            to: lineUserId,
            messages: [
                {
                    type: 'template',
                    altText: `${callerName} 邀請您加入語音通話`,
                    template: {
                        type: 'buttons',
                        title: '📞 語音通話邀請',
                        text: `${callerName} 邀請您加入指揮通話`,
                        actions: [
                            {
                                type: 'uri',
                                label: '加入通話',
                                uri: callbackUrl,
                            },
                            {
                                type: 'message',
                                label: '稍後回電',
                                text: '/callback ' + callerId,
                            },
                        ],
                    },
                },
            ],
        };

        // Send via LINE Messaging API
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            throw new Error(`LINE API error: ${response.status}`);
        }
    }

    // ==================== Broadcast Calls ====================

    /**
     * Broadcast voice call to all online users in a mission
     */
    async broadcastToMission(missionId: string, message: string): Promise<number> {
        const session: CallSession = {
            id: `broadcast-${Date.now()}`,
            type: 'broadcast',
            initiator: 'system',
            participants: [],
            status: 'active',
            missionId,
            startedAt: new Date(),
        };

        // Find all users associated with mission
        const availableUsers = Array.from(this.onlineUsers.values())
            .filter(u => u.status === 'available');

        for (const user of availableUsers) {
            session.participants.push(user.id);
            this.server.to(`user:${user.id}`).emit('broadcast-message', {
                callId: session.id,
                missionId,
                message,
            });
        }

        this.activeCalls.set(session.id, session);
        this.logger.log(`Broadcast sent to ${session.participants.length} users for mission ${missionId}`);

        return session.participants.length;
    }

    // ==================== Utilities ====================

    private endCall(callId: string, reason: string): void {
        const session = this.activeCalls.get(callId);
        if (!session) return;

        session.status = 'ended';
        session.endedAt = new Date();

        // Reset participant statuses
        for (const participantId of session.participants) {
            const user = this.onlineUsers.get(participantId);
            if (user) user.status = 'available';

            this.server.to(`user:${participantId}`).emit('call-ended', {
                callId,
                reason,
                duration: session.endedAt.getTime() - session.startedAt.getTime(),
            });
        }

        this.activeCalls.delete(callId);
        this.logger.log(`Call ended: ${callId} (${reason})`);
    }

    private setUserOffline(userId: string): void {
        const user = this.onlineUsers.get(userId);
        if (user) {
            user.status = 'offline';

            // End any active calls involving this user
            for (const [callId, session] of this.activeCalls) {
                if (session.participants.includes(userId)) {
                    this.endCall(callId, 'user-disconnected');
                }
            }

            this.server.emit('user-offline', { userId });
        }
    }

    getOnlineUsers(): VoiceUser[] {
        return Array.from(this.onlineUsers.values())
            .filter(u => u.status !== 'offline');
    }

    getActiveCallsCount(): number {
        return this.activeCalls.size;
    }
}
