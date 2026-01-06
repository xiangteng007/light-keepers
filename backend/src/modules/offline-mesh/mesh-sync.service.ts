/**
 * 網狀網路服務 (Mesh Network Service)
 * 模組 B: 離線網狀中繼站
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeshMessage, MeshNode, MeshLocation } from './entities/mesh-message.entity';

// Meshtastic 封包格式
interface MeshtasticPacket {
    packet: {
        from: number;
        to: number;
        channel: number;
        decoded?: {
            portnum: string;
            payload: string;
        };
    };
    position?: {
        latitudeI: number;
        longitudeI: number;
        altitude: number;
    };
    sender: string;
    timestamp: number;
}

@Injectable()
export class MeshSyncService implements OnModuleInit {
    private readonly logger = new Logger(MeshSyncService.name);

    // MQTT 連線狀態
    private mqttConnected = false;

    // 離線訊息佇列
    private offlineQueue: MeshMessage[] = [];

    constructor(
        @InjectRepository(MeshMessage)
        private messageRepository: Repository<MeshMessage>,
        @InjectRepository(MeshNode)
        private nodeRepository: Repository<MeshNode>,
        private eventEmitter: EventEmitter2,
    ) { }

    onModuleInit(): void {
        this.initializeMQTT();
    }

    // ==================== MQTT 連線 ====================

    private async initializeMQTT(): Promise<void> {
        const mqttUrl = process.env.MQTT_BROKER_URL;

        if (!mqttUrl) {
            this.logger.warn('MQTT_BROKER_URL not configured, using simulation mode');
            this.startSimulationMode();
            return;
        }

        try {
            // 動態載入 MQTT
            const mqtt = await import('mqtt');
            const client = mqtt.connect(mqttUrl);

            client.on('connect', () => {
                this.mqttConnected = true;
                this.logger.log('Connected to MQTT broker');

                // 訂閱 Meshtastic 主題
                client.subscribe('msh/+/json/#', (err: Error | null) => {
                    if (err) {
                        this.logger.error('Failed to subscribe to Meshtastic topics');
                    } else {
                        this.logger.log('Subscribed to Meshtastic JSON topics');
                    }
                });
            });

            client.on('message', (topic: string, message: Buffer) => {
                this.handleMQTTMessage(topic, message.toString());
            });

            client.on('error', (error: Error) => {
                this.logger.error('MQTT error:', error);
                this.mqttConnected = false;
            });

        } catch (error) {
            this.logger.error('Failed to initialize MQTT', error);
            this.startSimulationMode();
        }
    }

    private startSimulationMode(): void {
        this.logger.log('Starting mesh simulation mode');

        // 每分鐘產生模擬訊息
        setInterval(() => {
            const simulatedPacket: MeshtasticPacket = {
                packet: {
                    from: Math.floor(Math.random() * 1000000),
                    to: 0xFFFFFFFF,
                    channel: 0,
                    decoded: {
                        portnum: 'TEXT_MESSAGE_APP',
                        payload: Buffer.from(`模擬訊息 ${Date.now()}`).toString('base64'),
                    },
                },
                position: {
                    latitudeI: Math.floor((25.0 + Math.random() * 0.1) * 10000000),
                    longitudeI: Math.floor((121.5 + Math.random() * 0.1) * 10000000),
                    altitude: 100,
                },
                sender: `!sim${Math.floor(Math.random() * 10000)}`,
                timestamp: Math.floor(Date.now() / 1000),
            };

            this.processMeshtasticPacket(simulatedPacket);
        }, 60000);
    }

    // ==================== 訊息處理 ====================

    private async handleMQTTMessage(topic: string, rawMessage: string): Promise<void> {
        try {
            const packet = JSON.parse(rawMessage) as MeshtasticPacket;
            await this.processMeshtasticPacket(packet);
        } catch (error) {
            this.logger.error('Failed to parse MQTT message', error);
        }
    }

    private async processMeshtasticPacket(packet: MeshtasticPacket): Promise<void> {
        const nodeId = packet.sender || `!${packet.packet.from.toString(16)}`;

        // 解析位置
        let location: MeshLocation | undefined;
        if (packet.position) {
            location = {
                lat: packet.position.latitudeI / 10000000,
                lng: packet.position.longitudeI / 10000000,
                alt: packet.position.altitude,
            };
        }

        // 解析訊息內容
        let content = '';
        if (packet.packet.decoded?.payload) {
            content = Buffer.from(packet.packet.decoded.payload, 'base64').toString('utf-8');
        }

        // 儲存訊息
        const message = this.messageRepository.create({
            nodeId,
            content,
            location,
            receivedAt: new Date(packet.timestamp * 1000),
            isSynced: false,
            isProcessed: false,
        });

        await this.messageRepository.save(message);

        // 更新節點狀態
        await this.updateNodeStatus(nodeId, location);

        // 發送事件
        this.eventEmitter.emit('mesh.message.received', { message, packet });

        // 檢查是否為緊急訊息
        if (this.isEmergencyMessage(content)) {
            await this.processEmergencyMessage(message);
        }

        this.logger.log(`Mesh message received from ${nodeId}: ${content.substring(0, 50)}`);
    }

    private async updateNodeStatus(nodeId: string, location?: MeshLocation): Promise<void> {
        let node = await this.nodeRepository.findOne({ where: { nodeId } });

        if (!node) {
            node = this.nodeRepository.create({
                nodeId,
                lastLocation: location,
                lastSeen: new Date(),
                messageCount: 1,
            });
        } else {
            node.lastSeen = new Date();
            node.messageCount++;
            if (location) {
                node.lastLocation = location;
            }
        }

        await this.nodeRepository.save(node);
    }

    // ==================== 緊急訊息處理 ====================

    private isEmergencyMessage(content: string): boolean {
        const emergencyKeywords = ['SOS', '救命', '救援', 'HELP', '受困', '急救', '緊急'];
        return emergencyKeywords.some(keyword =>
            content.toUpperCase().includes(keyword)
        );
    }

    private async processEmergencyMessage(message: MeshMessage): Promise<void> {
        this.logger.warn(`Emergency message detected: ${message.content}`);

        // 發送 SOS 事件
        this.eventEmitter.emit('mesh.sos.detected', {
            messageId: message.id,
            nodeId: message.nodeId,
            content: message.content,
            location: message.location,
        });

        // 標記為已處理
        message.isProcessed = true;
        await this.messageRepository.save(message);
    }

    // ==================== 離線同步 ====================

    /**
     * 同步離線期間累積的訊息
     */
    async syncOfflineMessages(): Promise<{ synced: number; failed: number }> {
        const unsyncedMessages = await this.messageRepository.find({
            where: { isSynced: false },
            order: { receivedAt: 'ASC' },
        });

        let synced = 0;
        let failed = 0;

        for (const message of unsyncedMessages) {
            try {
                // 這裡實作上傳到中央伺服器的邏輯
                await this.uploadToCloudServer(message);

                message.isSynced = true;
                await this.messageRepository.save(message);
                synced++;
            } catch (error) {
                failed++;
                this.logger.error(`Failed to sync message ${message.id}`, error);
            }
        }

        this.logger.log(`Offline sync completed: ${synced} synced, ${failed} failed`);
        return { synced, failed };
    }

    private async uploadToCloudServer(message: MeshMessage): Promise<void> {
        // TODO: 實作 Merkle Tree 同步機制
        // 目前僅模擬上傳
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // ==================== 節點管理 ====================

    /**
     * 取得所有活躍節點
     */
    async getActiveNodes(): Promise<MeshNode[]> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        return this.nodeRepository
            .createQueryBuilder('node')
            .where('node.lastSeen > :fiveMinutesAgo', { fiveMinutesAgo })
            .orderBy('node.lastSeen', 'DESC')
            .getMany();
    }

    /**
     * 取得所有節點
     */
    async getAllNodes(): Promise<MeshNode[]> {
        return this.nodeRepository.find({
            order: { lastSeen: 'DESC' },
        });
    }

    /**
     * 取得節點的訊息歷史
     */
    async getNodeMessages(nodeId: string, limit: number = 50): Promise<MeshMessage[]> {
        return this.messageRepository.find({
            where: { nodeId },
            order: { receivedAt: 'DESC' },
            take: limit,
        });
    }

    // ==================== 統計 ====================

    async getStats(): Promise<{
        totalNodes: number;
        activeNodes: number;
        totalMessages: number;
        unsyncedMessages: number;
        emergencyMessages: number;
    }> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const [totalNodes, activeNodes, totalMessages, unsyncedMessages, emergencyMessages] = await Promise.all([
            this.nodeRepository.count(),
            this.nodeRepository.count({ where: { lastSeen: fiveMinutesAgo } }),
            this.messageRepository.count(),
            this.messageRepository.count({ where: { isSynced: false } }),
            this.messageRepository.count({ where: { isProcessed: true } }),
        ]);

        return {
            totalNodes,
            activeNodes,
            totalMessages,
            unsyncedMessages,
            emergencyMessages,
        };
    }
}
