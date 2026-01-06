/**
 * PTT WebRTC Service - 即按即說對講機
 * 短期擴展功能
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface PttChannel {
    id: string;
    name: string;
    missionSessionId?: string;
    frequency?: number; // Virtual frequency for grouping
    participants: Set<string>; // User IDs
    activeSpeaker?: string;
    createdAt: Date;
}

export interface PttSession {
    sessionId: string;
    channelId: string;
    speakerId: string;
    speakerName: string;
    startedAt: Date;
    endedAt?: Date;
    durationMs?: number;
}

export interface IceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

// ============ Service ============

@Injectable()
export class PttWebrtcService implements OnModuleInit {
    private readonly logger = new Logger(PttWebrtcService.name);

    // In-memory storage
    private channels: Map<string, PttChannel> = new Map();
    private sessions: PttSession[] = [];
    private userChannels: Map<string, string> = new Map(); // userId -> channelId

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        // Create default emergency channel
        this.createChannel('emergency', '緊急頻道');
        this.createChannel('command', '指揮頻道');
        this.createChannel('field-1', '現場 1 頻道');
        this.createChannel('field-2', '現場 2 頻道');
        this.logger.log('PTT WebRTC service initialized with default channels');
    }

    // ==================== ICE Configuration ====================

    /**
     * 取得 WebRTC ICE 伺服器配置
     */
    getIceServers(): IceServer[] {
        const turnServer = this.configService.get<string>('TURN_SERVER_URL');
        const turnUsername = this.configService.get<string>('TURN_USERNAME');
        const turnCredential = this.configService.get<string>('TURN_CREDENTIAL');

        const servers: IceServer[] = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ];

        if (turnServer) {
            servers.push({
                urls: turnServer,
                username: turnUsername,
                credential: turnCredential,
            });
        }

        return servers;
    }

    // ==================== Channel Management ====================

    /**
     * 建立頻道
     */
    createChannel(id: string, name: string, missionSessionId?: string): PttChannel {
        const channel: PttChannel = {
            id,
            name,
            missionSessionId,
            participants: new Set(),
            createdAt: new Date(),
        };
        this.channels.set(id, channel);
        this.logger.log(`PTT channel created: ${name} (${id})`);
        return channel;
    }

    /**
     * 取得頻道
     */
    getChannel(channelId: string): PttChannel | undefined {
        return this.channels.get(channelId);
    }

    /**
     * 列出所有頻道
     */
    listChannels(): PttChannel[] {
        return Array.from(this.channels.values()).map(ch => ({
            ...ch,
            participants: ch.participants,
        }));
    }

    /**
     * 加入頻道
     */
    joinChannel(userId: string, channelId: string): boolean {
        const channel = this.channels.get(channelId);
        if (!channel) return false;

        // Leave current channel if any
        const currentChannelId = this.userChannels.get(userId);
        if (currentChannelId) {
            this.leaveChannel(userId);
        }

        channel.participants.add(userId);
        this.userChannels.set(userId, channelId);

        this.eventEmitter.emit('ptt.join', { userId, channelId });
        this.logger.log(`User ${userId} joined channel ${channelId}`);
        return true;
    }

    /**
     * 離開頻道
     */
    leaveChannel(userId: string): boolean {
        const channelId = this.userChannels.get(userId);
        if (!channelId) return false;

        const channel = this.channels.get(channelId);
        if (channel) {
            channel.participants.delete(userId);
            if (channel.activeSpeaker === userId) {
                this.stopTalking(userId);
            }
        }

        this.userChannels.delete(userId);
        this.eventEmitter.emit('ptt.leave', { userId, channelId });
        return true;
    }

    // ==================== PTT Control ====================

    /**
     * 開始發話 (按下 PTT)
     */
    startTalking(userId: string, userName: string): PttSession | null {
        const channelId = this.userChannels.get(userId);
        if (!channelId) return null;

        const channel = this.channels.get(channelId);
        if (!channel) return null;

        // Check if someone else is talking
        if (channel.activeSpeaker && channel.activeSpeaker !== userId) {
            this.logger.warn(`PTT blocked: ${channel.activeSpeaker} is already talking`);
            return null;
        }

        channel.activeSpeaker = userId;
        const session: PttSession = {
            sessionId: `ptt-${Date.now()}`,
            channelId,
            speakerId: userId,
            speakerName: userName,
            startedAt: new Date(),
        };

        this.eventEmitter.emit('ptt.start', session);
        return session;
    }

    /**
     * 停止發話 (放開 PTT)
     */
    stopTalking(userId: string): PttSession | null {
        const channelId = this.userChannels.get(userId);
        if (!channelId) return null;

        const channel = this.channels.get(channelId);
        if (!channel || channel.activeSpeaker !== userId) return null;

        channel.activeSpeaker = undefined;

        const session: PttSession = {
            sessionId: `ptt-${Date.now()}`,
            channelId,
            speakerId: userId,
            speakerName: '',
            startedAt: new Date(),
            endedAt: new Date(),
        };

        this.sessions.push(session);
        if (this.sessions.length > 1000) {
            this.sessions = this.sessions.slice(-500);
        }

        this.eventEmitter.emit('ptt.stop', session);
        return session;
    }

    /**
     * 檢查頻道當前說話者
     */
    getActiveSpeaker(channelId: string): string | undefined {
        return this.channels.get(channelId)?.activeSpeaker;
    }

    // ==================== Query ====================

    /**
     * 取得使用者當前頻道
     */
    getUserChannel(userId: string): string | undefined {
        return this.userChannels.get(userId);
    }

    /**
     * 取得頻道參與者
     */
    getChannelParticipants(channelId: string): string[] {
        const channel = this.channels.get(channelId);
        return channel ? Array.from(channel.participants) : [];
    }
}
