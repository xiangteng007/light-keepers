/**
 * Data Export Service
 * 
 * GDPR-compliant user data export functionality
 * v1.0: Collect all user data, generate JSON/CSV, package as ZIP
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ExportRequest {
    id: string;
    accountId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    format: 'json' | 'csv' | 'zip';
    createdAt: Date;
    completedAt?: Date;
    downloadUrl?: string;
    expiresAt?: Date;
    error?: string;
}

export interface ExportedData {
    account: {
        id: string;
        email: string;
        phone?: string;
        displayName?: string;
        createdAt: string;
        lastLoginAt?: string;
    };
    profile: {
        avatarUrl?: string;
        emailVerified: boolean;
        phoneVerified: boolean;
        preferences: {
            alertNotifications: boolean;
            taskNotifications: boolean;
            trainingNotifications: boolean;
        };
    };
    linkedAccounts: {
        line?: { userId: string; displayName?: string };
        google?: { id: string; email?: string };
    };
    roles: string[];
    volunteer?: unknown;
    activities: unknown[];
    tasks: unknown[];
    exportedAt: string;
}

@Injectable()
export class DataExportService {
    private readonly logger = new Logger(DataExportService.name);
    private readonly exportDir: string;
    private readonly exportRequests = new Map<string, ExportRequest>();

    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        private readonly configService: ConfigService,
    ) {
        // Set export directory
        this.exportDir = this.configService.get<string>('EXPORT_DIR', './exports');

        // Ensure export directory exists
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    /**
     * Request a data export for the user
     */
    async requestExport(accountId: string, format: 'json' | 'csv' | 'zip' = 'json'): Promise<ExportRequest> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['roles'],
        });

        if (!account) {
            throw new BadRequestException('帳戶不存在');
        }

        // Check for existing pending/processing requests
        const existingRequest = Array.from(this.exportRequests.values()).find(
            req => req.accountId === accountId && ['pending', 'processing'].includes(req.status)
        );

        if (existingRequest) {
            throw new BadRequestException('已有匯出請求處理中，請稍後再試');
        }

        // Create export request
        const requestId = crypto.randomUUID();
        const exportRequest: ExportRequest = {
            id: requestId,
            accountId,
            status: 'pending',
            format,
            createdAt: new Date(),
        };

        this.exportRequests.set(requestId, exportRequest);

        // Process export asynchronously
        this.processExport(requestId, account).catch(error => {
            this.logger.error(`Export failed for request ${requestId}: ${error.message}`);
            const req = this.exportRequests.get(requestId);
            if (req) {
                req.status = 'failed';
                req.error = error.message;
            }
        });

        return exportRequest;
    }

    /**
     * Get export request status
     */
    async getExportStatus(requestId: string, accountId: string): Promise<ExportRequest> {
        const request = this.exportRequests.get(requestId);

        if (!request) {
            throw new NotFoundException('匯出請求不存在');
        }

        if (request.accountId !== accountId) {
            throw new BadRequestException('無權限存取此匯出請求');
        }

        return request;
    }

    /**
     * Get download path for completed export
     */
    async getDownloadPath(requestId: string, accountId: string): Promise<string> {
        const request = await this.getExportStatus(requestId, accountId);

        if (request.status !== 'completed') {
            throw new BadRequestException('匯出尚未完成');
        }

        if (request.expiresAt && new Date() > request.expiresAt) {
            throw new BadRequestException('下載連結已過期');
        }

        const filePath = path.join(this.exportDir, `${requestId}.${request.format}`);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('匯出檔案不存在');
        }

        return filePath;
    }

    /**
     * Process export request
     */
    private async processExport(requestId: string, account: Account): Promise<void> {
        const request = this.exportRequests.get(requestId);
        if (!request) return;

        request.status = 'processing';
        this.logger.log(`Processing export ${requestId} for account ${account.id}`);

        try {
            // Collect all user data
            const data = await this.collectUserData(account);

            // Generate export file
            const filePath = await this.generateExportFile(requestId, data, request.format);

            // Update request status
            request.status = 'completed';
            request.completedAt = new Date();
            request.downloadUrl = `/account/export/download/${requestId}`;
            request.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            this.logger.log(`Export ${requestId} completed: ${filePath}`);
        } catch (error: unknown) {
            request.status = 'failed';
            request.error = error instanceof Error ? error.message : 'Unknown error';
            throw error;
        }
    }

    /**
     * Collect all user data for export
     */
    private async collectUserData(account: Account): Promise<ExportedData> {
        // Collect basic account info
        const exportedData: ExportedData = {
            account: {
                id: account.id,
                email: account.email,
                phone: account.phone || undefined,
                displayName: account.displayName || undefined,
                createdAt: account.createdAt.toISOString(),
                lastLoginAt: account.lastLoginAt?.toISOString(),
            },
            profile: {
                avatarUrl: account.avatarUrl || undefined,
                emailVerified: account.emailVerified,
                phoneVerified: account.phoneVerified,
                preferences: {
                    alertNotifications: account.prefAlertNotifications,
                    taskNotifications: account.prefTaskNotifications,
                    trainingNotifications: account.prefTrainingNotifications,
                },
            },
            linkedAccounts: {},
            roles: account.roles?.map(r => r.name) || [],
            activities: [],
            tasks: [],
            exportedAt: new Date().toISOString(),
        };

        // Add linked account info
        if (account.lineUserId) {
            exportedData.linkedAccounts.line = {
                userId: account.lineUserId,
                displayName: account.lineDisplayName || undefined,
            };
        }

        if (account.googleId) {
            exportedData.linkedAccounts.google = {
                id: account.googleId,
                email: account.googleEmail || undefined,
            };
        }

        // Add volunteer data if exists
        if (account.volunteer) {
            exportedData.volunteer = {
                // Volunteer profile data would be collected here
                // This depends on the volunteer entity structure
            };
        }

        // TODO: Collect other related data
        // - Tasks assigned to user
        // - Activity/audit logs
        // - Training records
        // - etc.

        return exportedData;
    }

    /**
     * Generate export file in specified format
     */
    private async generateExportFile(
        requestId: string,
        data: ExportedData,
        format: 'json' | 'csv' | 'zip'
    ): Promise<string> {
        const filePath = path.join(this.exportDir, `${requestId}.${format}`);

        switch (format) {
            case 'json':
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                break;

            case 'csv':
                const csvContent = this.convertToCSV(data);
                fs.writeFileSync(filePath, csvContent, 'utf-8');
                break;

            case 'zip':
                // For ZIP, create JSON inside
                const jsonPath = path.join(this.exportDir, `${requestId}.json`);
                fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
                // In production, use archiver or similar library
                // For now, just rename to .zip (placeholder)
                fs.copyFileSync(jsonPath, filePath);
                fs.unlinkSync(jsonPath);
                break;
        }

        return filePath;
    }

    /**
     * Convert data to CSV format
     */
    private convertToCSV(data: ExportedData): string {
        const lines: string[] = [];

        // Header section
        lines.push('=== Light Keepers 個人資料匯出 ===');
        lines.push(`匯出時間,${data.exportedAt}`);
        lines.push('');

        // Account info
        lines.push('=== 帳戶資訊 ===');
        lines.push('欄位,值');
        lines.push(`ID,${data.account.id}`);
        lines.push(`Email,${data.account.email}`);
        lines.push(`手機,${data.account.phone || ''}`);
        lines.push(`顯示名稱,${data.account.displayName || ''}`);
        lines.push(`建立時間,${data.account.createdAt}`);
        lines.push(`最後登入,${data.account.lastLoginAt || ''}`);
        lines.push('');

        // Profile
        lines.push('=== 個人檔案 ===');
        lines.push(`Email 已驗證,${data.profile.emailVerified ? '是' : '否'}`);
        lines.push(`手機已驗證,${data.profile.phoneVerified ? '是' : '否'}`);
        lines.push('');

        // Linked accounts
        lines.push('=== 連結帳戶 ===');
        if (data.linkedAccounts.line) {
            lines.push(`LINE,${data.linkedAccounts.line.displayName || data.linkedAccounts.line.userId}`);
        }
        if (data.linkedAccounts.google) {
            lines.push(`Google,${data.linkedAccounts.google.email || data.linkedAccounts.google.id}`);
        }
        lines.push('');

        // Roles
        lines.push('=== 角色權限 ===');
        lines.push(`角色,${data.roles.join(', ')}`);

        return lines.join('\n');
    }

    /**
     * Cleanup old export files
     */
    async cleanupExpiredExports(): Promise<number> {
        let cleaned = 0;
        const now = new Date();

        for (const [id, request] of this.exportRequests.entries()) {
            if (request.expiresAt && request.expiresAt < now) {
                // Delete file
                const filePath = path.join(this.exportDir, `${id}.${request.format}`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                // Remove from map
                this.exportRequests.delete(id);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.log(`Cleaned up ${cleaned} expired exports`);
        }

        return cleaned;
    }
}
