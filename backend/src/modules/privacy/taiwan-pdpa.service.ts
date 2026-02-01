/**
 * Taiwan PDPA Compliance Service
 * 台灣個人資料保護法合規服務
 * 
 * P2 合規治理：實作台灣個資法要求
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 資料類別
 */
export enum DataCategory {
    GENERAL = 'general',          // 一般個資
    SENSITIVE = 'sensitive',      // 特種個資 (醫療、犯罪、基因等)
    MINOR = 'minor',              // 未成年人資料
    BIOMETRIC = 'biometric',      // 生物特徵
}

/**
 * 同意狀態
 */
export enum ConsentStatus {
    PENDING = 'pending',
    GRANTED = 'granted',
    REVOKED = 'revoked',
    EXPIRED = 'expired',
}

/**
 * 同意記錄
 */
export interface ConsentRecord {
    id: string;
    userId: string;
    dataCategory: DataCategory;
    purpose: string;
    status: ConsentStatus;
    grantedAt?: Date;
    expiresAt?: Date;
    revokedAt?: Date;
    collectionMethod: string;
    legalBasis: string;
}

/**
 * 資料保留政策
 */
export interface RetentionPolicy {
    dataType: string;
    retentionPeriod: number; // 月
    deletionMethod: 'delete' | 'anonymize' | 'archive';
    legalRequirement?: string;
}

/**
 * 洩漏事件
 */
export interface BreachIncident {
    id: string;
    detectedAt: Date;
    affectedDataTypes: string[];
    affectedUserCount: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    notificationSent: boolean;
    reportedToAuthority: boolean;
    remediationStatus: 'pending' | 'in_progress' | 'completed';
}

/**
 * 台灣個資法合規服務
 */
@Injectable()
export class TaiwanPdpaService {
    private readonly logger = new Logger(TaiwanPdpaService.name);
    
    // 同意記錄
    private consents = new Map<string, ConsentRecord[]>();
    
    // 資料保留政策
    private retentionPolicies: RetentionPolicy[] = [
        { dataType: 'mission_records', retentionPeriod: 120, deletionMethod: 'archive', legalRequirement: '災防法' },
        { dataType: 'volunteer_personal', retentionPeriod: 60, deletionMethod: 'anonymize' },
        { dataType: 'victim_records', retentionPeriod: 84, deletionMethod: 'archive', legalRequirement: '社會福利法規' },
        { dataType: 'location_history', retentionPeriod: 12, deletionMethod: 'delete' },
        { dataType: 'system_logs', retentionPeriod: 12, deletionMethod: 'delete' },
        { dataType: 'audit_logs', retentionPeriod: 60, deletionMethod: 'archive' },
        { dataType: 'training_records', retentionPeriod: 36, deletionMethod: 'anonymize' },
    ];
    
    // 洩漏事件
    private breachIncidents: BreachIncident[] = [];

    constructor(private readonly eventEmitter: EventEmitter2) {}

    // ==================== 同意管理 ====================

    /**
     * 記錄使用者同意
     */
    recordConsent(
        userId: string,
        dataCategory: DataCategory,
        purpose: string,
        collectionMethod: string = 'web_form',
        validityMonths: number = 12,
    ): ConsentRecord {
        const now = new Date();
        const consent: ConsentRecord = {
            id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            dataCategory,
            purpose,
            status: ConsentStatus.GRANTED,
            grantedAt: now,
            expiresAt: new Date(now.getTime() + validityMonths * 30 * 24 * 60 * 60 * 1000),
            collectionMethod,
            legalBasis: this.getLegalBasis(dataCategory),
        };

        const userConsents = this.consents.get(userId) || [];
        userConsents.push(consent);
        this.consents.set(userId, userConsents);

        this.logger.log(`Consent recorded for user ${userId}: ${purpose}`);

        return consent;
    }

    /**
     * 撤銷同意
     */
    revokeConsent(userId: string, consentId: string): boolean {
        const userConsents = this.consents.get(userId);
        if (!userConsents) return false;

        const consent = userConsents.find(c => c.id === consentId);
        if (!consent) return false;

        consent.status = ConsentStatus.REVOKED;
        consent.revokedAt = new Date();

        this.eventEmitter.emit('consent.revoked', { userId, consentId });
        this.logger.log(`Consent revoked for user ${userId}: ${consentId}`);

        return true;
    }

    /**
     * 檢查同意狀態
     */
    checkConsent(userId: string, purpose: string): boolean {
        const userConsents = this.consents.get(userId) || [];
        const now = new Date();

        return userConsents.some(c => 
            c.purpose === purpose &&
            c.status === ConsentStatus.GRANTED &&
            (!c.expiresAt || c.expiresAt > now)
        );
    }

    /**
     * 取得使用者所有同意
     */
    getUserConsents(userId: string): ConsentRecord[] {
        return this.consents.get(userId) || [];
    }

    // ==================== 資料保留 ====================

    /**
     * 取得資料保留政策
     */
    getRetentionPolicies(): RetentionPolicy[] {
        return [...this.retentionPolicies];
    }

    /**
     * 取得特定類型的保留政策
     */
    getRetentionPolicy(dataType: string): RetentionPolicy | undefined {
        return this.retentionPolicies.find(p => p.dataType === dataType);
    }

    /**
     * 檢查資料是否應被刪除
     */
    shouldDeleteData(dataType: string, createdAt: Date): boolean {
        const policy = this.getRetentionPolicy(dataType);
        if (!policy) return false;

        const retentionMs = policy.retentionPeriod * 30 * 24 * 60 * 60 * 1000;
        const cutoffDate = new Date(Date.now() - retentionMs);

        return createdAt < cutoffDate;
    }

