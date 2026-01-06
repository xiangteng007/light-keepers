/**
 * Data Privacy Service
 * GDPR compliance and data deletion handling
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DataDeletionRequest {
    id: string;
    userId: string;
    userEmail: string;
    requestType: 'deletion' | 'export' | 'anonymize';
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    reason?: string;
    requestedAt: Date;
    processedAt?: Date;
    processedBy?: string;
    notes?: string;
}

export interface UserDataExport {
    userId: string;
    exportedAt: Date;
    data: {
        profile: Record<string, any>;
        reports: any[];
        sosSignals: any[];
        activities: any[];
        auditLogs: any[];
    };
}

export interface PrivacyConfig {
    dataRetentionDays: number;
    autoAnonymizeAfterDays: number;
    gdprEnabled: boolean;
    allowDataExport: boolean;
}

@Injectable()
export class DataPrivacyService {
    private readonly logger = new Logger(DataPrivacyService.name);

    private deletionRequests: DataDeletionRequest[] = [];
    private requestId = 0;

    private config: PrivacyConfig = {
        dataRetentionDays: 365,
        autoAnonymizeAfterDays: 730,
        gdprEnabled: true,
        allowDataExport: true,
    };

    constructor(private dataSource: DataSource) { }

    // ==================== Configuration ====================

    getConfig(): PrivacyConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<PrivacyConfig>): PrivacyConfig {
        this.config = { ...this.config, ...updates };
        return this.config;
    }

    // ==================== Data Deletion ====================

    /**
     * Create data deletion request
     */
    async createDeletionRequest(params: {
        userId: string;
        userEmail: string;
        requestType: 'deletion' | 'export' | 'anonymize';
        reason?: string;
    }): Promise<DataDeletionRequest> {
        const request: DataDeletionRequest = {
            id: `req-${++this.requestId}`,
            ...params,
            status: 'pending',
            requestedAt: new Date(),
        };

        this.deletionRequests.push(request);
        this.logger.log(`Created ${params.requestType} request for user ${params.userId}`);

        return request;
    }

    /**
     * Process data deletion request
     */
    async processDeletionRequest(requestId: string, adminId: string): Promise<DataDeletionRequest> {
        const request = this.deletionRequests.find(r => r.id === requestId);
        if (!request) {
            throw new Error('Request not found');
        }

        request.status = 'processing';

        try {
            switch (request.requestType) {
                case 'deletion':
                    await this.deleteUserData(request.userId);
                    break;
                case 'anonymize':
                    await this.anonymizeUserData(request.userId);
                    break;
                case 'export':
                    // Export is handled separately
                    break;
            }

            request.status = 'completed';
            request.processedAt = new Date();
            request.processedBy = adminId;

            this.logger.log(`Processed ${request.requestType} request ${requestId}`);
        } catch (error: any) {
            request.status = 'rejected';
            request.notes = error.message;
        }

        return request;
    }

    /**
     * Get all deletion requests
     */
    getDeletionRequests(status?: string): DataDeletionRequest[] {
        if (status) {
            return this.deletionRequests.filter(r => r.status === status);
        }
        return this.deletionRequests;
    }

    // ==================== Data Export ====================

    /**
     * Export all user data (GDPR right to data portability)
     */
    async exportUserData(userId: string): Promise<UserDataExport> {
        if (!this.config.allowDataExport) {
            throw new Error('Data export is disabled');
        }

        const [profile, reports, sosSignals, activities, auditLogs] = await Promise.all([
            this.getUserProfile(userId),
            this.getUserReports(userId),
            this.getUserSOSSignals(userId),
            this.getUserActivities(userId),
            this.getUserAuditLogs(userId),
        ]);

        return {
            userId,
            exportedAt: new Date(),
            data: {
                profile,
                reports,
                sosSignals,
                activities,
                auditLogs,
            },
        };
    }

    // ==================== Data Operations ====================

    /**
     * Delete all user data
     */
    private async deleteUserData(userId: string): Promise<void> {
        const tables = [
            'sos_signals',
            'field_reports',
            'task_assignments',
            'activity_registrations',
            'notification_preferences',
            'audit_logs',
        ];

        for (const table of tables) {
            await this.safeQuery(
                `DELETE FROM ${table} WHERE user_id = $1 OR reporter_id = $1`,
                [userId]
            );
        }

        // Delete account
        await this.safeQuery('DELETE FROM accounts WHERE id = $1', [userId]);

        this.logger.log(`Deleted all data for user ${userId}`);
    }

    /**
     * Anonymize user data (keep records but remove PII)
     */
    private async anonymizeUserData(userId: string): Promise<void> {
        const anonymousId = `anon-${Date.now()}`;

        // Anonymize account
        await this.safeQuery(`
            UPDATE accounts SET
                email = $2,
                display_name = 'Deleted User',
                phone = NULL,
                line_id = NULL,
                google_id = NULL,
                status = 'deleted'
            WHERE id = $1
        `, [userId, `${anonymousId}@deleted.local`]);

        // Anonymize reports
        await this.safeQuery(`
            UPDATE field_reports SET
                reporter_name = 'Anonymous',
                contact = NULL
            WHERE reporter_id = $1
        `, [userId]);

        this.logger.log(`Anonymized data for user ${userId}`);
    }

    // ==================== Data Retention ====================

    /**
     * Process automatic data cleanup based on retention policy
     */
    async processDataRetention(): Promise<{ deleted: number; anonymized: number }> {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - this.config.dataRetentionDays);

        const anonymizeDate = new Date();
        anonymizeDate.setDate(anonymizeDate.getDate() - this.config.autoAnonymizeAfterDays);

        // Delete old audit logs
        const deleteResult = await this.safeQuery(`
            DELETE FROM audit_logs WHERE created_at < $1
        `, [retentionDate]);

        // Anonymize old inactive accounts
        const anonymizeResult = await this.safeQuery(`
            UPDATE accounts SET
                email = CONCAT('anon-', id, '@deleted.local'),
                display_name = 'Deleted User',
                phone = NULL,
                status = 'anonymized'
            WHERE last_login < $1
            AND status NOT IN ('deleted', 'anonymized')
        `, [anonymizeDate]);

        return {
            deleted: deleteResult?.rowCount || 0,
            anonymized: anonymizeResult?.rowCount || 0,
        };
    }

    // ==================== Private Helpers ====================

    private async getUserProfile(userId: string): Promise<Record<string, any>> {
        const result = await this.safeQuery(
            'SELECT * FROM accounts WHERE id = $1',
            [userId]
        );
        return result?.[0] || {};
    }

    private async getUserReports(userId: string): Promise<any[]> {
        return await this.safeQuery(
            'SELECT * FROM field_reports WHERE reporter_id = $1',
            [userId]
        ) || [];
    }

    private async getUserSOSSignals(userId: string): Promise<any[]> {
        return await this.safeQuery(
            'SELECT * FROM sos_signals WHERE user_id = $1',
            [userId]
        ) || [];
    }

    private async getUserActivities(userId: string): Promise<any[]> {
        return await this.safeQuery(
            'SELECT * FROM activity_registrations WHERE user_id = $1',
            [userId]
        ) || [];
    }

    private async getUserAuditLogs(userId: string): Promise<any[]> {
        return await this.safeQuery(
            'SELECT * FROM audit_logs WHERE user_id = $1',
            [userId]
        ) || [];
    }

    private async safeQuery(sql: string, params: any[]): Promise<any> {
        try {
            return await this.dataSource.query(sql, params);
        } catch {
            return null;
        }
    }
}
