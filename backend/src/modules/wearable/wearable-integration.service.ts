import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Wearable Integration Service
 * Health monitoring integration with Garmin, Fitbit, Apple Watch
 */
@Injectable()
export class WearableIntegrationService {
    private readonly logger = new Logger(WearableIntegrationService.name);

    // Connected devices per user
    private userDevices: Map<string, WearableDevice[]> = new Map();

    // Real-time health data
    private healthData: Map<string, HealthMetrics> = new Map();

    // Alert thresholds
    private readonly THRESHOLDS = {
        heartRateHigh: 180,
        heartRateLow: 40,
        oxygenLow: 90,
        stressHigh: 80,
        bodyTempHigh: 38.5,
        bodyTempLow: 35.0,
    };

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Connect wearable device for user
     */
    async connectDevice(userId: string, device: DeviceConnection): Promise<ConnectionResult> {
        const existingDevices = this.userDevices.get(userId) || [];

        // Validate OAuth token with provider
        const validated = await this.validateProviderToken(device.provider, device.accessToken);

        if (!validated) {
            return { success: false, error: 'Invalid access token' };
        }

        const wearableDevice: WearableDevice = {
            id: `device-${Date.now()}`,
            userId,
            provider: device.provider,
            model: device.model || 'Unknown',
            accessToken: device.accessToken,
            refreshToken: device.refreshToken,
            connectedAt: new Date(),
            lastSync: null,
            batteryLevel: null,
            capabilities: this.getProviderCapabilities(device.provider),
        };

        existingDevices.push(wearableDevice);
        this.userDevices.set(userId, existingDevices);

        this.logger.log(`Device connected for user ${userId}: ${device.provider}`);

        // Start syncing health data
        this.startHealthSync(userId, wearableDevice);

        return { success: true, deviceId: wearableDevice.id };
    }

    /**
     * Get current health metrics for user
     */
    getHealthMetrics(userId: string): HealthMetrics | null {
        return this.healthData.get(userId) || null;
    }

    /**
     * Get all personnel health status (for incident commander)
     */
    getAllPersonnelHealth(): PersonnelHealth[] {
        const personnel: PersonnelHealth[] = [];

        this.healthData.forEach((metrics, odataUserId) => {
            const status = this.evaluateHealthStatus(metrics);
            personnel.push({
                userId: odataUserId,
                metrics,
                status,
                lastUpdate: metrics.timestamp,
            });
        });

        return personnel.sort((a, b) => {
            const priority = { critical: 0, warning: 1, normal: 2, unknown: 3 };
            return priority[a.status] - priority[b.status];
        });
    }

    /**
     * Sync health data from provider
     */
    async syncHealthData(userId: string): Promise<HealthMetrics | null> {
        const devices = this.userDevices.get(userId);
        if (!devices || devices.length === 0) {
            return null;
        }

        const primaryDevice = devices[0];

        try {
            const data = await this.fetchProviderData(primaryDevice);

            const metrics: HealthMetrics = {
                userId,
                deviceId: primaryDevice.id,
                timestamp: new Date(),
                heartRate: data.heartRate,
                heartRateVariability: data.hrv,
                stepCount: data.steps,
                caloriesBurned: data.calories,
                activeMinutes: data.activeMinutes,
                oxygenSaturation: data.spo2,
                stressLevel: data.stress,
                bodyTemperature: data.bodyTemp,
                sleepData: data.sleep,
                location: data.location,
            };

            this.healthData.set(userId, metrics);
            primaryDevice.lastSync = new Date();

            // Check for alerts
            this.checkHealthAlerts(metrics);

            return metrics;
        } catch (error) {
            this.logger.error(`Failed to sync health data for user ${userId}`, error);
            return null;
        }
    }

    /**
     * Detect fall or impact
     */
    async handleFallDetection(userId: string, event: FallEvent): Promise<void> {
        this.logger.warn(`Fall detected for user ${userId}`);

        this.eventEmitter.emit('wearable.fall.detected', {
            userId,
            timestamp: new Date(),
            impact: event.impactForce,
            location: event.location,
        });

        // Check if user responds within 60 seconds
        setTimeout(() => {
            const metrics = this.healthData.get(userId);
            if (metrics && !event.userResponded) {
                this.eventEmitter.emit('wearable.fall.unresponsive', {
                    userId,
                    lastKnownLocation: event.location,
                    lastHeartRate: metrics.heartRate,
                });
            }
        }, 60000);
    }

    /**
     * Get fatigue analysis for personnel
     */
    getFatigueAnalysis(userId: string): FatigueAnalysis | null {
        const metrics = this.healthData.get(userId);
        if (!metrics) {
            return null;
        }

        const { heartRateVariability, sleepData, activeMinutes } = metrics;

        // Calculate fatigue score (0-100, higher = more fatigued)
        let fatigueScore = 0;

        // Poor HRV indicates fatigue
        if (heartRateVariability && heartRateVariability < 30) {
            fatigueScore += 30;
        }

        // Insufficient sleep
        if (sleepData && sleepData.totalMinutes < 360) {
            fatigueScore += 25;
        }

        // Extended activity without rest
        if (activeMinutes && activeMinutes > 480) {
            fatigueScore += 20;
        }

        // High sustained heart rate
        if (metrics.heartRate && metrics.heartRate > 100) {
            fatigueScore += 15;
        }

        return {
            userId,
            score: Math.min(fatigueScore, 100),
            level: fatigueScore > 70 ? 'high' : fatigueScore > 40 ? 'moderate' : 'low',
            recommendations: this.getFatigueRecommendations(fatigueScore),
            timestamp: new Date(),
        };
    }

