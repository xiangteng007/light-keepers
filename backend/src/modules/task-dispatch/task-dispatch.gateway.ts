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
import { DispatchTask } from './entities/dispatch-task.entity';
import { TaskAssignment } from './entities/task-assignment.entity';

/**
 * Task Dispatch WebSocket Gateway
 * Real-time notifications for task assignments and updates
 */
@WebSocketGateway({
    namespace: '/task-dispatch',
    cors: { origin: '*' },
})
export class TaskDispatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(TaskDispatchGateway.name);
    private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Remove from user mapping
        for (const [userId, sockets] of this.userSockets) {
            sockets.delete(client.id);
            if (sockets.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    /**
     * Register user for receiving task notifications
     */
    @SubscribeMessage('task:register')
    handleRegister(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string; missionSessionId: string },
    ) {
        // Map user to socket
        if (!this.userSockets.has(data.userId)) {
            this.userSockets.set(data.userId, new Set());
        }
        this.userSockets.get(data.userId)!.add(client.id);

        // Join mission room
        client.join(`mission:${data.missionSessionId}`);

        this.logger.log(`User ${data.userId} registered for mission ${data.missionSessionId}`);
        return { success: true };
    }

    /**
     * Emit task created event to mission room
     */
    emitTaskCreated(missionSessionId: string, task: DispatchTask) {
        this.server.to(`mission:${missionSessionId}`).emit('task:created', { task });
    }

    /**
     * Emit task updated event to mission room
     */
    emitTaskUpdated(missionSessionId: string, task: DispatchTask) {
        this.server.to(`mission:${missionSessionId}`).emit('task:updated', { task });
    }

    /**
     * Emit task assigned event to specific volunteer
     */
    emitTaskAssigned(volunteerId: string, assignment: TaskAssignment, task: DispatchTask) {
        const sockets = this.userSockets.get(volunteerId);
        if (sockets) {
            for (const socketId of sockets) {
                this.server.to(socketId).emit('task:assigned', { assignment, task });
            }
        }
    }

    /**
     * Emit assignment response to mission room
     */
    emitAssignmentResponse(
        missionSessionId: string,
        assignment: TaskAssignment,
        action: 'accepted' | 'declined',
    ) {
        this.server.to(`mission:${missionSessionId}`).emit('task:assignment-response', {
            assignment,
            action,
        });
    }

    /**
     * Emit task completed event
     */
    emitTaskCompleted(missionSessionId: string, task: DispatchTask) {
        this.server.to(`mission:${missionSessionId}`).emit('task:completed', { task });
    }

    /**
     * Emit task cancelled event
     */
    emitTaskCancelled(missionSessionId: string, taskId: string) {
        this.server.to(`mission:${missionSessionId}`).emit('task:cancelled', { taskId });
    }
}
