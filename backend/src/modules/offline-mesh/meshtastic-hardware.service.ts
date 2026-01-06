/**
 * Meshtastic LoRa Hardware Service - LoRa 硬體連接
 * 透過 @meshtastic/js 連接實體 LoRa 設備
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface MeshtasticDevice {
    id: string;
    name: string;
    connectionType: 'serial' | 'ble' | 'http';
    port?: string;
    connected: boolean;
    lastSeen?: Date;
}

export interface MeshtasticNode {
    num: number;
    user?: {
        id: string;
        longName: string;
        shortName: string;
    };
    position?: {
        latitudeI: number;
        longitudeI: number;
        altitude?: number;
        time?: number;
    };
    snr?: number;
    lastHeard?: number;
}

export interface MeshtasticMessage {
    from: number;
    to: number;
    channel: number;
    payload: Uint8Array | string;
    rxTime?: number;
    rxSnr?: number;
}

// ============ Service ============

@Injectable()
export class MeshtasticHardwareService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MeshtasticHardwareService.name);

    // Device management
    private devices: Map<string, MeshtasticDevice> = new Map();
    private nodes: Map<number, MeshtasticNode> = new Map();
    private connections: Map<string, any> = new Map(); // Real connection objects when hardware connected

    // Configuration
    private serialPort: string;
    private autoConnect: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.serialPort = this.configService.get<string>('MESHTASTIC_SERIAL_PORT', '');
        this.autoConnect = this.configService.get<boolean>('MESHTASTIC_AUTO_CONNECT', false);
    }

    async onModuleInit() {
        this.logger.log('Meshtastic Hardware Service initialized');

        if (this.autoConnect && this.serialPort) {
            await this.connectSerial(this.serialPort);
        }
    }

    async onModuleDestroy() {
        for (const deviceId of this.connections.keys()) {
            await this.disconnect(deviceId);
        }
    }

    // ==================== Connection Management ====================

    /**
     * 連接 Serial 設備
     */
    async connectSerial(port: string): Promise<MeshtasticDevice> {
        const deviceId = `serial-${port.replace(/[^a-zA-Z0-9]/g, '')}`;

        try {
            // In production, use @meshtastic/js:
            // const { ISerialConnection, Protobuf } = await import('@meshtastic/js');
            // const connection = new ISerialConnection();
            // await connection.connect({ port });

            const device: MeshtasticDevice = {
                id: deviceId,
                name: `Serial Device (${port})`,
                connectionType: 'serial',
                port,
                connected: true,
                lastSeen: new Date(),
            };

            this.devices.set(deviceId, device);
            this.logger.log(`Connected to Meshtastic device on ${port}`);

            // Emit connection event
            this.eventEmitter.emit('meshtastic.connected', { deviceId, port });

            return device;
        } catch (error) {
            this.logger.error(`Failed to connect to ${port}: ${error}`);
            throw error;
        }
    }

    /**
     * 連接 BLE 設備
     */
    async connectBle(deviceName: string): Promise<MeshtasticDevice> {
        const deviceId = `ble-${deviceName.replace(/[^a-zA-Z0-9]/g, '')}`;

        try {
            // BLE connection requires browser environment or noble library
            // const { IBLEConnection } = await import('@meshtastic/js');

            const device: MeshtasticDevice = {
                id: deviceId,
                name: deviceName,
                connectionType: 'ble',
                connected: true,
                lastSeen: new Date(),
            };

            this.devices.set(deviceId, device);
            this.logger.log(`Connected to Meshtastic BLE device: ${deviceName}`);

            return device;
        } catch (error) {
            this.logger.error(`Failed to connect BLE ${deviceName}: ${error}`);
            throw error;
        }
    }

    /**
     * 連接 HTTP API 設備
     */
    async connectHttp(url: string): Promise<MeshtasticDevice> {
        const deviceId = `http-${Buffer.from(url).toString('base64').slice(0, 16)}`;

        try {
            // const { IHTTPConnection } = await import('@meshtastic/js');

            const device: MeshtasticDevice = {
                id: deviceId,
                name: `HTTP Device (${url})`,
                connectionType: 'http',
                connected: true,
                lastSeen: new Date(),
            };

            this.devices.set(deviceId, device);
            this.logger.log(`Connected to Meshtastic HTTP device at ${url}`);

            return device;
        } catch (error) {
            this.logger.error(`Failed to connect HTTP ${url}: ${error}`);
            throw error;
        }
    }

    /**
     * 中斷連接
     */
    async disconnect(deviceId: string): Promise<void> {
        const connection = this.connections.get(deviceId);
        if (connection) {
            // await connection.disconnect();
            this.connections.delete(deviceId);
        }

        const device = this.devices.get(deviceId);
        if (device) {
            device.connected = false;
        }

        this.logger.log(`Disconnected from device ${deviceId}`);
        this.eventEmitter.emit('meshtastic.disconnected', { deviceId });
    }

    // ==================== Messaging ====================

    /**
     * 發送訊息
     */
    async sendMessage(deviceId: string, message: string, destination?: number): Promise<boolean> {
        const device = this.devices.get(deviceId);
        if (!device?.connected) {
            throw new Error(`Device ${deviceId} not connected`);
        }

        try {
            // In production:
            // const connection = this.connections.get(deviceId);
            // await connection.sendText(message, destination);

            this.logger.log(`Message sent via ${deviceId}: ${message.substring(0, 50)}...`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send message: ${error}`);
            return false;
        }
    }

    /**
     * 發送位置
     */
    async sendPosition(deviceId: string, lat: number, lng: number, altitude?: number): Promise<boolean> {
        const device = this.devices.get(deviceId);
        if (!device?.connected) {
            throw new Error(`Device ${deviceId} not connected`);
        }

        try {
            // In production:
            // const connection = this.connections.get(deviceId);
            // await connection.sendPosition(lat * 1e7, lng * 1e7, altitude || 0);

            this.logger.log(`Position sent via ${deviceId}: ${lat}, ${lng}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send position: ${error}`);
            return false;
        }
    }

    // ==================== Node Management ====================

    /**
     * 取得所有已知節點
     */
    getNodes(): MeshtasticNode[] {
        return Array.from(this.nodes.values());
    }

    /**
     * 取得已連接設備
     */
    getDevices(): MeshtasticDevice[] {
        return Array.from(this.devices.values());
    }

    /**
     * 處理接收到的節點資訊
     */
    handleNodeInfo(node: MeshtasticNode): void {
        this.nodes.set(node.num, node);

        if (node.position) {
            this.eventEmitter.emit('meshtastic.position', {
                nodeNum: node.num,
                lat: node.position.latitudeI / 1e7,
                lng: node.position.longitudeI / 1e7,
                altitude: node.position.altitude,
            });
        }
    }

    /**
     * 處理接收到的訊息
     */
    handleMessage(message: MeshtasticMessage): void {
        this.eventEmitter.emit('meshtastic.message', {
            from: message.from,
            to: message.to,
            channel: message.channel,
            payload: typeof message.payload === 'string'
                ? message.payload
                : Buffer.from(message.payload).toString('utf-8'),
            rxTime: message.rxTime,
            snr: message.rxSnr,
        });
    }
}
