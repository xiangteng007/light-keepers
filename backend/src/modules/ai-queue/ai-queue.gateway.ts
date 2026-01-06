import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable as InjectableDecorator } from '@nestjs/common';

interface JobQueuedPayload {
    jobId: string;
    useCaseId: string;
    entityType: string;
    entityId: string;
    priority: number;
}

interface JobUpdatedPayload {
    jobId: string;
    status: string;
    attempt?: number;
    estimatedCompleteAt?: string;
}

interface ResultReadyPayload {
    jobId: string;
    useCaseId: string;
    entityId: string;
    outputJson: object;
    canAccept: boolean;
    isFallback: boolean;
}

interface JobFailedPayload {
    jobId: string;
    errorCode: string;
    errorMessage: string;
    willRetry: boolean;
    nextAttemptAt?: string;
}

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/ai-queue',
})
@InjectableDecorator()
export class AiQueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedClients = new Map<string, Set<string>>(); // missionId -> socketIds

    handleConnection(client: Socket) {
        const missionId = client.handshake.query.missionSessionId as string;
        if (missionId) {
            client.join(`mission:${missionId}`);

            if (!this.connectedClients.has(missionId)) {
                this.connectedClients.set(missionId, new Set());
            }
            this.connectedClients.get(missionId)!.add(client.id);
        }
    }

    handleDisconnect(client: Socket) {
        const missionId = client.handshake.query.missionSessionId as string;
        if (missionId) {
            this.connectedClients.get(missionId)?.delete(client.id);
        }
    }

    /**
     * Emit when a new job is queued
     */
    emitJobQueued(missionSessionId: string, payload: JobQueuedPayload): void {
        this.server.to(`mission:${missionSessionId}`).emit('ai:jobQueued', payload);
    }

    /**
     * Emit when job status changes
     */
    emitJobUpdated(missionSessionId: string, payload: JobUpdatedPayload): void {
        this.server.to(`mission:${missionSessionId}`).emit('ai:jobUpdated', payload);
    }

    /**
     * Emit when AI result is ready for review
     */
    emitResultReady(missionSessionId: string, payload: ResultReadyPayload): void {
        this.server.to(`mission:${missionSessionId}`).emit('ai:resultReady', payload);
    }

    /**
     * Emit when job fails
     */
    emitJobFailed(missionSessionId: string, payload: JobFailedPayload): void {
        this.server.to(`mission:${missionSessionId}`).emit('ai:jobFailed', payload);
    }

    /**
     * Get connected client count for a mission
     */
    getConnectedCount(missionSessionId: string): number {
        return this.connectedClients.get(missionSessionId)?.size ?? 0;
    }
}
