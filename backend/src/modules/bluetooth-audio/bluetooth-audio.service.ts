import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Bluetooth Audio Service
 * Integration protocol for PTT headsets and helmets
 * 
 * 📋 支援設備規格:
 * - Bluetooth Classic (SPP Profile) - 傳統對講機
 * - Bluetooth LE Audio - 新一代低延遲音訊
 * - 頭盔內建通訊 (如 Sena, Cardo)
 * 
 * 📋 需要的外部整合:
 * - 設備廠商 SDK (各廠商不同)
 * - WebBluetooth API (前端)
 * - React Native Bluetooth 模組 (App)
 */
@Injectable()
export class BluetoothAudioService {
    private readonly logger = new Logger(BluetoothAudioService.name);

    private connectedDevices: Map<string, BluetoothDevice> = new Map();
    private pttSessions: Map<string, PttSession> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    // ==========================================
    // 設備配對與連線
    // ==========================================

    /**
     * 取得支援的設備類型
     */
    getSupportedDevices(): DeviceProfile[] {
        return [
            {
                type: 'ptt_headset',
                name: 'PTT 藍牙耳機',
                protocols: ['SPP', 'HFP'],
                features: ['ptt_button', 'audio_in', 'audio_out'],
                brands: ['Hytera', 'Motorola', 'Kenwood'],
                // TODO: 需各廠商 SDK 規格
                sdkRequired: true,
            },
            {
                type: 'helmet_bluetooth',
                name: '安全帽藍牙',
                protocols: ['A2DP', 'HFP', 'SPP'],
                features: ['ptt_button', 'audio_in', 'audio_out', 'intercom'],
                brands: ['Sena', 'Cardo', 'Freedconn'],
                // TODO: 需 Sena/Cardo SDK
                sdkRequired: true,
            },
            {
                type: 'bone_conduction',
                name: '骨傳導耳機',
                protocols: ['A2DP', 'HFP'],
                features: ['audio_in', 'audio_out', 'ambient_sound'],
                brands: ['Shokz', 'AfterShokz'],
                sdkRequired: false,
            },
            {
                type: 'rugged_radio',
                name: '防水對講機',
                protocols: ['SPP', 'BLE'],
                features: ['ptt_button', 'audio_in', 'audio_out', 'gps'],
                brands: ['Motorola APX', 'Harris'],
                // TODO: 需各廠商專業 API
                sdkRequired: true,
            },
        ];
    }

    /**
     * 註冊設備連線
     * 前端透過 WebBluetooth/Native Bluetooth 連線後回報
     */
    registerDevice(device: DeviceRegistration): BluetoothDevice {
        const btDevice: BluetoothDevice = {
            id: `bt-${Date.now()}`,
            ...device,
            status: 'connected',
            batteryLevel: device.batteryLevel ?? null,
            signalStrength: -50, // dBm
            connectedAt: new Date(),
            lastSeen: new Date(),
        };

        this.connectedDevices.set(btDevice.id, btDevice);
        this.eventEmitter.emit('bluetooth.device.connected', btDevice);

        this.logger.log(`Bluetooth device registered: ${device.name} (${device.type})`);

        return btDevice;
    }

    /**
     * 斷開設備
     */
    disconnectDevice(deviceId: string): void {
        const device = this.connectedDevices.get(deviceId);
        if (device) {
            device.status = 'disconnected';
            this.eventEmitter.emit('bluetooth.device.disconnected', device);
        }
        this.connectedDevices.delete(deviceId);
    }

    /**
     * 取得連線設備清單
     */
    getConnectedDevices(userId?: string): BluetoothDevice[] {
        return Array.from(this.connectedDevices.values())
            .filter((d) => d.status === 'connected')
            .filter((d) => !userId || d.userId === userId);
    }

    // ==========================================
    // PTT 按鍵處理
    // ==========================================

    /**
     * 處理 PTT 按下事件
     * 從前端/App 接收 PTT 按鈕訊號
     */
    handlePttPress(deviceId: string, channelId: string): PttSession {
        const device = this.connectedDevices.get(deviceId);
        if (!device) throw new Error('Device not connected');

        const session: PttSession = {
            id: `ptt-${Date.now()}`,
            deviceId,
            userId: device.userId,
            channelId,
            status: 'transmitting',
            startedAt: new Date(),
            endedAt: null,
            duration: 0,
        };

        this.pttSessions.set(session.id, session);
        this.eventEmitter.emit('ptt.transmit.start', session);

        return session;
    }

