/**
 * BLE Beacon Hardware Service - 藍牙信標硬體連接
 * 透過 noble 或 Web Bluetooth 連接實體 BLE Beacon
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface BleBeacon {
    uuid: string;
    major: number;
    minor: number;
    name?: string;
    rssi: number;
    txPower?: number;
    distance?: number;
    lastSeen: Date;
}

export interface BleAdapter {
    id: string;
    name: string;
    address: string;
    powered: boolean;
    scanning: boolean;
}

export interface BeaconScanResult {
    beacon: BleBeacon;
    estimatedDistance: number;
    zone?: string;
}

// ============ Service ============

@Injectable()
export class BleBeaconHardwareService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BleBeaconHardwareService.name);

    // Beacon storage
    private beacons: Map<string, BleBeacon> = new Map();
    private knownBeacons: Map<string, { name: string; location: { x: number; y: number; floor: number } }> = new Map();

    // Scanning state
    private isScanning = false;
    private scanInterval: NodeJS.Timeout | null = null;

    // Configuration
    private scanDuration: number;
    private rssiThreshold: number;
    private txPowerReference: number;
    private pathLossExponent: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.scanDuration = this.configService.get<number>('BLE_SCAN_DURATION', 5000);
        this.rssiThreshold = this.configService.get<number>('BLE_RSSI_THRESHOLD', -100);
        this.txPowerReference = this.configService.get<number>('BLE_TX_POWER_REF', -59);
        this.pathLossExponent = this.configService.get<number>('BLE_PATH_LOSS_EXP', 2.0);
    }

    async onModuleInit() {
        this.logger.log('BLE Beacon Hardware Service initialized');
        this.loadKnownBeacons();
    }

    async onModuleDestroy() {
        await this.stopScanning();
    }

    // ==================== Beacon Configuration ====================

    /**
     * 載入已知信標位置
     */
    private loadKnownBeacons(): void {
        // In production, load from database
        // For now, initialize empty
        this.logger.log('Known beacons loaded');
    }

    /**
     * 註冊已知信標
     */
    registerBeacon(uuid: string, major: number, minor: number, name: string, location: { x: number; y: number; floor: number }): void {
        const key = `${uuid}-${major}-${minor}`;
        this.knownBeacons.set(key, { name, location });
        this.logger.log(`Registered beacon: ${name} at floor ${location.floor}`);
    }

    /**
     * 取得已註冊信標
     */
    getRegisteredBeacons(): Array<{ uuid: string; major: number; minor: number; name: string; location: any }> {
        return Array.from(this.knownBeacons.entries()).map(([key, value]) => {
            const [uuid, major, minor] = key.split('-');
            return { uuid, major: parseInt(major), minor: parseInt(minor), ...value };
        });
    }

    // ==================== Scanning ====================

    /**
     * 開始掃描
     */
    async startScanning(): Promise<void> {
        if (this.isScanning) {
            this.logger.warn('Already scanning');
            return;
        }

        try {
            // In production, use noble:
            // const noble = await import('@abandonware/noble');
            // noble.on('discover', (peripheral) => this.handleDiscovery(peripheral));
            // await noble.startScanningAsync([], true);

            this.isScanning = true;
            this.logger.log('BLE scanning started');

            // Simulate scan results for development
            this.scanInterval = setInterval(() => {
                this.simulateScan();
            }, this.scanDuration);

        } catch (error) {
            this.logger.error(`Failed to start scanning: ${error}`);
            throw error;
        }
    }

    /**
     * 停止掃描
     */
    async stopScanning(): Promise<void> {
        if (!this.isScanning) return;

        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        // In production:
        // const noble = await import('@abandonware/noble');
        // await noble.stopScanningAsync();

        this.isScanning = false;
        this.logger.log('BLE scanning stopped');
    }

    /**
     * 模擬掃描結果 (開發用)
     */
    private simulateScan(): void {
        // Emit event for development/testing
        this.eventEmitter.emit('ble.scan.result', {
            beacons: Array.from(this.beacons.values()),
            timestamp: new Date(),
        });
    }

    // ==================== Discovery Handling ====================

    /**
     * 處理發現的設備
     */
    handleDiscovery(peripheral: any): void {
        const manufacturerData = peripheral.advertisement?.manufacturerData;
        if (!manufacturerData) return;

        // Parse iBeacon format
        const beacon = this.parseIBeacon(manufacturerData, peripheral.rssi);
        if (!beacon) return;

        // Update beacon info
        this.beacons.set(`${beacon.uuid}-${beacon.major}-${beacon.minor}`, beacon);

        // Calculate distance
        const distance = this.calculateDistance(beacon.rssi, beacon.txPower || this.txPowerReference);

        // Emit event
        this.eventEmitter.emit('ble.beacon.detected', {
            beacon,
            distance,
            known: this.knownBeacons.has(`${beacon.uuid}-${beacon.major}-${beacon.minor}`),
        });
    }

    /**
     * 解析 iBeacon 格式
     */
    private parseIBeacon(data: Buffer, rssi: number): BleBeacon | null {
        // iBeacon format validation
        if (data.length < 23) return null;
        if (data.readUInt16BE(0) !== 0x004c) return null; // Apple Company ID
        if (data.readUInt8(2) !== 0x02) return null; // iBeacon type
        if (data.readUInt8(3) !== 0x15) return null; // Data length

        const uuid = [
            data.slice(4, 8).toString('hex'),
            data.slice(8, 10).toString('hex'),
            data.slice(10, 12).toString('hex'),
            data.slice(12, 14).toString('hex'),
            data.slice(14, 20).toString('hex'),
        ].join('-');

        const major = data.readUInt16BE(20);
        const minor = data.readUInt16BE(22);
        const txPower = data.readInt8(24);

        return {
            uuid,
            major,
            minor,
            rssi,
            txPower,
            distance: this.calculateDistance(rssi, txPower),
            lastSeen: new Date(),
        };
    }

    // ==================== Distance Calculation ====================

    /**
     * 計算距離 (基於 RSSI)
     */
    calculateDistance(rssi: number, txPower: number): number {
        if (rssi === 0) return -1;

        // Log-distance path loss model
        const ratio = rssi / txPower;
        if (ratio < 1.0) {
            return Math.pow(ratio, 10);
        } else {
            return (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
        }
    }

    /**
     * 三邊定位
     */
    trilaterate(readings: Array<{ beacon: BleBeacon; distance: number }>): { x: number; y: number } | null {
        const knownReadings = readings.filter(r => {
            const key = `${r.beacon.uuid}-${r.beacon.major}-${r.beacon.minor}`;
            return this.knownBeacons.has(key);
        }).slice(0, 3);

        if (knownReadings.length < 3) return null;

        // Get beacon positions
        const positions = knownReadings.map(r => {
            const key = `${r.beacon.uuid}-${r.beacon.major}-${r.beacon.minor}`;
            return {
                ...this.knownBeacons.get(key)!.location,
                distance: r.distance,
            };
        });

        // Weighted centroid method
        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;

        for (const pos of positions) {
            const weight = 1 / (pos.distance * pos.distance + 0.001);
            weightedX += pos.x * weight;
            weightedY += pos.y * weight;
            totalWeight += weight;
        }

        return {
            x: weightedX / totalWeight,
            y: weightedY / totalWeight,
        };
    }

    // ==================== Query ====================

    /**
     * 取得附近信標
     */
    getNearbyBeacons(): BleBeacon[] {
        const now = Date.now();
        const staleThreshold = 30000; // 30 seconds

        return Array.from(this.beacons.values())
            .filter(b => now - b.lastSeen.getTime() < staleThreshold)
            .sort((a, b) => a.rssi - b.rssi);
    }

    /**
     * 取得掃描狀態
     */
    getScanningStatus(): { isScanning: boolean; beaconCount: number } {
        return {
            isScanning: this.isScanning,
            beaconCount: this.beacons.size,
        };
    }
}
