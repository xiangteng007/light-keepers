/**
 * LoRa Mesh Network Integration
 * 
 * Backend service for LoRa mesh network communication.
 * Supports low-bandwidth, long-range communication for field operations.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * LoRa Device Types
 */
export enum LoRaDeviceType {
    GATEWAY = 'gateway',
    NODE = 'node',
    RELAY = 'relay',
    SENSOR = 'sensor',
}

/**
 * LoRa Message Priority
 */
export enum LoRaPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    EMERGENCY = 3,
}

/**
 * LoRa Device Registration
 */
export interface LoRaDevice {
    deviceId: string;
    deviceType: LoRaDeviceType;
    name: string;
    frequency: number; // MHz
    spreadingFactor: number; // 7-12
    bandwidth: number; // kHz
    lastSeen?: Date;
    signalStrength?: number; // dBm
    batteryLevel?: number; // percentage
    location?: { lat: number; lng: number };
    isOnline: boolean;
}

/**
 * LoRa Message Structure
 */
export interface LoRaMessage {
    id: string;
    sourceDeviceId: string;
    targetDeviceId?: string; // null for broadcast
    payload: LoRaPayload;
    priority: LoRaPriority;
    timestamp: Date;
    hops: string[]; // device IDs that relayed the message
    ackRequired: boolean;
    acked?: boolean;
}

/**
 * LoRa Payload Types
 */
export type LoRaPayload = 
    | { type: 'SOS'; location: { lat: number; lng: number }; message?: string }
    | { type: 'LOCATION_UPDATE'; lat: number; lng: number; accuracy: number }
    | { type: 'STATUS'; status: 'ok' | 'help' | 'busy'; batteryLevel: number }
    | { type: 'SENSOR_DATA'; sensorType: string; value: number; unit: string }
    | { type: 'TEXT'; message: string }
    | { type: 'ACK'; originalMessageId: string };

/**
 * LoRa Mesh Service
 */
@Injectable()
export class LoRaMeshService {
    private readonly logger = new Logger(LoRaMeshService.name);
    private devices: Map<string, LoRaDevice> = new Map();
    private messageQueue: LoRaMessage[] = [];
    private subscribers: Map<string, (message: LoRaMessage) => void> = new Map();

    /**
     * Register a new LoRa device
     */
    registerDevice(device: LoRaDevice): void {
        this.devices.set(device.deviceId, device);
        this.logger.log(`Device registered: ${device.deviceId} (${device.deviceType})`);
    }

    /**
     * Update device status
     */
    updateDeviceStatus(deviceId: string, updates: Partial<LoRaDevice>): void {
        const device = this.devices.get(deviceId);
        if (device) {
            Object.assign(device, updates, { lastSeen: new Date() });
            this.devices.set(deviceId, device);
        }
    }

    /**
     * Get all registered devices
     */
    getDevices(): LoRaDevice[] {
        return Array.from(this.devices.values());
    }

    /**
     * Get online devices
     */
    getOnlineDevices(): LoRaDevice[] {
        return this.getDevices().filter(d => d.isOnline);
    }

    /**
     * Send a message through the mesh network
     */
    async sendMessage(message: Omit<LoRaMessage, 'id' | 'timestamp' | 'hops'>): Promise<string> {
        const fullMessage: LoRaMessage = {
            ...message,
            id: this.generateMessageId(),
            timestamp: new Date(),
            hops: [],
        };

        this.messageQueue.push(fullMessage);
        
        // Simulate message delivery
        await this.routeMessage(fullMessage);

        return fullMessage.id;
    }

    /**
     * Send SOS message (high priority broadcast)
     */
    async sendSOS(deviceId: string, location: { lat: number; lng: number }, message?: string): Promise<string> {
        return this.sendMessage({
            sourceDeviceId: deviceId,
            payload: { type: 'SOS', location, message },
            priority: LoRaPriority.EMERGENCY,
            ackRequired: false,
        });
    }

    /**
     * Subscribe to incoming messages
     */
    subscribe(subscriberId: string, callback: (message: LoRaMessage) => void): void {
        this.subscribers.set(subscriberId, callback);
    }

    /**
     * Unsubscribe from messages
     */
    unsubscribe(subscriberId: string): void {
        this.subscribers.delete(subscriberId);
    }

    /**
     * Route message through mesh network
     */
    private async routeMessage(message: LoRaMessage): Promise<void> {
        // Find best route (simplified - real implementation would use mesh routing algorithms)
        const targetDevice = message.targetDeviceId 
            ? this.devices.get(message.targetDeviceId)
            : null;

        if (message.targetDeviceId && !targetDevice) {
            this.logger.warn(`Target device not found: ${message.targetDeviceId}`);
            return;
        }

        // Notify all subscribers
        this.subscribers.forEach((callback, subscriberId) => {
            try {
                callback(message);
            } catch (error) {
                this.logger.error(`Error in subscriber ${subscriberId}:`, error);
            }
        });

        // Log delivery
        this.logger.log(`Message ${message.id} delivered (${message.payload.type})`);
    }

    /**
     * Get network statistics
     */
    getNetworkStats(): {
        totalDevices: number;
        onlineDevices: number;
        messagesProcessed: number;
        averageSignalStrength: number;
    } {
        const devices = this.getDevices();
        const onlineDevices = devices.filter(d => d.isOnline);
        const avgSignal = onlineDevices.length > 0
            ? onlineDevices.reduce((sum, d) => sum + (d.signalStrength || -100), 0) / onlineDevices.length
            : -100;

        return {
            totalDevices: devices.length,
            onlineDevices: onlineDevices.length,
            messagesProcessed: this.messageQueue.length,
            averageSignalStrength: avgSignal,
        };
    }

    private generateMessageId(): string {
        return `lora-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
