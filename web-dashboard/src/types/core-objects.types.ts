/**
 * core-objects.types.ts
 * 
 * P2: Core Object API Interfaces
 * 
 * 6 Core Objects for the Lightkeepers Disaster Prevention Platform:
 * - Alert (外部警報)
 * - Incident (事件)
 * - Task (任務)
 * - Resource (資源)
 * - Person (人員)
 * - Comms (通訊)
 * 
 * Plus unified Attachment abstraction
 */

// ============================================================
// Common Types
// ============================================================

export type UUID = string;
export type ISODateString = string;

export enum EntityStatus {
    Active = 'active',
    Inactive = 'inactive',
    Archived = 'archived',
    Deleted = 'deleted',
}

export interface BaseEntity {
    id: UUID;
    createdAt: ISODateString;
    updatedAt: ISODateString;
    createdBy?: UUID;
    updatedBy?: UUID;
    tenantId?: UUID;
}

export interface GeoLocation {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
    address?: string;
    placeId?: string;
}

// ============================================================
// 1. Alert (外部警報)
// ============================================================

export enum AlertSource {
    NCDR = 'ncdr',           // 國家災害防救科技中心
    CWA = 'cwa',             // 中央氣象署
    USGS = 'usgs',           // 地震
    CrowdReport = 'crowd',   // 群眾回報
    SocialMedia = 'social',  // 社群監測
    IoT = 'iot',             // IoT 感測器
    Manual = 'manual',       // 手動建立
}

export enum AlertSeverity {
    Info = 'info',
    Minor = 'minor',
    Moderate = 'moderate',
    Severe = 'severe',
    Extreme = 'extreme',
}

export enum AlertCategory {
    Earthquake = 'earthquake',
    Typhoon = 'typhoon',
    Flood = 'flood',
    Fire = 'fire',
    Landslide = 'landslide',
    Tsunami = 'tsunami',
    Pandemic = 'pandemic',
    Industrial = 'industrial',
    Other = 'other',
}

export interface Alert extends BaseEntity {
    source: AlertSource;
    externalId?: string;      // 外部系統 ID
    category: AlertCategory;
    severity: AlertSeverity;
    title: string;
    description: string;
    location?: GeoLocation;
    affectedArea?: GeoJSON.Geometry;
    validFrom: ISODateString;
    validTo?: ISODateString;
    rawData?: Record<string, unknown>;
    linkedIncidentId?: UUID;  // 關聯的事件
}

// ============================================================
// 2. Incident (事件)
// ============================================================

export enum IncidentStatus {
    Reported = 'reported',       // 已通報
    Confirmed = 'confirmed',     // 已確認
    InProgress = 'in_progress',  // 處理中
    Contained = 'contained',     // 已控制
    Resolved = 'resolved',       // 已解決
    Closed = 'closed',           // 已結案
}

export enum IncidentPriority {
    P1 = 1,  // 最高優先（生命威脅）
    P2 = 2,  // 高優先（重大財損）
    P3 = 3,  // 中優先
    P4 = 4,  // 低優先
    P5 = 5,  // 最低
}

export interface Incident extends BaseEntity {
    incidentNumber: string;      // 事件編號 (e.g., INC-2026-00123)
    title: string;
    description: string;
    status: IncidentStatus;
    priority: IncidentPriority;
    category: AlertCategory;
    location: GeoLocation;
    commander?: UUID;            // 指揮官 Person ID
    reportedBy?: UUID;           // 通報人
    reportedAt: ISODateString;
    confirmedAt?: ISODateString;
    resolvedAt?: ISODateString;
    closedAt?: ISODateString;
    linkedAlertIds: UUID[];      // 關聯的警報
    linkedTaskIds: UUID[];       // 關聯的任務
    sessionId?: UUID;            // Mission Session ID
    estimatedAffectedPeople?: number;
    actualCasualties?: {
        dead: number;
        injured: number;
        missing: number;
        evacuated: number;
    };
    tags: string[];
    attachments: UUID[];
}

// ============================================================
// 3. Task (任務)
// ============================================================