    /**
     * 匿名化資料
     */
    anonymizeData(data: any): any {
        const anonymized = { ...data };
        
        // 替換識別欄位
        const piiFields = ['name', 'email', 'phone', 'idNumber', 'address'];
        for (const field of piiFields) {
            if (anonymized[field]) {
                anonymized[field] = this.hashValue(anonymized[field]);
            }
        }
        
        // 模糊化位置
        if (anonymized.location) {
            anonymized.location = {
                lat: Math.round(anonymized.location.lat * 100) / 100,
                lng: Math.round(anonymized.location.lng * 100) / 100,
            };
        }

        return anonymized;
    }

    // ==================== 洩漏通報 ====================

    /**
     * 報告資料洩漏事件
     */
    reportBreach(
        affectedDataTypes: string[],
        affectedUserCount: number,
        severity: 'low' | 'medium' | 'high' | 'critical',
    ): BreachIncident {
        const incident: BreachIncident = {
            id: `breach_${Date.now()}`,
            detectedAt: new Date(),
            affectedDataTypes,
            affectedUserCount,
            severity,
            notificationSent: false,
            reportedToAuthority: false,
            remediationStatus: 'pending',
        };

        this.breachIncidents.push(incident);

        // 嚴重洩漏需立即通報
        if (severity === 'critical' || severity === 'high') {
            this.eventEmitter.emit('breach.critical', incident);
            this.logger.error(`CRITICAL BREACH: ${affectedUserCount} users affected`);
        }

        return incident;
    }

    /**
     * 更新洩漏事件狀態
     */
    updateBreachStatus(
        incidentId: string,
        updates: Partial<Pick<BreachIncident, 'notificationSent' | 'reportedToAuthority' | 'remediationStatus'>>,
    ): BreachIncident | null {
        const incident = this.breachIncidents.find(i => i.id === incidentId);
        if (!incident) return null;

        Object.assign(incident, updates);
        return incident;
    }

    /**
     * 取得洩漏事件列表
     */
    getBreachIncidents(): BreachIncident[] {
        return [...this.breachIncidents];
    }

    // ==================== 隱私權請求 ====================

    /**
     * 處理資料主體權利請求 (DSAR)
     */
    handleDataSubjectRequest(
        userId: string,
        requestType: 'access' | 'rectification' | 'erasure' | 'portability',
    ): { requestId: string; estimatedCompletion: Date } {
        const requestId = `dsar_${Date.now()}_${userId.substr(0, 8)}`;
        const estimatedCompletion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天

        this.eventEmitter.emit('dsar.requested', {
            requestId,
            userId,
            requestType,
        });

        this.logger.log(`DSAR request: ${requestType} for user ${userId}`);

        return { requestId, estimatedCompletion };
    }

    // ==================== 合規報告 ====================

    /**
     * 產生合規報告
     */
    generateComplianceReport(): {
        generatedAt: Date;
        consentStats: {
            total: number;
            active: number;
            revoked: number;
            expired: number;
        };
        retentionPolicies: RetentionPolicy[];
        breachStats: {
            total: number;
            pending: number;
            resolved: number;
        };
        recommendations: string[];
    } {
        let totalConsents = 0;
        let activeConsents = 0;
        let revokedConsents = 0;
        let expiredConsents = 0;
        const now = new Date();

        for (const consents of this.consents.values()) {
            for (const consent of consents) {
                totalConsents++;
                if (consent.status === ConsentStatus.GRANTED && (!consent.expiresAt || consent.expiresAt > now)) {
                    activeConsents++;
                } else if (consent.status === ConsentStatus.REVOKED) {
                    revokedConsents++;
                } else {
                    expiredConsents++;
                }
            }
        }

        const pendingBreaches = this.breachIncidents.filter(b => b.remediationStatus !== 'completed').length;

        return {
            generatedAt: new Date(),
            consentStats: {
                total: totalConsents,
                active: activeConsents,
                revoked: revokedConsents,
                expired: expiredConsents,
            },
            retentionPolicies: this.retentionPolicies,
            breachStats: {
                total: this.breachIncidents.length,
                pending: pendingBreaches,
                resolved: this.breachIncidents.length - pendingBreaches,
            },
            recommendations: this.getComplianceRecommendations(),
        };
    }

    // ==================== Private Helpers ====================

    private getLegalBasis(category: DataCategory): string {
        switch (category) {
            case DataCategory.SENSITIVE:
                return '個資法第6條：書面同意';
            case DataCategory.MINOR:
                return '個資法第7條：法定代理人同意';
            case DataCategory.BIOMETRIC:
                return '個資法第6條：特定目的書面同意';
            default:
                return '個資法第19條：契約關係或同意';
        }
    }

    private hashValue(value: string): string {
        // 簡化的雜湊 (實際應用應使用 crypto)
        return `***${value.substr(-4)}`;
    }

    private getComplianceRecommendations(): string[] {
        const recommendations: string[] = [];

        // 檢查過期同意
        let expiredCount = 0;
        for (const consents of this.consents.values()) {
            expiredCount += consents.filter(c => 
                c.status === ConsentStatus.GRANTED && 
                c.expiresAt && 
                c.expiresAt < new Date()
            ).length;
        }
        if (expiredCount > 0) {
            recommendations.push(`有 ${expiredCount} 筆同意已過期，建議重新取得同意`);
        }

        // 檢查未解決洩漏
        const unresolvedBreaches = this.breachIncidents.filter(b => b.remediationStatus !== 'completed');
        if (unresolvedBreaches.length > 0) {
            recommendations.push(`有 ${unresolvedBreaches.length} 起洩漏事件待處理`);
        }

        if (recommendations.length === 0) {
            recommendations.push('目前合規狀態良好');
        }

        return recommendations;
    }
}
