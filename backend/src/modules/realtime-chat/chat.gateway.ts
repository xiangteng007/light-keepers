import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatGateway.name);

    constructor(private readonly chatService: ChatService) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
        this.chatService.addClient(client.id);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.chatService.removeClient(client.id);
    }

    @SubscribeMessage('join_room')
    async handleJoinRoom(
        @MessageBody() data: { roomId: string; userId: string; userName: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.join(data.roomId);
        this.chatService.joinRoom(client.id, data.roomId, data.userId, data.userName);

        // 通知房間其他人
        client.to(data.roomId).emit('user_joined', {
            userId: data.userId,
            userName: data.userName,
            timestamp: new Date(),
        });

        // 發送房間歷史訊息
        const history = await this.chatService.getRoomHistory(data.roomId);
        client.emit('room_history', history);

        return { success: true, roomId: data.roomId };
    }

    @SubscribeMessage('leave_room')
    handleLeaveRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(data.roomId);
        const user = this.chatService.getClientUser(client.id);

        if (user) {
            client.to(data.roomId).emit('user_left', {
                userId: user.userId,
                userName: user.userName,
                timestamp: new Date(),
            });
        }

        this.chatService.leaveRoom(client.id, data.roomId);
        return { success: true };
    }

    @SubscribeMessage('send_message')
    async handleMessage(
        @MessageBody() data: { roomId: string; content: string; type?: string; attachments?: any[] },
        @ConnectedSocket() client: Socket,
    ) {
        const user = this.chatService.getClientUser(client.id);
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const message = await this.chatService.saveMessage({
            roomId: data.roomId,
            userId: user.userId,
            userName: user.userName,
            content: data.content,
            type: data.type || 'text',
            attachments: data.attachments,
        });

        // 廣播訊息給房間所有人
        this.server.to(data.roomId).emit('new_message', message);

        // 處理 @mention
        const mentions = this.chatService.parseMentions(data.content);
        if (mentions.length > 0) {
            this.chatService.notifyMentions(mentions, message);
        }

        return { success: true, messageId: message.id };
    }

    @SubscribeMessage('typing')
    handleTyping(
        @MessageBody() data: { roomId: string; isTyping: boolean },
        @ConnectedSocket() client: Socket,
    ) {
        const user = this.chatService.getClientUser(client.id);
        if (user) {
            client.to(data.roomId).emit('user_typing', {
                userId: user.userId,
                userName: user.userName,
                isTyping: data.isTyping,
            });
        }
    }

    @SubscribeMessage('get_online_users')
    handleGetOnlineUsers(@MessageBody() data: { roomId: string }) {
        const users = this.chatService.getRoomUsers(data.roomId);
        return { users };
    }
}