export enum TaskStatus {
    Pending = 'pending',
    Assigned = 'assigned',
    InProgress = 'in_progress',
    OnHold = 'on_hold',
    Completed = 'completed',
    Cancelled = 'cancelled',
    Failed = 'failed',
}

export enum TaskPriority {
    Critical = 'critical',
    High = 'high',
    Medium = 'medium',
    Low = 'low',
}

export enum TaskType {
    Search = 'search',           // 搜索
    Rescue = 'rescue',           // 救援
    Medical = 'medical',         // 醫療
    Evacuation = 'evacuation',   // 疏散
    Logistics = 'logistics',     // 後勤
    Assessment = 'assessment',   // 評估
    Patrol = 'patrol',           // 巡邏
    Communication = 'communication',
    Other = 'other',
}

export interface Task extends BaseEntity {
    taskNumber: string;          // 任務編號
    incidentId: UUID;            // 所屬事件
    sessionId?: UUID;            // Mission Session
    type: TaskType;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    location?: GeoLocation;
    targetArea?: GeoJSON.Geometry;
    assignedTeamId?: UUID;
    assignedPersonIds: UUID[];
    requiredResourceIds: UUID[];
    estimatedDuration?: number;  // 分鐘
    actualDuration?: number;
    scheduledStartAt?: ISODateString;
    scheduledEndAt?: ISODateString;
    actualStartAt?: ISODateString;
    actualEndAt?: ISODateString;
    parentTaskId?: UUID;         // 父任務（子任務支援）
    childTaskIds: UUID[];
    checklistItems: {
        id: string;
        text: string;
        completed: boolean;
        completedAt?: ISODateString;
        completedBy?: UUID;
    }[];
    notes: string;
    attachments: UUID[];
}

// ============================================================
// 4. Resource (資源)
// ============================================================

export enum ResourceCategory {
    Equipment = 'equipment',     // 裝備
    Vehicle = 'vehicle',         // 車輛
    Supply = 'supply',           // 物資
    Facility = 'facility',       // 設施
    Donation = 'donation',       // 捐贈
}

export enum ResourceStatus {
    Available = 'available',
    InUse = 'in_use',
    Reserved = 'reserved',
    Maintenance = 'maintenance',
    Depleted = 'depleted',
    Damaged = 'damaged',
}

export interface Resource extends BaseEntity {
    name: string;
    category: ResourceCategory;
    type: string;                // 細分類型
    sku?: string;
    status: ResourceStatus;
    quantity: number;
    unit: string;
    location?: GeoLocation;
    warehouseId?: UUID;
    qrCode?: string;
    nfcTag?: string;
    expiryDate?: ISODateString;
    lastInventoryAt?: ISODateString;
    assignedToTaskId?: UUID;
    assignedToPersonId?: UUID;
    specifications?: Record<string, unknown>;
    images: UUID[];
}

// ============================================================
// 5. Person (人員)
// ============================================================

export enum PersonRole {
    Volunteer = 'volunteer',
    Staff = 'staff',
    Commander = 'commander',
    TeamLeader = 'team_leader',
    Medical = 'medical',
    Driver = 'driver',
    Specialist = 'specialist',
    Observer = 'observer',
}

export enum PersonAvailability {
    Available = 'available',
    OnDuty = 'on_duty',
    OnBreak = 'on_break',
    Unavailable = 'unavailable',
    OnLeave = 'on_leave',
}

export interface Person extends BaseEntity {
    accountId?: UUID;            // 關聯帳戶
    employeeNumber?: string;
    name: string;
    email?: string;
    phone?: string;
    roles: PersonRole[];
    availability: PersonAvailability;
    currentLocation?: GeoLocation;
    lastLocationUpdate?: ISODateString;
    teamId?: UUID;
    organizationId?: UUID;
    skills: string[];
    certifications: {
        type: string;
        issuedAt: ISODateString;
        expiresAt?: ISODateString;
        verified: boolean;
    }[];
    trainingRecords: UUID[];
    fatigueLevel?: number;       // 0-100 疲勞度
    lastRestAt?: ISODateString;
    photo?: UUID;
}

// ============================================================
// 6. Comms (通訊)
// ============================================================