    // Private methods
    private async validateProviderToken(provider: string, token: string): Promise<boolean> {
        // Simulate token validation
        return token.length > 10;
    }

    private getProviderCapabilities(provider: string): string[] {
        const capabilities: Record<string, string[]> = {
            garmin: ['heart_rate', 'hrv', 'steps', 'calories', 'stress', 'spo2', 'body_temp', 'sleep', 'gps'],
            fitbit: ['heart_rate', 'steps', 'calories', 'spo2', 'sleep', 'stress'],
            apple: ['heart_rate', 'hrv', 'steps', 'calories', 'spo2', 'fall_detection', 'ecg'],
            samsung: ['heart_rate', 'steps', 'calories', 'spo2', 'stress', 'sleep'],
        };
        return capabilities[provider] || ['heart_rate', 'steps'];
    }

    private startHealthSync(userId: string, device: WearableDevice): void {
        // Sync every 30 seconds
        setInterval(() => {
            this.syncHealthData(userId);
        }, 30000);
    }

    private async fetchProviderData(device: WearableDevice): Promise<any> {
        // Simulate fetching data from provider API
        return {
            heartRate: 70 + Math.floor(Math.random() * 30),
            hrv: 40 + Math.floor(Math.random() * 30),
            steps: Math.floor(Math.random() * 10000),
            calories: 1500 + Math.floor(Math.random() * 1000),
            activeMinutes: Math.floor(Math.random() * 180),
            spo2: 95 + Math.floor(Math.random() * 5),
            stress: Math.floor(Math.random() * 100),
            bodyTemp: 36.5 + Math.random(),
            sleep: {
                totalMinutes: 360 + Math.floor(Math.random() * 120),
                deepMinutes: 60 + Math.floor(Math.random() * 60),
                remMinutes: 90 + Math.floor(Math.random() * 30),
            },
            location: null,
        };
    }

    private checkHealthAlerts(metrics: HealthMetrics): void {
        const alerts: string[] = [];

        if (metrics.heartRate) {
            if (metrics.heartRate > this.THRESHOLDS.heartRateHigh) {
                alerts.push('heart_rate_high');
            }
            if (metrics.heartRate < this.THRESHOLDS.heartRateLow) {
                alerts.push('heart_rate_low');
            }
        }

        if (metrics.oxygenSaturation && metrics.oxygenSaturation < this.THRESHOLDS.oxygenLow) {
            alerts.push('oxygen_low');
        }

        if (metrics.stressLevel && metrics.stressLevel > this.THRESHOLDS.stressHigh) {
            alerts.push('stress_high');
        }

        if (metrics.bodyTemperature) {
            if (metrics.bodyTemperature > this.THRESHOLDS.bodyTempHigh) {
                alerts.push('body_temp_high');
            }
            if (metrics.bodyTemperature < this.THRESHOLDS.bodyTempLow) {
                alerts.push('body_temp_low');
            }
        }

        if (alerts.length > 0) {
            this.eventEmitter.emit('wearable.health.alert', {
                userId: metrics.userId,
                alerts,
                metrics,
                timestamp: new Date(),
            });
        }
    }

    private evaluateHealthStatus(metrics: HealthMetrics): 'normal' | 'warning' | 'critical' | 'unknown' {
        if (!metrics.heartRate) return 'unknown';

        if (
            metrics.heartRate > this.THRESHOLDS.heartRateHigh ||
            metrics.heartRate < this.THRESHOLDS.heartRateLow ||
            (metrics.oxygenSaturation && metrics.oxygenSaturation < 85)
        ) {
            return 'critical';
        }

        if (
            (metrics.oxygenSaturation && metrics.oxygenSaturation < this.THRESHOLDS.oxygenLow) ||
            (metrics.stressLevel && metrics.stressLevel > this.THRESHOLDS.stressHigh)
        ) {
            return 'warning';
        }

        return 'normal';
    }

    private getFatigueRecommendations(score: number): string[] {
        if (score > 70) {
            return [
                'Immediate rest recommended',
                'Consider rotation to support role',
                'Hydration and nutrition check',
            ];
        }
        if (score > 40) {
            return [
                'Schedule break within 1 hour',
                'Monitor for signs of exhaustion',
            ];
        }
        return ['Continue current activity'];
    }
}

// Type definitions
interface WearableDevice {
    id: string;
    userId: string;
    provider: string;
    model: string;
    accessToken: string;
    refreshToken?: string;
    connectedAt: Date;
    lastSync: Date | null;
    batteryLevel: number | null;
    capabilities: string[];
}

interface DeviceConnection {
    provider: 'garmin' | 'fitbit' | 'apple' | 'samsung';
    model?: string;
    accessToken: string;
    refreshToken?: string;
}

interface ConnectionResult {
    success: boolean;
    deviceId?: string;
    error?: string;
}

interface HealthMetrics {
    userId: string;
    deviceId: string;
    timestamp: Date;
    heartRate?: number;
    heartRateVariability?: number;
    stepCount?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
    oxygenSaturation?: number;
    stressLevel?: number;
    bodyTemperature?: number;
    sleepData?: {
        totalMinutes: number;
        deepMinutes: number;
        remMinutes: number;
    };
    location?: { lat: number; lng: number } | null;
}

interface PersonnelHealth {
    userId: string;
    metrics: HealthMetrics;
    status: 'normal' | 'warning' | 'critical' | 'unknown';
    lastUpdate: Date;
}

interface FallEvent {
    impactForce: number;
    location?: { lat: number; lng: number };
    userResponded?: boolean;
}

interface FatigueAnalysis {
    userId: string;
    score: number;
    level: 'low' | 'moderate' | 'high';
    recommendations: string[];
    timestamp: Date;
}
