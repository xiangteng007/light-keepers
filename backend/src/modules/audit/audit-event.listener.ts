/**
 * audit-event.listener.ts
 * 
 * v2.1: 審計事件監聽器
 * 監聽高風險事件並自動寫入 AuditLog
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import {
    INCIDENT_EVENTS,
    INTAKE_EVENTS,
    TASK_EVENTS,
    LOGISTICS_EVENTS,
    AUDIT_EVENTS,
    IncidentEventPayload,
    IntakeEventPayload,
    TaskEventPayload,
    AuditEventPayload,
} from '../../common/events';

@Injectable()
export class AuditEventListener {
    private readonly logger = new Logger(AuditEventListener.name);

    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepo: Repository<AuditLog>,
    ) { }

    /**
     * 記錄 Incident 建立
     */
    @OnEvent(INCIDENT_EVENTS.CREATED)
    async handleIncidentCreated(payload: IncidentEventPayload): Promise<void> {
        await this.logAudit({
            action: 'create',
            resourceType: 'Incident',
            resourceId: payload.incidentId,
            userId: payload.userId,
            description: `Incident created: ${payload.title || payload.incidentId}`,
            metadata: {
                source: payload.source,
                severity: payload.severity,
                correlationId: payload.correlationId,
            },
        });
    }

    /**
     * 記錄 Incident 狀態變更
     */
    @OnEvent(INCIDENT_EVENTS.STATUS_CHANGED)
    async handleIncidentStatusChanged(payload: IncidentEventPayload & { previousStatus?: string }): Promise<void> {
        await this.logAudit({
            action: 'update',
            resourceType: 'Incident',
            resourceId: payload.incidentId,
            userId: payload.userId,
            description: `Incident status changed: ${payload.previousStatus} → ${payload.status}`,
            previousState: { status: payload.previousStatus },
            newState: { status: payload.status },
        });
    }

    /**
     * 記錄 Intake 通報提交
     */
    @OnEvent(INTAKE_EVENTS.SUBMITTED)
    async handleIntakeSubmitted(payload: IntakeEventPayload): Promise<void> {
        await this.logAudit({
            action: 'report_submit',
            resourceType: 'IntakeReport',
            resourceId: payload.intakeId,
            userId: payload.userId,
            description: `Intake submitted: ${payload.sourceType} → Incident ${payload.incidentId}`,
            metadata: {
                incidentId: payload.incidentId,
                sourceType: payload.sourceType,
            },
        });
    }

    /**
     * 記錄 Task 指派
     */
    @OnEvent(TASK_EVENTS.ASSIGNED)
    async handleTaskAssigned(payload: TaskEventPayload): Promise<void> {
        await this.logAudit({
            action: 'task_assign',
            resourceType: 'Task',
            resourceId: payload.taskId,
            userId: payload.userId,
            description: `Task assigned to ${payload.assigneeId}`,
            newState: {
                assigneeId: payload.assigneeId,
                status: payload.status,
            },
        });
    }

    /**
     * 記錄 Task 完成
     */
    @OnEvent(TASK_EVENTS.COMPLETED)
    async handleTaskCompleted(payload: TaskEventPayload): Promise<void> {
        await this.logAudit({
            action: 'task_complete',
            resourceType: 'Task',
            resourceId: payload.taskId,
            userId: payload.userId,
            description: `Task completed`,
        });
    }

    /**
     * 記錄庫存審批
     */
    @OnEvent(LOGISTICS_EVENTS.APPROVAL_APPROVED)
    async handleApprovalApproved(payload: AuditEventPayload): Promise<void> {
        await this.logAudit({
            action: 'update',
            resourceType: 'Approval',
            resourceId: payload.resourceId,
            userId: payload.userId,
            description: payload.description || 'Approval approved',
            previousState: payload.previousState,
            newState: payload.newState,
        });
    }

    /**
     * 記錄權限變更（高風險）
     */
    @OnEvent(AUDIT_EVENTS.PERMISSION_CHANGED)
    async handlePermissionChanged(payload: AuditEventPayload): Promise<void> {
        await this.logAudit({
            action: 'permission_grant',
            resourceType: payload.resourceType,
            resourceId: payload.resourceId,
            userId: payload.userId,
            description: payload.description || 'Permission changed',
            previousState: payload.previousState,
            newState: payload.newState,
        });
        this.logger.warn(`[HIGH RISK] Permission changed: ${payload.resourceId} by ${payload.userId}`);
    }

    /**
     * 記錄角色變更（高風險）
     */
    @OnEvent(AUDIT_EVENTS.ROLE_CHANGED)
    async handleRoleChanged(payload: AuditEventPayload): Promise<void> {
        await this.logAudit({
            action: 'role_change',
            resourceType: payload.resourceType,
            resourceId: payload.resourceId,
            userId: payload.userId,
            description: payload.description || 'Role changed',
            previousState: payload.previousState,
            newState: payload.newState,
        });
        this.logger.warn(`[HIGH RISK] Role changed: ${payload.resourceId} by ${payload.userId}`);
    }

    /**
     * 通用審計日誌寫入
     */
    private async logAudit(data: {
        action: string;
        resourceType: string;
        resourceId: string;
        userId?: string;
        userName?: string;
        description?: string;
        previousState?: Record<string, any>;
        newState?: Record<string, any>;
        metadata?: Record<string, any>;
    }): Promise<AuditLog> {
        try {
            const log = this.auditLogRepo.create({
                action: data.action,
                resourceType: data.resourceType,
                resourceId: data.resourceId,
                userId: data.userId,
                userName: data.userName,
                description: data.description,
                previousState: data.previousState,
                newState: data.newState,
                metadata: data.metadata,
                success: true,
            });
            const saved = await this.auditLogRepo.save(log);
            this.logger.debug(`Audit logged: ${data.action} on ${data.resourceType}/${data.resourceId}`);
            return saved;
        } catch (error) {
            this.logger.error(`Failed to log audit: ${error.message}`, error.stack);
            throw error;
        }
    }
}
