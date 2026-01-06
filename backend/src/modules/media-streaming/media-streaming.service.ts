/**
 * Media Streaming Service - 即時影像串流
 * 中期擴展功能 - MediaSoup/Go2RTC 整合
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface StreamSource {
    id: string;
    type: 'drone' | 'webcam' | 'body-cam' | 'fixed-camera' | 'rtsp';
    name: string;
    ownerId?: string;
    ownerName?: string;
    sourceUrl?: string; // RTSP URL for external sources
    status: 'offline' | 'connecting' | 'live' | 'error';
    resolution?: { width: number; height: number };
    bitrate?: number;
    viewers: number;
    startedAt?: Date;
    metadata?: Record<string, any>;
}

export interface StreamRoom {
    id: string;
    name: string;
    missionSessionId?: string;
    sources: Set<string>; // Source IDs
    viewers: Set<string>; // User IDs
    isRecording: boolean;
    recordingPath?: string;
    createdAt: Date;
}

export interface WebRTCOffer {
    roomId: string;
    sourceId: string;
    sdp: string;
    iceServers: { urls: string | string[]; username?: string; credential?: string }[];
}

// ============ Service ============

@Injectable()
export class MediaStreamingService {
    private readonly logger = new Logger(MediaStreamingService.name);

    // In-memory storage
    private sources: Map<string, StreamSource> = new Map();
    private rooms: Map<string, StreamRoom> = new Map();

    constructor(private readonly eventEmitter: EventEmitter2) { }

    // ==================== ICE Configuration ====================

    /**
     * 取得 WebRTC ICE 伺服器
     */
    getIceServers() {
        return [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // Add TURN server if available
            ...(process.env.TURN_SERVER_URL ? [{
                urls: process.env.TURN_SERVER_URL,
                username: process.env.TURN_USERNAME,
                credential: process.env.TURN_CREDENTIAL,
            }] : []),
        ];
    }

    // ==================== Source Management ====================

    /**
     * 註冊串流來源
     */
    registerSource(data: Omit<StreamSource, 'id' | 'status' | 'viewers'>): StreamSource {
        const id = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const source: StreamSource = {
            ...data,
            id,
            status: 'offline',
            viewers: 0,
        };
        this.sources.set(id, source);
        this.logger.log(`Stream source registered: ${source.name} (${source.type})`);
        return source;
    }

    /**
     * 取得串流來源
     */
    getSource(sourceId: string): StreamSource | undefined {
        return this.sources.get(sourceId);
    }

    /**
     * 列出所有串流來源
     */
    listSources(type?: StreamSource['type']): StreamSource[] {
        const all = Array.from(this.sources.values());
        if (type) return all.filter(s => s.type === type);
        return all;
    }

    /**
     * 開始串流
     */
    startStream(sourceId: string): boolean {
        const source = this.sources.get(sourceId);
        if (!source) return false;

        source.status = 'connecting';
        source.startedAt = new Date();

        // Simulate connection (real implementation connects to media server)
        setTimeout(() => {
            source.status = 'live';
            this.eventEmitter.emit('stream.started', source);
        }, 1000);

        return true;
    }

    /**
     * 停止串流
     */
    stopStream(sourceId: string): boolean {
        const source = this.sources.get(sourceId);
        if (!source) return false;

        source.status = 'offline';
        source.startedAt = undefined;
        source.viewers = 0;

        this.eventEmitter.emit('stream.stopped', { sourceId });
        return true;
    }

    // ==================== Room Management ====================

    /**
     * 建立串流房間
     */
    createRoom(name: string, missionSessionId?: string): StreamRoom {
        const id = `room-${Date.now()}`;
        const room: StreamRoom = {
            id,
            name,
            missionSessionId,
            sources: new Set(),
            viewers: new Set(),
            isRecording: false,
            createdAt: new Date(),
        };
        this.rooms.set(id, room);
        this.logger.log(`Stream room created: ${name}`);
        return room;
    }

    /**
     * 加入串流來源到房間
     */
    addSourceToRoom(roomId: string, sourceId: string): boolean {
        const room = this.rooms.get(roomId);
        const source = this.sources.get(sourceId);
        if (!room || !source) return false;

        room.sources.add(sourceId);
        this.eventEmitter.emit('room.sourceAdded', { roomId, sourceId });
        return true;
    }

    /**
     * 觀看者加入房間
     */
    joinRoom(roomId: string, userId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.viewers.add(userId);

        // Update viewer counts
        for (const sourceId of room.sources) {
            const source = this.sources.get(sourceId);
            if (source) source.viewers = room.viewers.size;
        }

        return true;
    }

    /**
     * 觀看者離開房間
     */
    leaveRoom(roomId: string, userId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.viewers.delete(userId);

        for (const sourceId of room.sources) {
            const source = this.sources.get(sourceId);
            if (source) source.viewers = room.viewers.size;
        }

        return true;
    }

    /**
     * 取得房間資訊
     */
    getRoom(roomId: string): StreamRoom | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * 列出所有房間
     */
    listRooms(): StreamRoom[] {
        return Array.from(this.rooms.values()).map(room => ({
            ...room,
            sources: room.sources,
            viewers: room.viewers,
        }));
    }

    // ==================== Recording ====================

    /**
     * 開始錄影
     */
    startRecording(roomId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room || room.isRecording) return false;

        room.isRecording = true;
        room.recordingPath = `./recordings/${roomId}-${Date.now()}.webm`;

        this.eventEmitter.emit('room.recordingStarted', { roomId, path: room.recordingPath });
        this.logger.log(`Recording started for room ${roomId}`);
        return true;
    }

    /**
     * 停止錄影
     */
    stopRecording(roomId: string): string | null {
        const room = this.rooms.get(roomId);
        if (!room || !room.isRecording) return null;

        room.isRecording = false;
        const path = room.recordingPath;
        room.recordingPath = undefined;

        this.eventEmitter.emit('room.recordingStopped', { roomId, path });
        return path || null;
    }

    // ==================== WebRTC Signaling ====================

    /**
     * 建立 WebRTC Offer (模擬)
     * 實際實作需整合 MediaSoup/Go2RTC
     */
    createOffer(roomId: string, sourceId: string): WebRTCOffer {
        return {
            roomId,
            sourceId,
            sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n',
            iceServers: this.getIceServers(),
        };
    }
}
