/**
 * event-types.ts
 * 
 * v2.1 SSOT: 標準事件名稱常數
 * 所有事件都遵循 domain.entity.action 命名規則
 */

// ============ Incidents Domain ============
export const INCIDENT_EVENTS = {
    CREATED: 'incidents.created',
    UPDATED: 'incidents.updated',
    STATUS_CHANGED: 'incidents.status_changed',
    SEVERITY_CHANGED: 'incidents.severity_changed',
    CLOSED: 'incidents.closed',
} as const;

// ============ Intake Domain ============
export const INTAKE_EVENTS = {
    SUBMITTED: 'intake.submitted',
    TRIAGED: 'intake.triaged',
    ASSIGNED: 'intake.assigned',
    REJECTED: 'intake.rejected',
} as const;

// ============ Tasks Domain ============
export const TASK_EVENTS = {
    CREATED: 'tasks.created',
    UPDATED: 'tasks.updated',
    ASSIGNED: 'tasks.assigned',
    ACKNOWLEDGED: 'tasks.acknowledged',
    IN_PROGRESS: 'tasks.in_progress',
    COMPLETED: 'tasks.completed',
    CANCELLED: 'tasks.cancelled',
} as const;

// ============ Dispatch Domain ============
export const DISPATCH_EVENTS = {
    SUGGESTED: 'dispatch.suggested',
    ACCEPTED: 'dispatch.accepted',
    REJECTED: 'dispatch.rejected',
} as const;

// ============ Logistics Domain ============
export const LOGISTICS_EVENTS = {
    INVENTORY_TXN_CREATED: 'logistics.inventory_txn.created',
    APPROVAL_REQUESTED: 'logistics.approval.requested',
    APPROVAL_APPROVED: 'logistics.approval.approved',
    APPROVAL_REJECTED: 'logistics.approval.rejected',
    RESOURCE_MATCHED: 'logistics.resource_matched',
} as const;

// ============ Workforce Domain ============
export const WORKFORCE_EVENTS = {
    SHIFT_UPDATED: 'workforce.shift.updated',
    ATTENDANCE_CHECKED_IN: 'workforce.attendance.checked_in',
    ATTENDANCE_CHECKED_OUT: 'workforce.attendance.checked_out',
    TRAINING_COMPLETED: 'workforce.training.completed',
    PERFORMANCE_UPDATED: 'workforce.performance.updated',
} as const;

// ============ Geo/Intel Domain ============
export const GEO_EVENTS = {
    ALERT_RECEIVED: 'geo.alert.received',
    WEATHER_UPDATED: 'geo.weather.updated',
} as const;

// ============ Notification Domain ============
export const NOTIFICATION_EVENTS = {
    SENT: 'notifications.sent',
    DELIVERED: 'notifications.delivered',
    READ: 'notifications.read',
} as const;

// ============ Audit Domain (高風險) ============
export const AUDIT_EVENTS = {
    LOGGED: 'audit.logged',
    PERMISSION_CHANGED: 'audit.permission_changed',
    ROLE_CHANGED: 'audit.role_changed',
    BREAK_GLASS: 'audit.break_glass',
} as const;

// ============ Analytics Domain ============
export const ANALYTICS_EVENTS = {
    REPORT_JOB_COMPLETED: 'reports.job.completed',
    AAR_PUBLISHED: 'analytics.aar.published',
    AI_SUMMARY_GENERATED: 'analytics.ai_summary.generated',
} as const;

// ============ 所有事件類型 (合併) ============
export const EVENT_TYPES = {
    ...INCIDENT_EVENTS,
    ...INTAKE_EVENTS,
    ...TASK_EVENTS,
    ...DISPATCH_EVENTS,
    ...LOGISTICS_EVENTS,
    ...WORKFORCE_EVENTS,
    ...GEO_EVENTS,
    ...NOTIFICATION_EVENTS,
    ...AUDIT_EVENTS,
    ...ANALYTICS_EVENTS,
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// ============ 事件 Payload 介面 ============
export interface BaseEventPayload {
    timestamp?: Date;
    correlationId?: string;
    userId?: string;
    tenantId?: string;
}

export interface IncidentEventPayload extends BaseEventPayload {
    incidentId: string;
    title?: string;
    status?: string;
    severity?: string;
    source?: string;
}

export interface IntakeEventPayload extends BaseEventPayload {
    intakeId: string;
    incidentId: string;
    sourceType: string;
}

export interface TaskEventPayload extends BaseEventPayload {
    taskId: string;
    incidentId?: string;
    assigneeId?: string;
    status?: string;
}

export interface AuditEventPayload extends BaseEventPayload {
    action: string;
    resourceType: string;
    resourceId: string;
    description?: string;
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
}
