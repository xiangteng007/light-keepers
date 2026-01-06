import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Audit Log Service
 * Complete operation logging for compliance and security
 */
@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);
    private logs: AuditLogEntry[] = [];

    /**
     * 記錄操作
     */
    log(entry: AuditLogInput): void {
        const log: AuditLogEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            ...entry,
            timestamp: new Date(),
        };

        this.logs.push(log);

        // 保留最近 10000 筆
        if (this.logs.length > 10000) {
            this.logs = this.logs.slice(-10000);
        }

        // 高風險操作發警告
        if (entry.riskLevel === 'high' || entry.riskLevel === 'critical') {
            this.logger.warn(`High-risk action: ${entry.action} by ${entry.userId}`);
        }
    }

    /**
     * 記錄 API 請求
     */
    logApiRequest(req: Request, res: Response, userId?: string) {
        this.log({
            userId: userId || 'anonymous',
            action: `${req.method} ${req.path}`,
            category: 'api_request',
            target: req.path,
            targetType: 'api',
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            riskLevel: 'low',
        });
    }

    /**
     * 記錄資料異動
     */
    logDataChange(params: {
        userId: string;
        action: 'create' | 'update' | 'delete';
        entityType: string;
        entityId: string;
        changes?: any;
    }) {
        this.log({
            userId: params.userId,
            action: `${params.action}_${params.entityType}`,
            category: 'data_change',
            target: params.entityId,
            targetType: params.entityType,
            metadata: params.changes,
            riskLevel: params.action === 'delete' ? 'medium' : 'low',
        });
    }

    /**
     * 記錄登入事件
     */
    logAuth(params: { userId: string; action: 'login' | 'logout' | 'failed_login'; ip?: string }) {
        this.log({
            userId: params.userId,
            action: params.action,
            category: 'auth',
            target: params.userId,
            targetType: 'user',
            ip: params.ip,
            riskLevel: params.action === 'failed_login' ? 'medium' : 'low',
        });
    }

    /**
     * 記錄敏感操作
     */
    logSensitive(params: { userId: string; action: string; target: string; reason?: string }) {
        this.log({
            ...params,
            category: 'sensitive',
            targetType: 'system',
            riskLevel: 'high',
        });
    }

    /**
     * 查詢日誌
     */
    query(filter: AuditQueryFilter): AuditLogEntry[] {
        let result = [...this.logs];

        if (filter.userId) result = result.filter((l) => l.userId === filter.userId);
        if (filter.category) result = result.filter((l) => l.category === filter.category);
        if (filter.action) result = result.filter((l) => l.action.includes(filter.action!));
        if (filter.from) result = result.filter((l) => l.timestamp >= filter.from!);
        if (filter.to) result = result.filter((l) => l.timestamp <= filter.to!);
        if (filter.riskLevel) result = result.filter((l) => l.riskLevel === filter.riskLevel);

        return result
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, filter.limit || 100);
    }

    /**
     * 取得統計
     */
    getStats(hours: number = 24): AuditStats {
        const cutoff = new Date(Date.now() - hours * 3600000);
        const recent = this.logs.filter((l) => l.timestamp >= cutoff);

        return {
            totalLogs: recent.length,
            byCategory: this.groupBy(recent, 'category'),
            byRiskLevel: this.groupBy(recent, 'riskLevel'),
            topUsers: this.getTopUsers(recent, 10),
            highRiskActions: recent.filter((l) => l.riskLevel === 'high' || l.riskLevel === 'critical'),
        };
    }

    private groupBy(logs: AuditLogEntry[], key: keyof AuditLogEntry): Record<string, number> {
        return logs.reduce((acc, l) => {
            const k = String(l[key] || 'unknown');
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    private getTopUsers(logs: AuditLogEntry[], limit: number): { userId: string; count: number }[] {
        const counts = this.groupBy(logs, 'userId');
        return Object.entries(counts)
            .map(([userId, count]) => ({ userId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
}

// Types
interface AuditLogInput {
    userId: string;
    action: string;
    category: 'api_request' | 'data_change' | 'auth' | 'sensitive' | 'system';
    target?: string;
    targetType?: string;
    ip?: string;
    userAgent?: string;
    statusCode?: number;
    metadata?: any;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
interface AuditLogEntry extends AuditLogInput { id: string; timestamp: Date; }
interface AuditQueryFilter { userId?: string; category?: string; action?: string; from?: Date; to?: Date; riskLevel?: string; limit?: number; }
interface AuditStats { totalLogs: number; byCategory: Record<string, number>; byRiskLevel: Record<string, number>; topUsers: { userId: string; count: number }[]; highRiskActions: AuditLogEntry[]; }
