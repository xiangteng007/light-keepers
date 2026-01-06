/**
 * Audit Service
 * Records and queries audit logs for security and compliance
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

export interface AuditLogInput {
    userId?: string;
    userName?: string;
    action: AuditAction;
    resourceType?: string;
    resourceId?: string;
    description?: string;
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    durationMs?: number;
    success?: boolean;
    errorMessage?: string;
}

export interface AuditQueryOptions {
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private auditRepo: Repository<AuditLog>,
    ) { }

    /**
     * Log an action
     */
    async log(input: AuditLogInput): Promise<AuditLog> {
        try {
            const log = this.auditRepo.create({
                ...input,
                success: input.success ?? true,
            });
            return await this.auditRepo.save(log);
        } catch (error) {
            this.logger.error('Failed to save audit log', error);
            // Don't throw - audit logging should not break the main flow
            return null as any;
        }
    }

    /**
     * Log an action asynchronously (fire-and-forget)
     */
    logAsync(input: AuditLogInput): void {
        this.log(input).catch(err => {
            this.logger.error('Async audit log failed', err);
        });
    }

    /**
     * Query audit logs
     */
    async query(options: AuditQueryOptions): Promise<{
        logs: AuditLog[];
        total: number;
    }> {
        const where: FindOptionsWhere<AuditLog> = {};

        if (options.userId) where.userId = options.userId;
        if (options.action) where.action = options.action;
        if (options.resourceType) where.resourceType = options.resourceType;
        if (options.resourceId) where.resourceId = options.resourceId;
        if (options.success !== undefined) where.success = options.success;

        if (options.startDate && options.endDate) {
            where.createdAt = Between(options.startDate, options.endDate);
        } else if (options.startDate) {
            where.createdAt = MoreThan(options.startDate);
        }

        const [logs, total] = await this.auditRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: options.limit || 100,
            skip: options.offset || 0,
        });

        return { logs, total };
    }

    /**
     * Get recent activity for a user
     */
    async getUserActivity(userId: string, limit: number = 20): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Get resource history
     */
    async getResourceHistory(
        resourceType: string,
        resourceId: string,
    ): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: { resourceType, resourceId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get failed actions (security monitoring)
     */
    async getFailedActions(hours: number = 24): Promise<AuditLog[]> {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.auditRepo.find({
            where: {
                success: false,
                createdAt: MoreThan(since),
            },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get login attempts for security monitoring
     */
    async getLoginAttempts(hours: number = 24): Promise<{
        successful: number;
        failed: number;
        byIp: Record<string, number>;
    }> {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const logs = await this.auditRepo.find({
            where: {
                action: 'login' as any,
                createdAt: MoreThan(since),
            },
        });

        const failedLogs = await this.auditRepo.find({
            where: {
                action: 'login_failed' as any,
                createdAt: MoreThan(since),
            },
        });

        const byIp: Record<string, number> = {};
        for (const log of [...logs, ...failedLogs]) {
            if (log.ipAddress) {
                byIp[log.ipAddress] = (byIp[log.ipAddress] || 0) + 1;
            }
        }

        return {
            successful: logs.filter(l => l.success).length,
            failed: failedLogs.length,
            byIp,
        };
    }

    /**
     * Cleanup old logs
     */
    async cleanup(olderThanDays: number = 90): Promise<number> {
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const result = await this.auditRepo.delete({
            createdAt: MoreThan(cutoff) as any, // TODO: use LessThan
        });
        return result.affected || 0;
    }
}