export enum CommsChannel {
    Push = 'push',
    SMS = 'sms',
    Email = 'email',
    Line = 'line',
    Telegram = 'telegram',
    Slack = 'slack',
    PTT = 'ptt',               // Push-to-Talk
    Radio = 'radio',
    InApp = 'in_app',
}

export enum CommsStatus {
    Pending = 'pending',
    Sent = 'sent',
    Delivered = 'delivered',
    Read = 'read',
    Failed = 'failed',
}

export enum CommsPriority {
    Emergency = 'emergency',   // 緊急（立即送達）
    High = 'high',
    Normal = 'normal',
    Low = 'low',
}

export interface Comms extends BaseEntity {
    channel: CommsChannel;
    status: CommsStatus;
    priority: CommsPriority;
    subject?: string;
    content: string;
    senderId?: UUID;
    recipientIds: UUID[];
    recipientGroups?: string[];
    sentAt?: ISODateString;
    deliveredAt?: ISODateString;
    readAt?: ISODateString;
    relatedIncidentId?: UUID;
    relatedTaskId?: UUID;
    metadata?: Record<string, unknown>;
    attachments: UUID[];
}

// ============================================================
// 7. Attachment (統一附件)
// ============================================================

export enum AttachmentType {
    Image = 'image',
    Video = 'video',
    Audio = 'audio',
    Document = 'document',
    Spreadsheet = 'spreadsheet',
    PDF = 'pdf',
    Other = 'other',
}

export interface Attachment extends BaseEntity {
    filename: string;
    originalFilename: string;
    mimeType: string;
    type: AttachmentType;
    size: number;               // bytes
    storageUrl: string;         // GCS/S3 URL
    thumbnailUrl?: string;
    uploadedBy: UUID;
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;      // 秒（影音）
        geoLocation?: GeoLocation;
        capturedAt?: ISODateString;
    };
}

// ============================================================
// Domain Events (P3: Outbox Pattern)
// ============================================================

export enum DomainEventType {
    // Alert Events
    AlertReceived = 'alert.received',
    AlertUpdated = 'alert.updated',
    AlertExpired = 'alert.expired',

    // Incident Events
    IncidentCreated = 'incident.created',
    IncidentUpdated = 'incident.updated',
    IncidentStatusChanged = 'incident.status_changed',
    IncidentClosed = 'incident.closed',

    // Task Events
    TaskCreated = 'task.created',
    TaskAssigned = 'task.assigned',
    TaskStarted = 'task.started',
    TaskCompleted = 'task.completed',
    TaskFailed = 'task.failed',

    // Resource Events
    ResourceAllocated = 'resource.allocated',
    ResourceReleased = 'resource.released',
    ResourceDepleted = 'resource.depleted',

    // Person Events
    PersonCheckedIn = 'person.checked_in',
    PersonCheckedOut = 'person.checked_out',
    PersonLocationUpdated = 'person.location_updated',
    PersonFatigueFlagged = 'person.fatigue_flagged',

    // Comms Events
    CommsQueued = 'comms.queued',
    CommsSent = 'comms.sent',
    CommsDelivered = 'comms.delivered',
    CommsFailed = 'comms.failed',
}

export interface DomainEvent {
    eventId: UUID;
    eventType: DomainEventType;
    aggregateId: UUID;
    aggregateType: 'Alert' | 'Incident' | 'Task' | 'Resource' | 'Person' | 'Comms' | 'Attachment';
    payload: Record<string, unknown>;
    metadata: {
        userId?: UUID;
        tenantId?: UUID;
        correlationId?: UUID;
        timestamp: ISODateString;
        version: number;
    };
    publishedAt?: ISODateString;
    processedAt?: ISODateString;
}

// ============================================================
// P4: Storage Abstraction
// ============================================================

export interface StorageProvider {
    upload(file: File | Buffer, path: string): Promise<{ url: string; size: number }>;
    download(path: string): Promise<Buffer>;
    delete(path: string): Promise<void>;
    getSignedUrl(path: string, expiresIn?: number): Promise<string>;
    exists(path: string): Promise<boolean>;
}

export interface StorageConfig {
    provider: 'gcs' | 's3' | 'azure' | 'local';
    bucket: string;
    region?: string;
    publicUrl?: string;
}
