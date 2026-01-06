/**
 * 網狀網路 WebSocket Gateway
 * 模組 B: 即時節點狀態推送
 */

import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MeshSyncService } from './mesh-sync.service';

@Injectable()
@WebSocketGateway({
    namespace: '/mesh',
    cors: { origin: '*' },
})
export class MeshGateway implements OnGatewayConnection {
    private readonly logger = new Logger(MeshGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private meshService: MeshSyncService) { }

    handleConnection(client: Socket): void {
        this.logger.log(`Mesh monitor connected: ${client.id}`);
    }

    @SubscribeMessage('subscribe-nodes')
    async handleSubscribeNodes(client: Socket): Promise<void> {
        const nodes = await this.meshService.getAllNodes();
        client.emit('nodes-update', nodes);
    }

    @SubscribeMessage('subscribe-messages')
    async handleSubscribeMessages(client: Socket, data: { nodeId?: string }): Promise<void> {
        client.join('mesh-messages');

        if (data?.nodeId) {
            const messages = await this.meshService.getNodeMessages(data.nodeId);
            client.emit('messages-history', messages);
        }
    }

    @OnEvent('mesh.message.received')
    handleNewMessage(payload: any): void {
        this.server.to('mesh-messages').emit('new-message', payload.message);
        this.server.emit('node-activity', {
            nodeId: payload.message.nodeId,
            lastSeen: new Date(),
        });
    }

    @OnEvent('mesh.sos.detected')
    handleSOSDetected(payload: any): void {
        this.server.emit('sos-alert', {
            type: 'MESH_SOS',
            nodeId: payload.nodeId,
            content: payload.content,
            location: payload.location,
            timestamp: new Date(),
        });
    }
}
