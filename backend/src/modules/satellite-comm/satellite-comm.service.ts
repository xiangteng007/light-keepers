import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Satellite Communication Service
 * Integration with Starlink and Iridium satellite networks
 * for disaster response in areas without terrestrial connectivity
 */
@Injectable()
export class SatelliteCommService {
    private readonly logger = new Logger(SatelliteCommService.name);

    // Connection status
    private starlinkConnected = false;
    private iridiumConnected = false;

    // Message queues
    private outboundQueue: SatelliteMessage[] = [];
    private inboundMessages: SatelliteMessage[] = [];

    // Bandwidth usage tracking
    private bandwidthUsage = {
        starlink: { used: 0, limit: 100 * 1024 * 1024 * 1024 }, // 100GB
        iridium: { used: 0, limit: 10 * 1024 }, // 10KB (SBD limit)
    };

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Initialize Starlink connection
     */
    async initializeStarlink(): Promise<ConnectionStatus> {
        const apiKey = this.configService.get<string>('STARLINK_API_KEY');

        if (!apiKey) {
            this.logger.warn('Starlink API key not configured');
            return {
                provider: 'starlink',
                connected: false,
                error: 'API key not configured',
            };
        }

        try {
            // Simulate Starlink dish discovery and connection
            await this.discoverStarlinkDish();
            this.starlinkConnected = true;

            this.logger.log('Starlink connection established');
            this.eventEmitter.emit('satellite.starlink.connected');

            return {
                provider: 'starlink',
                connected: true,
                signalStrength: 85,
                latency: 40, // ms
                downloadSpeed: 150, // Mbps
                uploadSpeed: 20, // Mbps
            };
        } catch (error) {
            this.logger.error('Starlink connection failed', error);
            return {
                provider: 'starlink',
                connected: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Initialize Iridium SBD modem
     */
    async initializeIridium(): Promise<ConnectionStatus> {
        const modemPort = this.configService.get<string>('IRIDIUM_MODEM_PORT');

        if (!modemPort) {
            this.logger.warn('Iridium modem port not configured');
            return {
                provider: 'iridium',
                connected: false,
                error: 'Modem port not configured',
            };
        }

        try {
            // Simulate Iridium modem initialization
            await this.initIridiumModem(modemPort);
            this.iridiumConnected = true;

            this.logger.log('Iridium SBD modem connected');
            this.eventEmitter.emit('satellite.iridium.connected');

            return {
                provider: 'iridium',
                connected: true,
                signalStrength: 4, // 0-5 bars
                messageCredits: 100,
            };
        } catch (error) {
            this.logger.error('Iridium connection failed', error);
            return {
                provider: 'iridium',
                connected: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Send message via best available satellite link
     */
    async sendMessage(message: OutboundMessage): Promise<SendResult> {
        const provider = this.selectBestProvider(message);

        if (provider === 'starlink' && this.starlinkConnected) {
            return this.sendViaStarlink(message);
        } else if (provider === 'iridium' && this.iridiumConnected) {
            return this.sendViaIridium(message);
        }

        // Queue for later if no connection
        this.outboundQueue.push({
            id: `msg-${Date.now()}`,
            ...message,
            queuedAt: new Date(),
            status: 'queued',
        });

        return {
            success: false,
            queued: true,
            queuePosition: this.outboundQueue.length,
        };
    }

    /**
     * Send emergency SOS via Iridium (guaranteed delivery)
     */
    async sendEmergencySOS(sos: EmergencySOS): Promise<SendResult> {
        if (!this.iridiumConnected) {
            await this.initializeIridium();
        }

        const message: OutboundMessage = {
            type: 'emergency',
            priority: 'critical',
            payload: this.encodeSOSPayload(sos),
            destination: 'emergency-center',
            requiresAck: true,
        };

        // Always use Iridium for SOS (works anywhere)
        const result = await this.sendViaIridium(message);

        if (result.success) {
            this.logger.log(`Emergency SOS sent successfully: ${result.messageId}`);
            this.eventEmitter.emit('satellite.sos.sent', {
                ...sos,
                messageId: result.messageId,
            });
        }

        return result;
    }

    /**
     * Request bandwidth allocation for high-priority data
     */
    async requestBandwidth(request: BandwidthRequest): Promise<BandwidthAllocation> {
        if (!this.starlinkConnected) {
            throw new Error('Starlink not connected');
        }

        const available = this.bandwidthUsage.starlink.limit - this.bandwidthUsage.starlink.used;
        const allocated = Math.min(request.requestedBytes, available);

        if (allocated < request.minimumBytes) {
            return {
                approved: false,
                allocated: 0,
                reason: 'Insufficient bandwidth available',
            };
        }

        this.bandwidthUsage.starlink.used += allocated;

        return {
            approved: true,
            allocated,
            validUntil: new Date(Date.now() + request.durationMs),
            priority: request.priority,
        };
    }

    /**
     * Get current connection status
     */
    getStatus(): SatelliteStatus {
        return {
            starlink: {
                connected: this.starlinkConnected,
                bandwidthUsed: this.bandwidthUsage.starlink.used,
                bandwidthLimit: this.bandwidthUsage.starlink.limit,
            },
            iridium: {
                connected: this.iridiumConnected,
                bandwidthUsed: this.bandwidthUsage.iridium.used,
                bandwidthLimit: this.bandwidthUsage.iridium.limit,
            },
            queuedMessages: this.outboundQueue.length,
            lastCheck: new Date(),
        };
    }

    /**
     * Process queued messages when connection restored
     */
    async processQueue(): Promise<number> {
        let processed = 0;

        while (this.outboundQueue.length > 0) {
            const message = this.outboundQueue[0];
            const result = await this.sendMessage(message as OutboundMessage);

            if (result.success) {
                this.outboundQueue.shift();
                processed++;
            } else if (!result.queued) {
                break; // Connection issue, stop processing
            }
        }

        return processed;
    }

    // Private helper methods
    private async discoverStarlinkDish(): Promise<void> {
        // Simulate Starlink dish discovery
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    private async initIridiumModem(port: string): Promise<void> {
        // Simulate Iridium modem initialization
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    private selectBestProvider(message: OutboundMessage): 'starlink' | 'iridium' {
        // Use Iridium for small critical messages, Starlink for larger data
        if (message.type === 'emergency' || message.priority === 'critical') {
            return 'iridium';
        }

        const payloadSize = message.payload?.length || 0;
        if (payloadSize <= 340) { // Iridium SBD limit
            return this.starlinkConnected ? 'starlink' : 'iridium';
        }

        return 'starlink';
    }

    private async sendViaStarlink(message: OutboundMessage): Promise<SendResult> {
        const bytes = message.payload?.length || 0;
        this.bandwidthUsage.starlink.used += bytes;

        return {
            success: true,
            provider: 'starlink',
            messageId: `stk-${Date.now()}`,
            sentAt: new Date(),
            bytes,
        };
    }

    private async sendViaIridium(message: OutboundMessage): Promise<SendResult> {
        const bytes = Math.min(message.payload?.length || 0, 340);
        this.bandwidthUsage.iridium.used += bytes;

        return {
            success: true,
            provider: 'iridium',
            messageId: `ird-${Date.now()}`,
            sentAt: new Date(),
            bytes,
        };
    }

    private encodeSOSPayload(sos: EmergencySOS): string {
        // Compact encoding for SBD (max 340 bytes)
        return JSON.stringify({
            t: 'SOS',
            lat: sos.location.lat.toFixed(6),
            lng: sos.location.lng.toFixed(6),
            p: sos.personnelCount,
            s: sos.situation.substring(0, 200),
            ts: Date.now(),
        });
    }
}

// Type definitions
interface ConnectionStatus {
    provider: 'starlink' | 'iridium';
    connected: boolean;
    error?: string;
    signalStrength?: number;
    latency?: number;
    downloadSpeed?: number;
    uploadSpeed?: number;
    messageCredits?: number;
}

interface SatelliteMessage {
    id: string;
    type: string;
    priority: string;
    payload: string;
    destination: string;
    queuedAt: Date;
    status: 'queued' | 'sending' | 'sent' | 'failed';
}

interface OutboundMessage {
    type: 'data' | 'emergency' | 'status' | 'file';
    priority: 'low' | 'normal' | 'high' | 'critical';
    payload: string;
    destination: string;
    requiresAck?: boolean;
}

interface SendResult {
    success: boolean;
    provider?: string;
    messageId?: string;
    sentAt?: Date;
    bytes?: number;
    queued?: boolean;
    queuePosition?: number;
    error?: string;
}

interface EmergencySOS {
    location: { lat: number; lng: number };
    personnelCount: number;
    situation: string;
    contactInfo?: string;
}

interface BandwidthRequest {
    requestedBytes: number;
    minimumBytes: number;
    durationMs: number;
    priority: 'normal' | 'high' | 'critical';
    purpose: string;
}

interface BandwidthAllocation {
    approved: boolean;
    allocated: number;
    validUntil?: Date;
    priority?: string;
    reason?: string;
}

interface SatelliteStatus {
    starlink: {
        connected: boolean;
        bandwidthUsed: number;
        bandwidthLimit: number;
    };
    iridium: {
        connected: boolean;
        bandwidthUsed: number;
        bandwidthLimit: number;
    };
    queuedMessages: number;
    lastCheck: Date;
}
