/**
 * Anomaly Detector Service
 * 
 * Detects suspicious activities and security anomalies
 * v1.0
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface LoginAttempt {
    accountId: string;
    timestamp: Date;
    ip: string;
    userAgent: string;
    location?: { city?: string; country?: string; lat?: number; lon?: number };
    success: boolean;
}

export interface AnomalyAlert {
    id: string;
    type: AnomalyType;
    accountId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    details: Record<string, any>;
    timestamp: Date;
    resolved: boolean;
}

export enum AnomalyType {
    BRUTE_FORCE = 'brute_force',
    IMPOSSIBLE_TRAVEL = 'impossible_travel',
    UNUSUAL_TIME = 'unusual_time',
    UNUSUAL_LOCATION = 'unusual_location',
    HIGH_FREQUENCY = 'high_frequency',
    SUSPICIOUS_AGENT = 'suspicious_agent',
    PRIVILEGE_ESCALATION = 'privilege_escalation',
    DATA_EXFILTRATION = 'data_exfiltration',
}

@Injectable()
export class AnomalyDetectorService implements OnModuleInit {
    private readonly logger = new Logger(AnomalyDetectorService.name);

    // In-memory storage (use Redis/DB in production)
    private loginHistory: Map<string, LoginAttempt[]> = new Map();
    private alerts: AnomalyAlert[] = [];

    // Configuration
    private readonly config = {
        maxFailedAttempts: 5,
        failedAttemptWindow: 15 * 60 * 1000, // 15 minutes
        impossibleTravelSpeedKmH: 800, // ~airplane speed
        unusualHoursStart: 2,  // 2 AM
        unusualHoursEnd: 5,    // 5 AM
        highFrequencyThreshold: 100, // requests per minute
        suspiciousAgents: ['curl', 'wget', 'postman', 'python-requests'],
    };

    constructor(private readonly eventEmitter: EventEmitter2) { }

    onModuleInit() {
        this.logger.log('Anomaly Detector Service initialized');
    }

    /**
     * Analyze a login attempt
     */
    async analyzeLogin(attempt: LoginAttempt): Promise<AnomalyAlert[]> {
        const detectedAnomalies: AnomalyAlert[] = [];

        // Get user's login history
        const history = this.loginHistory.get(attempt.accountId) || [];

        // Check for brute force
        const bruteForce = this.checkBruteForce(attempt, history);
        if (bruteForce) detectedAnomalies.push(bruteForce);

        // Check for impossible travel
        const impossibleTravel = this.checkImpossibleTravel(attempt, history);
        if (impossibleTravel) detectedAnomalies.push(impossibleTravel);

        // Check for unusual time
        const unusualTime = this.checkUnusualTime(attempt);
        if (unusualTime) detectedAnomalies.push(unusualTime);

        // Check for suspicious user agent
        const suspiciousAgent = this.checkSuspiciousAgent(attempt);
        if (suspiciousAgent) detectedAnomalies.push(suspiciousAgent);

        // Update history
        history.push(attempt);
        // Keep only last 100 attempts
        if (history.length > 100) history.shift();
        this.loginHistory.set(attempt.accountId, history);

        // Store and emit alerts
        for (const alert of detectedAnomalies) {
            this.alerts.push(alert);
            this.eventEmitter.emit('security.anomaly', alert);
            this.logger.warn(`Anomaly detected: ${alert.type} for account ${alert.accountId}`);
        }

        return detectedAnomalies;
    }

    /**
     * Analyze API request frequency
     */
    analyzeRequestFrequency(accountId: string, requestsPerMinute: number): AnomalyAlert | null {
        if (requestsPerMinute > this.config.highFrequencyThreshold) {
            const alert = this.createAlert(
                AnomalyType.HIGH_FREQUENCY,
                accountId,
                'high',
                `異常高頻率請求: ${requestsPerMinute} 次/分鐘`,
                { requestsPerMinute },
            );
            this.alerts.push(alert);
            this.eventEmitter.emit('security.anomaly', alert);
            return alert;
        }
        return null;
    }

    /**
     * Detect privilege escalation attempts
     */
    detectPrivilegeEscalation(
        accountId: string,
        currentLevel: number,
        attemptedLevel: number,
        action: string,
    ): AnomalyAlert | null {
        if (attemptedLevel > currentLevel) {
            const alert = this.createAlert(
                AnomalyType.PRIVILEGE_ESCALATION,
                accountId,
                'critical',
                `權限提升嘗試: 從 Level ${currentLevel} 嘗試 Level ${attemptedLevel} 操作`,
                { currentLevel, attemptedLevel, action },
            );
            this.alerts.push(alert);
            this.eventEmitter.emit('security.anomaly', alert);
            return alert;
        }
        return null;
    }

    /**
     * Detect potential data exfiltration
     */
    detectDataExfiltration(
        accountId: string,
        dataSize: number,
        exportType: string,
    ): AnomalyAlert | null {
        const thresholdMB = 100;
        const sizeMB = dataSize / (1024 * 1024);

        if (sizeMB > thresholdMB) {
            const alert = this.createAlert(
                AnomalyType.DATA_EXFILTRATION,
                accountId,
                'high',
                `大量資料匯出: ${sizeMB.toFixed(2)} MB`,
                { dataSize, sizeMB, exportType },
            );
            this.alerts.push(alert);
            this.eventEmitter.emit('security.anomaly', alert);
            return alert;
        }
        return null;
    }

    /**
     * Get recent alerts
     */
    getAlerts(options?: {
        accountId?: string;
        type?: AnomalyType;
        severity?: string;
        resolved?: boolean;
        limit?: number;
    }): AnomalyAlert[] {
        let filtered = [...this.alerts];

        if (options?.accountId) {
            filtered = filtered.filter(a => a.accountId === options.accountId);
        }
        if (options?.type) {
            filtered = filtered.filter(a => a.type === options.type);
        }
        if (options?.severity) {
            filtered = filtered.filter(a => a.severity === options.severity);
        }
        if (options?.resolved !== undefined) {
            filtered = filtered.filter(a => a.resolved === options.resolved);
        }

        // Sort by timestamp descending
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return filtered.slice(0, options?.limit || 100);
    }

    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            return true;
        }
        return false;
    }

    /**
     * Get security stats
     */
    getStats(): {
        totalAlerts: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        unresolvedCount: number;
    } {
        const byType: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};

        for (const alert of this.alerts) {
            byType[alert.type] = (byType[alert.type] || 0) + 1;
            bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
        }

        return {
            totalAlerts: this.alerts.length,
            byType,
            bySeverity,
            unresolvedCount: this.alerts.filter(a => !a.resolved).length,
        };
    }

    // ===== Detection Methods =====

    private checkBruteForce(attempt: LoginAttempt, history: LoginAttempt[]): AnomalyAlert | null {
        if (attempt.success) return null;

        const windowStart = new Date(attempt.timestamp.getTime() - this.config.failedAttemptWindow);
        const recentFailed = history.filter(
            h => !h.success && h.timestamp > windowStart && h.ip === attempt.ip
        );

        if (recentFailed.length >= this.config.maxFailedAttempts) {
            return this.createAlert(
                AnomalyType.BRUTE_FORCE,
                attempt.accountId,
                'high',
                `疑似暴力破解攻擊: ${recentFailed.length + 1} 次失敗登入嘗試`,
                { failedAttempts: recentFailed.length + 1, ip: attempt.ip },
            );
        }
        return null;
    }

    private checkImpossibleTravel(attempt: LoginAttempt, history: LoginAttempt[]): AnomalyAlert | null {
        if (!attempt.location?.lat || !attempt.location?.lon) return null;

        const lastSuccess = history
            .filter(h => h.success && h.location?.lat && h.location?.lon)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        if (!lastSuccess?.location?.lat || !lastSuccess?.location?.lon) return null;

        const distance = this.calculateDistance(
            lastSuccess.location.lat,
            lastSuccess.location.lon,
            attempt.location.lat,
            attempt.location.lon,
        );

        const timeDiffHours = (attempt.timestamp.getTime() - lastSuccess.timestamp.getTime()) / (1000 * 60 * 60);
        const requiredSpeedKmH = distance / timeDiffHours;

        if (requiredSpeedKmH > this.config.impossibleTravelSpeedKmH) {
            return this.createAlert(
                AnomalyType.IMPOSSIBLE_TRAVEL,
                attempt.accountId,
                'critical',
                `不可能的移動: 在 ${timeDiffHours.toFixed(1)} 小時內從 ${lastSuccess.location.city} 到 ${attempt.location.city}`,
                {
                    from: lastSuccess.location,
                    to: attempt.location,
                    distance: Math.round(distance),
                    timeDiffHours: timeDiffHours.toFixed(2),
                    requiredSpeed: Math.round(requiredSpeedKmH),
                },
            );
        }
        return null;
    }

    private checkUnusualTime(attempt: LoginAttempt): AnomalyAlert | null {
        const hour = attempt.timestamp.getHours();

        if (hour >= this.config.unusualHoursStart && hour < this.config.unusualHoursEnd) {
            return this.createAlert(
                AnomalyType.UNUSUAL_TIME,
                attempt.accountId,
                'low',
                `異常時間登入: ${hour}:${attempt.timestamp.getMinutes().toString().padStart(2, '0')}`,
                { hour, time: attempt.timestamp.toISOString() },
            );
        }
        return null;
    }

    private checkSuspiciousAgent(attempt: LoginAttempt): AnomalyAlert | null {
        const lowerAgent = attempt.userAgent.toLowerCase();

        for (const suspicious of this.config.suspiciousAgents) {
            if (lowerAgent.includes(suspicious)) {
                return this.createAlert(
                    AnomalyType.SUSPICIOUS_AGENT,
                    attempt.accountId,
                    'medium',
                    `可疑的使用者代理: ${suspicious}`,
                    { userAgent: attempt.userAgent, detected: suspicious },
                );
            }
        }
        return null;
    }

    // ===== Helpers =====

    private createAlert(
        type: AnomalyType,
        accountId: string,
        severity: 'low' | 'medium' | 'high' | 'critical',
        description: string,
        details: Record<string, any>,
    ): AnomalyAlert {
        return {
            id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type,
            accountId,
            severity,
            description,
            details,
            timestamp: new Date(),
            resolved: false,
        };
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        // Haversine formula
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    // ===== Cleanup =====

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    cleanupOldData() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Cleanup old alerts
        const before = this.alerts.length;
        this.alerts = this.alerts.filter(a => a.timestamp > thirtyDaysAgo || !a.resolved);
        const cleaned = before - this.alerts.length;

        // Cleanup old login history
        for (const [accountId, history] of this.loginHistory) {
            const filtered = history.filter(h => h.timestamp > thirtyDaysAgo);
            if (filtered.length === 0) {
                this.loginHistory.delete(accountId);
            } else {
                this.loginHistory.set(accountId, filtered);
            }
        }

        if (cleaned > 0) {
            this.logger.log(`Cleaned up ${cleaned} old anomaly alerts`);
        }
    }
}
