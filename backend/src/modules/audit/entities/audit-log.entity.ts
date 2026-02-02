/**
 * Audit Trail Entity and Service
 * 
 * Implements soft-delete functionality and comprehensive audit logging.
 */

import { 
    Entity, 
    Column, 
    PrimaryGeneratedColumn, 
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Audit Log Entity
 * Records all data modifications for compliance and forensics
 */
@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['performedBy'])
@Index(['performedAt'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    entityType: string;

    @Column({ type: 'uuid' })
    entityId: string;

    @Column({ type: 'varchar', length: 20 })
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'ACCESS';

    @Column({ type: 'jsonb', nullable: true })
    previousValue: Record<string, any> | null;

    @Column({ type: 'jsonb', nullable: true })
    newValue: Record<string, any> | null;

    @Column({ type: 'jsonb', nullable: true })
    changedFields: string[] | null;

    @Column({ type: 'uuid' })
    performedBy: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    performerRole: string;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn()
    performedAt: Date;

    @Column({ type: 'uuid', nullable: true })
    tenantId: string;

    @Column({ type: 'text', nullable: true })
    reason: string;
}

/**
 * Soft-Delete Mixin
 * Add to entities that need soft-delete functionality
 */
export abstract class SoftDeletableEntity {
    @Column({ type: 'timestamp', nullable: true })
    deletedAt: Date | null;

    @Column({ type: 'uuid', nullable: true })
    deletedBy: string | null;

    @Column({ type: 'text', nullable: true })
    deletionReason: string | null;

    get isDeleted(): boolean {
        return this.deletedAt !== null;
    }
}

/**
 * Audit Service
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditRepository: Repository<AuditLog>,
    ) {}

    /**
     * Log a create action
     */
    async logCreate(
        entityType: string,
        entityId: string,
        newValue: any,
        context: AuditContext,
    ): Promise<void> {
        await this.createLog('CREATE', entityType, entityId, null, newValue, context);
    }

    /**
     * Log an update action
     */
    async logUpdate(
        entityType: string,
        entityId: string,
        previousValue: any,
        newValue: any,
        context: AuditContext,
    ): Promise<void> {
        const changedFields = this.getChangedFields(previousValue, newValue);
        await this.createLog('UPDATE', entityType, entityId, previousValue, newValue, context, changedFields);
    }

    /**
     * Log a delete action (soft or hard)
     */
    async logDelete(
        entityType: string,
        entityId: string,
        previousValue: any,
        context: AuditContext,
        reason?: string,
    ): Promise<void> {
        await this.createLog('DELETE', entityType, entityId, previousValue, null, context, null, reason);
    }

    /**
     * Log a restore action
     */
    async logRestore(
        entityType: string,
        entityId: string,
        restoredValue: any,
        context: AuditContext,
    ): Promise<void> {
        await this.createLog('RESTORE', entityType, entityId, null, restoredValue, context);
    }

    /**
     * Get audit trail for an entity
     */
    async getAuditTrail(
        entityType: string,
        entityId: string,
    ): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { entityType, entityId },
            order: { performedAt: 'DESC' },
        });
    }

    /**
     * Get recent actions by user
     */
    async getRecentByUser(
        userId: string,
        limit = 50,
    ): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { performedBy: userId },
            order: { performedAt: 'DESC' },
            take: limit,
        });
    }

    private async createLog(
        action: AuditLog['action'],
        entityType: string,
        entityId: string,
        previousValue: any | null,
        newValue: any | null,
        context: AuditContext,
        changedFields?: string[] | null,
        reason?: string,
    ): Promise<void> {
        const log = this.auditRepository.create({
            action,
            entityType,
            entityId,
            previousValue: this.sanitize(previousValue),
            newValue: this.sanitize(newValue),
            changedFields,
            performedBy: context.userId,
            performerRole: context.role,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            tenantId: context.tenantId,
            reason,
        });

        await this.auditRepository.save(log);
    }

    private getChangedFields(previous: any, current: any): string[] {
        const fields: string[] = [];
        const allKeys = new Set([...Object.keys(previous || {}), ...Object.keys(current || {})]);
        
        for (const key of allKeys) {
            if (JSON.stringify(previous?.[key]) !== JSON.stringify(current?.[key])) {
                fields.push(key);
            }
        }
        
        return fields;
    }

    private sanitize(value: any): any {
        if (!value) return value;
        
        const sensitiveFields = ['password', 'token', 'secret', 'refreshToken'];
        const sanitized = { ...value };
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }
}

export interface AuditContext {
    userId: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
    tenantId?: string;
}
