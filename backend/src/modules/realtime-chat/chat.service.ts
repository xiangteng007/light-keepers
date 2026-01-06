import { Injectable, Logger } from '@nestjs/common';

interface ChatMessage {
    id: string;
    roomId: string;
    userId: string;
    userName: string;
    content: string;
    type: 'text' | 'image' | 'file' | 'system';
    attachments?: Attachment[];
    mentions?: string[];
    createdAt: Date;
}

interface Attachment {
    id: string;
    type: 'image' | 'file';
    url: string;
    name: string;
    size: number;
}

interface ChatRoom {
    id: string;
    name: string;
    type: 'task' | 'event' | 'group' | 'direct';
    members: string[];
    createdAt: Date;
}

interface ClientInfo {
    clientId: string;
    userId: string;
    userName: string;
    rooms: Set<string>;
}

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    private clients: Map<string, ClientInfo> = new Map();
    private rooms: Map<string, ChatRoom> = new Map();
    private messages: Map<string, ChatMessage[]> = new Map();
    private userRooms: Map<string, Set<string>> = new Map();

    addClient(clientId: string) {
        this.logger.log(`Adding client: ${clientId}`);
    }

    removeClient(clientId: string) {
        const client = this.clients.get(clientId);
        if (client) {
            client.rooms.forEach(roomId => {
                this.leaveRoom(clientId, roomId);
            });
            this.clients.delete(clientId);
        }
    }

    joinRoom(clientId: string, roomId: string, userId: string, userName: string) {
        // 更新或建立 client info
        let client = this.clients.get(clientId);
        if (!client) {
            client = { clientId, userId, userName, rooms: new Set() };
            this.clients.set(clientId, client);
        }
        client.rooms.add(roomId);

        // 追蹤使用者所在房間
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId)!.add(roomId);

        // 建立房間（如果不存在）
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                name: roomId,
                type: 'group',
                members: [],
                createdAt: new Date(),
            });
        }

        const room = this.rooms.get(roomId)!;
        if (!room.members.includes(userId)) {
            room.members.push(userId);
        }

        this.logger.log(`User ${userName} joined room ${roomId}`);
    }

    leaveRoom(clientId: string, roomId: string) {
        const client = this.clients.get(clientId);
        if (client) {
            client.rooms.delete(roomId);
            this.userRooms.get(client.userId)?.delete(roomId);
        }
    }

    getClientUser(clientId: string) {
        return this.clients.get(clientId);
    }

    async getRoomHistory(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
        const roomMessages = this.messages.get(roomId) || [];
        return roomMessages.slice(-limit);
    }

    async saveMessage(data: {
        roomId: string;
        userId: string;
        userName: string;
        content: string;
        type: string;
        attachments?: any[];
    }): Promise<ChatMessage> {
        const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            roomId: data.roomId,
            userId: data.userId,
            userName: data.userName,
            content: data.content,
            type: data.type as any,
            attachments: data.attachments,
            mentions: this.parseMentions(data.content),
            createdAt: new Date(),
        };

        if (!this.messages.has(data.roomId)) {
            this.messages.set(data.roomId, []);
        }
        this.messages.get(data.roomId)!.push(message);

        // 記憶體限制：最多保留 1000 筆訊息
        const roomMessages = this.messages.get(data.roomId)!;
        if (roomMessages.length > 1000) {
            roomMessages.splice(0, roomMessages.length - 1000);
        }

        return message;
    }

    parseMentions(content: string): string[] {
        const mentionRegex = /@(\w+)/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1]);
        }
        return mentions;
    }

    notifyMentions(mentions: string[], message: ChatMessage) {
        // TODO: 整合推播通知服務
        this.logger.log(`Notifying mentions: ${mentions.join(', ')} for message ${message.id}`);
    }

    getRoomUsers(roomId: string): { userId: string; userName: string }[] {
        const users: { userId: string; userName: string }[] = [];

        this.clients.forEach(client => {
            if (client.rooms.has(roomId)) {
                users.push({ userId: client.userId, userName: client.userName });
            }
        });

        return users;
    }

    // ===== 房間管理 =====

    createRoom(data: { name: string; type: ChatRoom['type']; members: string[] }): ChatRoom {
        const room: ChatRoom = {
            id: `room-${Date.now()}`,
            name: data.name,
            type: data.type,
            members: data.members,
            createdAt: new Date(),
        };
        this.rooms.set(room.id, room);
        return room;
    }

    createTaskRoom(taskId: string, taskName: string, members: string[]): ChatRoom {
        return this.createRoom({
            name: `任務: ${taskName}`,
            type: 'task',
            members,
        });
    }

    createEventRoom(eventId: string, eventName: string): ChatRoom {
        return this.createRoom({
            name: `事件: ${eventName}`,
            type: 'event',
            members: [],
        });
    }

    getRooms(): ChatRoom[] {
        return Array.from(this.rooms.values());
    }

    getRoom(roomId: string): ChatRoom | undefined {
        return this.rooms.get(roomId);
    }

    getUserRooms(userId: string): ChatRoom[] {
        const roomIds = this.userRooms.get(userId) || new Set();
        return Array.from(roomIds)
            .map(id => this.rooms.get(id))
            .filter((r): r is ChatRoom => r !== undefined);
    }
}
