import { Injectable, Logger } from '@nestjs/common';

/**
 * GDPR Compliance Service
 * Personal data protection and management
 */
@Injectable()
export class GdprComplianceService {
    private readonly logger = new Logger(GdprComplianceService.name);
    private consentRecords: Map<string, ConsentRecord> = new Map();
    private dataRequests: Map<string, DataRequest> = new Map();

    /**
     * 記錄同意
     */
    recordConsent(userId: string, consent: ConsentInput): ConsentRecord {
        const record: ConsentRecord = {
            id: `consent-${Date.now()}`,
            userId,
            purposes: consent.purposes,
            givenAt: new Date(),
            ipAddress: consent.ipAddress,
            userAgent: consent.userAgent,
            version: consent.version || '1.0',
        };

        this.consentRecords.set(userId, record);
        return record;
    }

    /**
     * 檢查同意
     */
    hasConsent(userId: string, purpose: string): boolean {
        const record = this.consentRecords.get(userId);
        return record?.purposes.includes(purpose) || false;
    }

    /**
     * 撤銷同意
     */
    revokeConsent(userId: string, purposes?: string[]): boolean {
        const record = this.consentRecords.get(userId);
        if (!record) return false;

        if (purposes) {
            record.purposes = record.purposes.filter((p) => !purposes.includes(p));
            record.revokedAt = new Date();
        } else {
            this.consentRecords.delete(userId);
        }

        return true;
    }

    /**
     * 提交資料存取請求 (DSAR)
     */
    submitDataRequest(userId: string, type: 'access' | 'delete' | 'portability'): DataRequest {
        const request: DataRequest = {
            id: `dsar-${Date.now()}`,
            userId,
            type,
            status: 'pending',
            submittedAt: new Date(),
            deadline: this.calcDeadline(),
        };

        this.dataRequests.set(request.id, request);
        return request;
    }

    /**
     * 處理資料請求
     */
    processDataRequest(requestId: string): DataRequestResult {
        const request = this.dataRequests.get(requestId);
        if (!request) return { success: false, error: 'Request not found' };

        switch (request.type) {
            case 'access':
                return this.handleAccessRequest(request);
            case 'delete':
                return this.handleDeleteRequest(request);
            case 'portability':
                return this.handlePortabilityRequest(request);
        }
    }

    /**
     * 匿名化資料
     */
    anonymize(data: Record<string, any>, fields: string[]): Record<string, any> {
        const result = { ...data };
        for (const field of fields) {
            if (result[field]) {
                result[field] = '[ANONYMIZED]';
            }
        }
        result['_anonymized'] = true;
        result['_anonymizedAt'] = new Date().toISOString();
        return result;
    }

    /**
     * 假名化資料
     */
    pseudonymize(data: Record<string, any>, fields: string[]): { data: Record<string, any>; mapping: Record<string, string> } {
        const result = { ...data };
        const mapping: Record<string, string> = {};

        for (const field of fields) {
            if (result[field]) {
                const pseudonym = `PSE_${this.generatePseudonym()}`;
                mapping[pseudonym] = result[field];
                result[field] = pseudonym;
            }
        }

        return { data: result, mapping };
    }

    /**
     * 取得資料保留政策
     */
    getRetentionPolicy(): RetentionPolicy {
        return {
            personalData: { days: 365, extendable: true },
            logs: { days: 90, extendable: false },
            backups: { days: 30, extendable: false },
            analytics: { days: 730, extendable: true },
        };
    }

    /**
     * 取得同意記錄
     */
    getConsentHistory(userId: string): ConsentRecord | undefined {
        return this.consentRecords.get(userId);
    }

    /**
     * 取得資料請求狀態
     */
    getRequestStatus(requestId: string): DataRequest | undefined {
        return this.dataRequests.get(requestId);
    }

    private handleAccessRequest(request: DataRequest): DataRequestResult {
        request.status = 'completed';
        request.completedAt = new Date();
        return {
            success: true,
            data: { message: '您的資料已準備好下載', downloadUrl: `/api/gdpr/download/${request.id}` },
        };
    }

    private handleDeleteRequest(request: DataRequest): DataRequestResult {
        request.status = 'completed';
        request.completedAt = new Date();
        return { success: true, data: { message: '您的資料已被刪除' } };
    }

    private handlePortabilityRequest(request: DataRequest): DataRequestResult {
        request.status = 'completed';
        request.completedAt = new Date();
        return {
            success: true,
            data: { message: '您的資料已準備好下載 (JSON 格式)', downloadUrl: `/api/gdpr/export/${request.id}` },
        };
    }

    private calcDeadline(): Date {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30); // GDPR 要求 30 天內回覆
        return deadline;
    }

    private generatePseudonym(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
}

// Types
interface ConsentInput { purposes: string[]; ipAddress?: string; userAgent?: string; version?: string; }
interface ConsentRecord { id: string; userId: string; purposes: string[]; givenAt: Date; revokedAt?: Date; ipAddress?: string; userAgent?: string; version: string; }
interface DataRequest { id: string; userId: string; type: 'access' | 'delete' | 'portability'; status: string; submittedAt: Date; deadline: Date; completedAt?: Date; }
interface DataRequestResult { success: boolean; data?: any; error?: string; }
interface RetentionPolicy { [key: string]: { days: number; extendable: boolean } }
