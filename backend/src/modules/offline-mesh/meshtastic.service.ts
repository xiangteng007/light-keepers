/**
 * Meshtastic Service
 * Phase 3.1: Meshtastic LoRa 整合
 * 
 * 功能:
 * 1. 解析 Meshtastic 訊息
 * 2. 發送訊息至 Mesh 網路
 * 3. 位置追蹤整合
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

// ============ Meshtastic Types ============

export interface MeshtasticPosition {
    nodeId: string;
    nodeName?: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    batteryLevel?: number;
    snr?: number;
    timestamp: Date;
}

export interface MeshtasticMessage {
    id: string;
    from: string;
    fromName?: string;
    to: string;
    channel: number;
    text: string;
    timestamp: Date;
    hopCount?: number;
}

export interface MeshtasticNode {
    nodeId: string;
    longName?: string;
    shortName?: string;
    macAddress?: string;
    hwModel?: string;
    batteryLevel?: number;
    lastHeard?: Date;
    position?: MeshtasticPosition;
}

export interface MeshtasticConnectionStatus {
    isConnected: boolean;
    connectionType: 'serial' | 'bluetooth' | 'tcp' | 'none';
    devicePath?: string;
    lastActivity?: Date;
}

// ============ Service ============

@Injectable()
export class MeshtasticService implements OnModuleInit {
    private readonly logger = new Logger(MeshtasticService.name);

    // Node tracking
    private nodes: Map<string, MeshtasticNode> = new Map();
    private positions: Map<string, MeshtasticPosition> = new Map();
    private messages: MeshtasticMessage[] = [];

    // Connection status
    private connectionStatus: MeshtasticConnectionStatus = {
        isConnected: false,
        connectionType: 'none',
    };

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async onModuleInit() {
        // Auto-connect if configured
        const serialPort = this.configService.get<string>('MESHTASTIC_SERIAL_PORT');
        if (serialPort) {
            await this.connect('serial', serialPort);
        }
    }

    // ==================== Connection ====================

    /**
     * 連接至 Meshtastic 設備
     * 注意: 實際實作需要 meshtastic.js 或 @meshtastic/js 套件
     */
    async connect(type: 'serial' | 'bluetooth' | 'tcp', path: string): Promise<boolean> {
        this.logger.log(`Attempting to connect to Meshtastic via ${type}: ${path}`);

        try {
            // Mock connection for development
            // In production, use: import { HttpConnection, SerialConnection } from '@meshtastic/js'

            this.connectionStatus = {
                isConnected: true,
                connectionType: type,
                devicePath: path,
                lastActivity: new Date(),
            };

            this.logger.log('Meshtastic connected successfully (mock mode)');

            // Emit connection event
            this.eventEmitter.emit('meshtastic.connected', this.connectionStatus);

            return true;
        } catch (error) {
            this.logger.error('Failed to connect to Meshtastic:', error);
            this.connectionStatus.isConnected = false;
            return false;
        }
    }

    async disconnect(): Promise<void> {
        this.connectionStatus = {
            isConnected: false,
            connectionType: 'none',
        };
        this.logger.log('Meshtastic disconnected');
        this.eventEmitter.emit('meshtastic.disconnected');
    }

    getConnectionStatus(): MeshtasticConnectionStatus {
        return { ...this.connectionStatus };
    }

    // ==================== Message Handling ====================

    /**
     * 處理收到的訊息
     */
    handleIncomingMessage(rawData: any): void {
        const message: MeshtasticMessage = {
            id: `msg-${Date.now()}`,
            from: rawData.from || 'unknown',
            fromName: rawData.fromName,
            to: rawData.to || 'broadcast',
            channel: rawData.channel || 0,
            text: rawData.text || '',
            timestamp: new Date(),
            hopCount: rawData.hopCount,
        };

        this.messages.push(message);
        if (this.messages.length > 1000) {
            this.messages.shift(); // Keep last 1000 messages
        }

        this.logger.debug(`Meshtastic message: ${message.fromName || message.from}: ${message.text}`);
        this.eventEmitter.emit('meshtastic.message', message);
    }

    /**
     * 發送訊息至 Mesh 網路
     */
    async sendMessage(text: string, to?: string, channel?: number): Promise<boolean> {
        if (!this.connectionStatus.isConnected) {
            this.logger.warn('Cannot send: Meshtastic not connected');
            return false;
        }

        try {
            // Mock send - in production, use actual Meshtastic API
            this.logger.log(`Sending Meshtastic message: "${text}" to ${to || 'broadcast'}`);

            this.connectionStatus.lastActivity = new Date();
            return true;
        } catch (error) {
            this.logger.error('Failed to send Meshtastic message:', error);
            return false;
        }
    }

    getRecentMessages(limit: number = 50): MeshtasticMessage[] {
        return this.messages.slice(-limit);
    }

    // ==================== Position Tracking ====================

    /**
     * 處理位置更新
     */
    handlePositionUpdate(rawData: any): void {
        const position: MeshtasticPosition = {
            nodeId: rawData.nodeId || rawData.from,
            nodeName: rawData.nodeName,
            latitude: rawData.latitude,
            longitude: rawData.longitude,
            altitude: rawData.altitude,
            batteryLevel: rawData.batteryLevel,
            snr: rawData.snr,
            timestamp: new Date(),
        };

        this.positions.set(position.nodeId, position);

        // Update node info
        const node = this.nodes.get(position.nodeId) || { nodeId: position.nodeId };
        node.position = position;
        node.lastHeard = new Date();
        node.batteryLevel = position.batteryLevel;
        this.nodes.set(position.nodeId, node);

        this.eventEmitter.emit('meshtastic.position', position);
    }

    getNodePosition(nodeId: string): MeshtasticPosition | undefined {
        return this.positions.get(nodeId);
    }

    getAllPositions(): MeshtasticPosition[] {
        return Array.from(this.positions.values());
    }

    // ==================== Node Management ====================

    handleNodeInfo(rawData: any): void {
        const node: MeshtasticNode = {
            nodeId: rawData.nodeId,
            longName: rawData.longName,
            shortName: rawData.shortName,
            macAddress: rawData.macAddress,
            hwModel: rawData.hwModel,
            batteryLevel: rawData.batteryLevel,
            lastHeard: new Date(),
        };

        this.nodes.set(node.nodeId, { ...this.nodes.get(node.nodeId), ...node });
        this.eventEmitter.emit('meshtastic.nodeInfo', node);
    }

    getNode(nodeId: string): MeshtasticNode | undefined {
        return this.nodes.get(nodeId);
    }

    getAllNodes(): MeshtasticNode[] {
        return Array.from(this.nodes.values());
    }

    getOnlineNodes(): MeshtasticNode[] {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return this.getAllNodes().filter(n => n.lastHeard && n.lastHeard > fiveMinutesAgo);
    }
}
