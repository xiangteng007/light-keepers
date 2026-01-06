/**
 * SDR (Software Defined Radio) Hardware Service - SDR 硬體連接
 * 透過 rtl-sdr 或 SoapySDR 連接 RTL-SDR/HackRF 設備
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface SdrDevice {
    id: string;
    name: string;
    type: 'rtl-sdr' | 'hackrf' | 'soapy';
    serial?: string;
    connected: boolean;
    centerFrequency?: number;
    sampleRate?: number;
    gain?: number;
}

export interface SpectrumSample {
    frequency: number;
    power: number; // dBm
    timestamp: Date;
}

export interface SignalDetection {
    id: string;
    centerFrequency: number;
    bandwidth: number;
    peakPower: number;
    signalType?: 'wifi' | 'drone' | 'radio' | 'unknown';
    confidence: number;
    timestamp: Date;
}

export interface SweepConfig {
    startFrequency: number; // Hz
    endFrequency: number;   // Hz
    stepSize: number;       // Hz
    dwellTime: number;      // ms
}

// ============ Service ============

@Injectable()
export class SdrHardwareService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SdrHardwareService.name);

    // Device management
    private devices: Map<string, SdrDevice> = new Map();
    private activeDevice: SdrDevice | null = null;

    // Scanning state
    private isScanning = false;
    private sweepInterval: NodeJS.Timeout | null = null;

    // Detection
    private detections: SignalDetection[] = [];
    private spectrumBuffer: SpectrumSample[] = [];

    // Configuration
    private defaultGain: number;
    private defaultSampleRate: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.defaultGain = this.configService.get<number>('SDR_DEFAULT_GAIN', 40);
        this.defaultSampleRate = this.configService.get<number>('SDR_SAMPLE_RATE', 2400000);
    }

    async onModuleInit() {
        this.logger.log('SDR Hardware Service initialized');
        await this.scanForDevices();
    }

    async onModuleDestroy() {
        await this.stopSweep();
        await this.disconnectAll();
    }

    // ==================== Device Management ====================

    /**
     * 掃描可用設備
     */
    async scanForDevices(): Promise<SdrDevice[]> {
        try {
            // In production, use rtl-sdr:
            // const rtlsdr = await import('rtl-sdr');
            // const deviceCount = rtlsdr.get_device_count();

            // Simulated device discovery
            this.logger.log('Scanning for SDR devices...');

            // Check if any RTL-SDR devices exist (placeholder)
            const foundDevices: SdrDevice[] = [];

            // Update device list
            foundDevices.forEach(d => this.devices.set(d.id, d));

            return foundDevices;
        } catch (error) {
            this.logger.error(`Failed to scan for devices: ${error}`);
            return [];
        }
    }

    /**
     * 連接設備
     */
    async connect(deviceId: string): Promise<SdrDevice> {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }

        try {
            // In production:
            // const rtlsdr = await import('rtl-sdr');
            // const dev = rtlsdr.open(deviceIndex);
            // rtlsdr.set_sample_rate(dev, this.defaultSampleRate);
            // rtlsdr.set_tuner_gain_mode(dev, 1);
            // rtlsdr.set_tuner_gain(dev, this.defaultGain * 10);

            device.connected = true;
            device.sampleRate = this.defaultSampleRate;
            device.gain = this.defaultGain;
            this.activeDevice = device;

            this.logger.log(`Connected to SDR device: ${device.name}`);
            return device;
        } catch (error) {
            this.logger.error(`Failed to connect to ${deviceId}: ${error}`);
            throw error;
        }
    }

    /**
     * 中斷連接
     */
    async disconnect(deviceId: string): Promise<void> {
        const device = this.devices.get(deviceId);
        if (device) {
            device.connected = false;
            if (this.activeDevice?.id === deviceId) {
                this.activeDevice = null;
            }
        }
        this.logger.log(`Disconnected from SDR device: ${deviceId}`);
    }

    /**
     * 中斷所有連接
     */
    async disconnectAll(): Promise<void> {
        for (const device of this.devices.values()) {
            if (device.connected) {
                await this.disconnect(device.id);
            }
        }
    }

    // ==================== Frequency Control ====================

    /**
     * 設定中心頻率
     */
    async setCenterFrequency(frequency: number): Promise<void> {
        if (!this.activeDevice) {
            throw new Error('No active device');
        }

        // In production:
        // rtlsdr.set_center_freq(dev, frequency);

        this.activeDevice.centerFrequency = frequency;
        this.logger.log(`Center frequency set to ${frequency / 1e6} MHz`);
    }

    /**
     * 設定增益
     */
    async setGain(gain: number): Promise<void> {
        if (!this.activeDevice) {
            throw new Error('No active device');
        }

        this.activeDevice.gain = gain;
        this.logger.log(`Gain set to ${gain} dB`);
    }

    // ==================== Spectrum Sweep ====================

    /**
     * 開始頻譜掃描
     */
    async startSweep(config: SweepConfig): Promise<void> {
        if (this.isScanning) {
            await this.stopSweep();
        }

        this.isScanning = true;
        this.spectrumBuffer = [];

        const sweepStep = async () => {
            for (let freq = config.startFrequency; freq <= config.endFrequency; freq += config.stepSize) {
                if (!this.isScanning) break;

                await this.setCenterFrequency(freq);
                await this.sleep(config.dwellTime);

                // Read samples and calculate power
                const power = await this.measurePower();

                const sample: SpectrumSample = {
                    frequency: freq,
                    power,
                    timestamp: new Date(),
                };

                this.spectrumBuffer.push(sample);

                // Detect signals
                if (power > -60) {
                    await this.detectSignal(freq, power);
                }
            }

            // Emit sweep complete
            this.eventEmitter.emit('sdr.sweep.complete', {
                samples: this.spectrumBuffer,
                detections: this.detections.slice(-10),
            });

            this.spectrumBuffer = [];
        };

        // Start periodic sweep
        this.sweepInterval = setInterval(sweepStep,
            (config.endFrequency - config.startFrequency) / config.stepSize * config.dwellTime + 1000);

        await sweepStep(); // Initial sweep
    }

    /**
     * 停止掃描
     */
    async stopSweep(): Promise<void> {
        this.isScanning = false;
        if (this.sweepInterval) {
            clearInterval(this.sweepInterval);
            this.sweepInterval = null;
        }
    }

    // ==================== Signal Detection ====================

    /**
     * 測量功率
     */
    private async measurePower(): Promise<number> {
        // In production, read IQ samples and calculate power
        // const samples = await rtlsdr.read_sync(dev, bufferSize);
        // const power = calculatePower(samples);

        // Simulated noise floor
        return -100 + Math.random() * 40;
    }

    /**
     * 偵測信號
     */
    private async detectSignal(frequency: number, power: number): Promise<void> {
        // Classify signal based on frequency
        let signalType: 'wifi' | 'drone' | 'radio' | 'unknown' = 'unknown';

        if (frequency >= 2.4e9 && frequency <= 2.5e9) {
            signalType = 'wifi';
        } else if (frequency >= 5.7e9 && frequency <= 5.9e9) {
            signalType = 'drone';
        } else if (frequency >= 137e6 && frequency <= 174e6) {
            signalType = 'radio';
        }

        const detection: SignalDetection = {
            id: `det-${Date.now()}`,
            centerFrequency: frequency,
            bandwidth: 200000,
            peakPower: power,
            signalType,
            confidence: power > -40 ? 0.9 : 0.6,
            timestamp: new Date(),
        };

        this.detections.push(detection);
        if (this.detections.length > 1000) {
            this.detections = this.detections.slice(-500);
        }

        this.eventEmitter.emit('sdr.signal.detected', detection);
    }

    // ==================== Drone Detection ====================

    /**
     * 掃描無人機頻率
     */
    async scanDroneFrequencies(): Promise<SignalDetection[]> {
        // Common drone frequencies
        const droneFreqs = [
            { start: 2.4e9, end: 2.5e9, name: '2.4GHz' },
            { start: 5.7e9, end: 5.9e9, name: '5.8GHz' },
        ];

        const detections: SignalDetection[] = [];

        for (const band of droneFreqs) {
            await this.startSweep({
                startFrequency: band.start,
                endFrequency: band.end,
                stepSize: 1e6,
                dwellTime: 50,
            });

            // Wait for sweep
            await this.sleep(5000);
            await this.stopSweep();

            detections.push(...this.detections.filter(d => d.signalType === 'drone'));
        }

        return detections;
    }

    // ==================== Query ====================

    /**
     * 取得設備列表
     */
    getDevices(): SdrDevice[] {
        return Array.from(this.devices.values());
    }

    /**
     * 取得最近偵測
     */
    getRecentDetections(limit: number = 50): SignalDetection[] {
        return this.detections.slice(-limit);
    }

    /**
     * 取得頻譜資料
     */
    getSpectrumData(): SpectrumSample[] {
        return this.spectrumBuffer;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
