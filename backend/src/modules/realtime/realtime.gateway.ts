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

interface OnlineUser {
    socketId: string;
    oderId?: string;
    joinedAt: Date;
}

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(RealtimeGateway.name);
    private onlineUsers: Map<string, OnlineUser> = new Map();

    // 連線處理
    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
        this.onlineUsers.set(client.id, {
            socketId: client.id,
            joinedAt: new Date(),
        });
        this.broadcastOnlineCount();
    }

    // 斷線處理
    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.onlineUsers.delete(client.id);
        this.broadcastOnlineCount();
    }

    // 廣播線上人數
    private broadcastOnlineCount() {
        this.server.emit('onlineCount', { count: this.onlineUsers.size });
    }

    // 加入房間 (依事件或區域)
    @SubscribeMessage('joinRoom')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { room: string },
    ) {
        client.join(data.room);
        this.logger.log(`Client ${client.id} joined room: ${data.room}`);
        return { success: true, room: data.room };
    }

    // 離開房間
    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { room: string },
    ) {
        client.leave(data.room);
        return { success: true };
    }

    // 發送即時通知 (給特定房間)
    sendNotificationToRoom(room: string, notification: any) {
        this.server.to(room).emit('notification', notification);
    }

    // 發送系統廣播
    broadcastNotification(notification: any) {
        this.server.emit('notification', notification);
    }

    // 發送災害警報
    broadcastAlert(alert: any) {
        this.server.emit('alert', {
            type: 'disaster',
            ...alert,
            timestamp: new Date(),
        });
    }

    // 更新任務狀態
    sendTaskUpdate(taskId: string, update: any) {
        this.server.emit('taskUpdate', { taskId, ...update });
    }

    // 更新志工狀態
    sendVolunteerStatusUpdate(volunteerId: string, status: string) {
        this.server.emit('volunteerStatus', { volunteerId, status });
    }
}