    /**
     * 處理 PTT 釋放事件
     */
    handlePttRelease(sessionId: string): PttSession {
        const session = this.pttSessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        session.status = 'ended';
        session.endedAt = new Date();
        session.duration = (session.endedAt.getTime() - session.startedAt.getTime()) / 1000;

        this.eventEmitter.emit('ptt.transmit.end', session);

        return session;
    }

    // ==========================================
    // 音訊串流控制
    // ==========================================

    /**
     * 取得音訊串流設定
     * 供前端建立 WebRTC 或其他音訊連線
     */
    getAudioStreamConfig(deviceId: string): AudioStreamConfig {
        const device = this.connectedDevices.get(deviceId);

        return {
            // WebRTC 設定
            webrtc: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    // TODO: 設定自有 TURN Server
                    // { urls: 'turn:turn.lightkeepers.org:3478', username: '...', credential: '...' },
                ],
                audioConstraints: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000, // 適合語音
                },
            },
            // 設備特定編碼
            codec: device?.type === 'ptt_headset' ? 'opus' : 'aac',
            bitrate: 32000, // 32kbps for voice
            channels: 1, // Mono
        };
    }

    /**
     * 取得 VOX (聲控) 設定
     * 用於免按 PTT 的語音觸發
     */
    getVoxConfig(): VoxConfig {
        return {
            enabled: false, // 預設關閉
            threshold: -40, // dB, 觸發門檻
            holdTime: 500, // ms, 釋放延遲
            antiVox: true, // 防止自己聲音觸發
        };
    }

    // ==========================================
    // 設備狀態監控
    // ==========================================

    /**
     * 更新設備狀態
     * 前端定期回報
     */
    updateDeviceStatus(deviceId: string, status: DeviceStatusUpdate): void {
        const device = this.connectedDevices.get(deviceId);
        if (!device) return;

        if (status.batteryLevel !== undefined) {
            device.batteryLevel = status.batteryLevel;
        }
        if (status.signalStrength !== undefined) {
            device.signalStrength = status.signalStrength;
        }
        device.lastSeen = new Date();

        // 低電量警告
        if (device.batteryLevel != null && device.batteryLevel < 20) {
            this.eventEmitter.emit('bluetooth.device.lowBattery', device);
        }
    }

    /**
     * 取得設備健康狀態
     */
    getDeviceHealth(deviceId: string): DeviceHealth | null {
        const device = this.connectedDevices.get(deviceId);
        if (!device) return null;

        const lastSeenSeconds = (Date.now() - device.lastSeen.getTime()) / 1000;

        return {
            deviceId,
            connected: device.status === 'connected' && lastSeenSeconds < 30,
            batteryLevel: device.batteryLevel ?? null,
            signalStrength: device.signalStrength,
            signalQuality: this.getSignalQuality(device.signalStrength),
            lastSeen: device.lastSeen,
        };
    }

    private getSignalQuality(rssi: number): string {
        if (rssi > -50) return 'excellent';
        if (rssi > -60) return 'good';
        if (rssi > -70) return 'fair';
        return 'poor';
    }
}

// ==========================================
// 類型定義
// ==========================================
interface DeviceProfile {
    type: string;
    name: string;
    protocols: string[];
    features: string[];
    brands: string[];
    sdkRequired: boolean;
}

interface DeviceRegistration {
    macAddress: string;
    name: string;
    type: 'ptt_headset' | 'helmet_bluetooth' | 'bone_conduction' | 'rugged_radio' | 'other';
    userId: string;
    batteryLevel?: number | null;
}

interface BluetoothDevice extends DeviceRegistration {
    id: string;
    status: 'connected' | 'disconnected' | 'pairing';
    signalStrength: number;
    connectedAt: Date;
    lastSeen: Date;
}

interface PttSession {
    id: string;
    deviceId: string;
    userId: string;
    channelId: string;
    status: 'transmitting' | 'ended';
    startedAt: Date;
    endedAt: Date | null;
    duration: number;
}

interface AudioStreamConfig {
    webrtc: {
        iceServers: any[];
        audioConstraints: any;
    };
    codec: string;
    bitrate: number;
    channels: number;
}

interface VoxConfig {
    enabled: boolean;
    threshold: number;
    holdTime: number;
    antiVox: boolean;
}

interface DeviceStatusUpdate {
    batteryLevel?: number;
    signalStrength?: number;
}

interface DeviceHealth {
    deviceId: string;
    connected: boolean;
    batteryLevel: number | null;
    signalStrength: number;
    signalQuality: string;
    lastSeen: Date;
}
