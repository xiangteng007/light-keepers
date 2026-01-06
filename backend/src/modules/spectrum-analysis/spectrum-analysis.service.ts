/**
 * Spectrum Analysis Service
 * Phase 6.3: 頻譜情報 (SDR Scanning)
 * 
 * 功能:
 * 1. RF 信號偵測
 * 2. 干擾源識別
 * 3. 通訊品質評估
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export enum SignalType {
    UNKNOWN = 'UNKNOWN',
    RADIO_FM = 'RADIO_FM',
    RADIO_AM = 'RADIO_AM',
    CELLULAR_4G = 'CELLULAR_4G',
    CELLULAR_5G = 'CELLULAR_5G',
    WIFI_24 = 'WIFI_24',
    WIFI_5 = 'WIFI_5',
    BLUETOOTH = 'BLUETOOTH',
    LORA = 'LORA',
    PMR446 = 'PMR446',
    VHF = 'VHF',
    UHF = 'UHF',
    INTERFERENCE = 'INTERFERENCE',
    JAMMER = 'JAMMER',
}

export interface SignalDetection {
    id: string;
    timestamp: Date;
    frequency: number; // MHz
    bandwidth?: number; // kHz
    signalStrength: number; // dBm
    type: SignalType;
    location?: { lat: number; lng: number };
    sourceId?: string; // Drone ID or scanner ID
    confidence: number; // 0-100
    metadata?: {
        modulation?: string;
        ssid?: string;
        macAddress?: string;
        direction?: number; // degrees
        classification?: string;
    };
}

export interface FrequencyRange {
    id: string;
    name: string;
    startMhz: number;
    endMhz: number;
    description?: string;
    isProtected: boolean; // Alert if activity detected
}

export interface SpectrumSweep {
    scannerId: string;
    timestamp: Date;
    startFreq: number;
    endFreq: number;
    stepSize: number; // kHz
    samples: { freq: number; power: number }[];
    location?: { lat: number; lng: number };
}

export interface JammerAlert {
    id: string;
    timestamp: Date;
    frequency: number;
    signalStrength: number;
    affectedServices: string[];
    location?: { lat: number; lng: number };
    severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============ Service ============

@Injectable()
export class SpectrumAnalysisService {
    private readonly logger = new Logger(SpectrumAnalysisService.name);

    // In-memory storage
    private detections: SignalDetection[] = [];
    private sweeps: SpectrumSweep[] = [];
    private monitoredRanges: FrequencyRange[] = [];

    // Frequency allocations (simplified Taiwan allocations)
    private readonly knownFrequencies: { range: [number, number]; type: SignalType; name: string }[] = [
        { range: [87.5, 108], type: SignalType.RADIO_FM, name: 'FM Radio' },
        { range: [410, 430], type: SignalType.PMR446, name: 'PMR446' },
        { range: [433, 436], type: SignalType.LORA, name: 'ISM 433MHz' },
        { range: [700, 780], type: SignalType.CELLULAR_4G, name: 'LTE Band 28' },
        { range: [880, 960], type: SignalType.CELLULAR_4G, name: 'GSM 900' },
        { range: [1800, 1880], type: SignalType.CELLULAR_4G, name: 'LTE Band 3' },
        { range: [2400, 2483.5], type: SignalType.WIFI_24, name: 'WiFi 2.4GHz' },
        { range: [2500, 2690], type: SignalType.CELLULAR_4G, name: 'LTE Band 7' },
        { range: [3300, 3600], type: SignalType.CELLULAR_5G, name: '5G n78' },
        { range: [5150, 5850], type: SignalType.WIFI_5, name: 'WiFi 5GHz' },
    ];

    constructor(private readonly eventEmitter: EventEmitter2) { }

    // ==================== Signal Detection ====================

    /**
     * 處理信號偵測
     */
    processDetection(detection: Omit<SignalDetection, 'id' | 'type'>): SignalDetection {
        const type = this.identifySignalType(detection.frequency);
        const id = `sig-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const signal: SignalDetection = {
            ...detection,
            id,
            type,
        };

        this.detections.push(signal);
        if (this.detections.length > 50000) {
            this.detections = this.detections.slice(-25000);
        }

        // Check for anomalies
        this.checkForAnomalies(signal);

        this.eventEmitter.emit('spectrum.detection', signal);
        return signal;
    }

    /**
     * 識別信號類型
     */
    private identifySignalType(freqMhz: number): SignalType {
        for (const known of this.knownFrequencies) {
            if (freqMhz >= known.range[0] && freqMhz <= known.range[1]) {
                return known.type;
            }
        }
        return SignalType.UNKNOWN;
    }

    // ==================== Spectrum Sweep ====================

    /**
     * 處理頻譜掃描資料
     */
    processSweep(sweep: SpectrumSweep): void {
        this.sweeps.push(sweep);
        if (this.sweeps.length > 1000) {
            this.sweeps = this.sweeps.slice(-500);
        }

        // Analyze sweep for strong signals
        const peaks = this.findPeaks(sweep.samples, -70); // threshold in dBm
        for (const peak of peaks) {
            this.processDetection({
                timestamp: sweep.timestamp,
                frequency: peak.freq,
                signalStrength: peak.power,
                location: sweep.location,
                sourceId: sweep.scannerId,
                confidence: 80,
            });
        }

        this.eventEmitter.emit('spectrum.sweep', sweep);
    }

    /**
     * 找出頻譜中的峰值
     */
    private findPeaks(samples: { freq: number; power: number }[], threshold: number): { freq: number; power: number }[] {
        const peaks: { freq: number; power: number }[] = [];

        for (let i = 1; i < samples.length - 1; i++) {
            const current = samples[i];
            if (
                current.power > threshold &&
                current.power > samples[i - 1].power &&
                current.power > samples[i + 1].power
            ) {
                peaks.push(current);
            }
        }

        return peaks;
    }

    // ==================== Anomaly Detection ====================

    /**
     * 檢查異常信號
     */
    private checkForAnomalies(signal: SignalDetection): void {
        // Check for protected frequency range
        for (const range of this.monitoredRanges) {
            if (
                signal.frequency >= range.startMhz &&
                signal.frequency <= range.endMhz &&
                range.isProtected
            ) {
                this.logger.warn(`Signal in protected range: ${signal.frequency} MHz in ${range.name}`);
                this.eventEmitter.emit('spectrum.protectedRange', { signal, range });
            }
        }

        // Check for potential jammer (strong wideband signal)
        if (signal.signalStrength > -30 && signal.bandwidth && signal.bandwidth > 1000) {
            const alert: JammerAlert = {
                id: `jammer-${Date.now()}`,
                timestamp: signal.timestamp,
                frequency: signal.frequency,
                signalStrength: signal.signalStrength,
                affectedServices: this.getAffectedServices(signal.frequency, signal.bandwidth || 0),
                location: signal.location,
                severity: signal.signalStrength > -10 ? 'critical' : 'high',
            };

            this.logger.error(`JAMMER DETECTED: ${signal.frequency} MHz @ ${signal.signalStrength} dBm`);
            this.eventEmitter.emit('spectrum.jammerAlert', alert);
        }
    }

    /**
     * 取得受影響的服務
     */
    private getAffectedServices(centerFreq: number, bandwidth: number): string[] {
        const affected: string[] = [];
        const startFreq = centerFreq - bandwidth / 2000;
        const endFreq = centerFreq + bandwidth / 2000;

        for (const known of this.knownFrequencies) {
            if (
                (startFreq <= known.range[1] && endFreq >= known.range[0])
            ) {
                affected.push(known.name);
            }
        }

        return affected;
    }

    // ==================== Query ====================

    getDetections(options?: {
        minFreq?: number;
        maxFreq?: number;
        type?: SignalType;
        limit?: number;
    }): SignalDetection[] {
        let filtered = this.detections;

        if (options?.minFreq) {
            filtered = filtered.filter(d => d.frequency >= options.minFreq!);
        }
        if (options?.maxFreq) {
            filtered = filtered.filter(d => d.frequency <= options.maxFreq!);
        }
        if (options?.type) {
            filtered = filtered.filter(d => d.type === options.type);
        }

        return filtered.slice(-(options?.limit || 100));
    }

    getLatestSweep(scannerId?: string): SpectrumSweep | undefined {
        if (scannerId) {
            return [...this.sweeps].reverse().find(s => s.scannerId === scannerId);
        }
        return this.sweeps[this.sweeps.length - 1];
    }

    // ==================== Monitoring ====================

    addMonitoredRange(range: FrequencyRange): void {
        this.monitoredRanges.push(range);
        this.logger.log(`Added monitored range: ${range.name} (${range.startMhz}-${range.endMhz} MHz)`);
    }

    removeMonitoredRange(rangeId: string): boolean {
        const index = this.monitoredRanges.findIndex(r => r.id === rangeId);
        if (index >= 0) {
            this.monitoredRanges.splice(index, 1);
            return true;
        }
        return false;
    }

    getMonitoredRanges(): FrequencyRange[] {
        return [...this.monitoredRanges];
    }
}
