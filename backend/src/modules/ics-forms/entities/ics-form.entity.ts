import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';

/**
 * ICS Form Types (FEMA ICS/NIMS Standard)
 */
export enum IcsFormType {
    ICS_201 = 'ICS-201',  // Incident Briefing
    ICS_202 = 'ICS-202',  // Incident Objectives
    ICS_203 = 'ICS-203',  // Organization Assignment List
    ICS_204 = 'ICS-204',  // Assignment List
    ICS_205 = 'ICS-205',  // Incident Radio Communications Plan
    ICS_206 = 'ICS-206',  // Medical Plan
    ICS_207 = 'ICS-207',  // Incident Organization Chart
    ICS_209 = 'ICS-209',  // Incident Status Summary
    ICS_213 = 'ICS-213',  // General Message
    ICS_214 = 'ICS-214',  // Activity Log
}

export enum IcsFormStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    APPROVED = 'approved',
    SUPERSEDED = 'superseded',
}

/**
 * ICS Form Entity
 *
 * Universal entity for all ICS form types.
 * Form-specific data is stored in the `formData` JSONB column.
 */
@Entity('ics_forms')
@Index(['incidentId', 'formType'])
@Index(['missionSessionId'])
export class IcsForm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Parent incident/event ID */
    @Column({ name: 'incident_id', type: 'uuid' })
    incidentId: string;

    /** Mission session ID (if applicable) */
    @Column({ name: 'mission_session_id', type: 'uuid', nullable: true })
    missionSessionId?: string;

    /** ICS Form Type (e.g., ICS-201, ICS-202) */
    @Column({ name: 'form_type', type: 'enum', enum: IcsFormType })
    formType: IcsFormType;

    /** Form version number (for tracking revisions) */
    @Column({ name: 'version', type: 'int', default: 1 })
    version: number;

    /** Form status */
    @Column({ type: 'enum', enum: IcsFormStatus, default: IcsFormStatus.DRAFT })
    status: IcsFormStatus;

    /** Incident Name */
    @Column({ name: 'incident_name', length: 255 })
    incidentName: string;

    /** Operational Period: From */
    @Column({ name: 'operational_period_from', type: 'timestamp with time zone', nullable: true })
    operationalPeriodFrom?: Date;

    /** Operational Period: To */
    @Column({ name: 'operational_period_to', type: 'timestamp with time zone', nullable: true })
    operationalPeriodTo?: Date;

    /** Prepared By (Account ID) */
    @Column({ name: 'prepared_by', type: 'uuid' })
    preparedBy: string;

    /** Prepared By Name (denormalized for display) */
    @Column({ name: 'prepared_by_name', length: 100 })
    preparedByName: string;

    /** Approved By (Account ID, nullable) */
    @Column({ name: 'approved_by', type: 'uuid', nullable: true })
    approvedBy?: string;

    /** Approved By Name */
    @Column({ name: 'approved_by_name', length: 100, nullable: true })
    approvedByName?: string;

    /** Approval timestamp */
    @Column({ name: 'approved_at', type: 'timestamp with time zone', nullable: true })
    approvedAt?: Date;

    /**
     * Form-specific data (JSONB)
     *
     * Structure varies by form type:
     * - ICS-201: { mapSketch, currentSituation, currentObjectives, ... }
     * - ICS-202: { objectives, weatherForecast, safetyMessage, ... }
     * - ICS-203: { agencyRepresentatives, icStaff, ... }
     * - etc.
     */
    @Column({ name: 'form_data', type: 'jsonb', default: '{}' })
    formData: Record<string, any>;

    /** Attachments (file references) */
    @Column({ type: 'jsonb', default: '[]' })
    attachments: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

/**
 * ICS-201 Incident Briefing Form Data Structure
 */
export interface Ics201FormData {
    mapSketch?: string; // Base64 or file reference
    currentSituation?: string;
    initialResponseObjectives?: string[];
    currentActions?: string;
    plannedActions?: string;
    currentOrganization?: {
        incidentCommander?: string;
        operations?: string;
        planning?: string;
        logistics?: string;
        finance?: string;
    };
    resourcesSummary?: Array<{
        resourceType: string;
        quantity: number;
        location: string;
        status: string;
    }>;
}

/**
 * ICS-202 Incident Objectives Form Data Structure
 */
export interface Ics202FormData {
    objectives: string[];
    weatherForecast?: string;
    generalSafetyMessage?: string;
    siteAccessibility?: string;
    attachedMaps?: string[];
}

/**
 * ICS-203 Organization Assignment List Form Data Structure
 */
export interface Ics203FormData {
    incidentCommander?: {
        name: string;
        agency: string;
        phone?: string;
    };
    deputyIC?: Array<{
        name: string;
        agency: string;
    }>;
    safetyOfficer?: {
        name: string;
        agency: string;
    };
    publicInfoOfficer?: {
        name: string;
        agency: string;
    };
    liaisonOfficer?: {
        name: string;
        agency: string;
    };
    operationsSection?: Array<{
        position: string;
        name: string;
        agency: string;
    }>;
    planningSection?: Array<{
        position: string;
        name: string;
        agency: string;
    }>;
    logisticsSection?: Array<{
        position: string;
        name: string;
        agency: string;
    }>;
    financeSection?: Array<{
        position: string;
        name: string;
        agency: string;
    }>;
}

/**
 * ICS-204 Assignment List Form Data Structure
 */
export interface Ics204FormData {
    branchName?: string;
    divisionGroup?: string;
    operationsPeriod?: string;
    resources: Array<{
        resourceIdentifier: string;
        leader: string;
        numberOfPersonnel: number;
        contact: string;
        reportingLocation: string;
        requestedArrivalTime?: string;
    }>;
    workAssignments: string;
    specialInstructions?: string;
    communicationsPlan?: {
        function: string;
        frequency: string;
        channel: string;
    }[];
}

/**
 * ICS-205 Radio Communications Plan Form Data Structure
 */
export interface Ics205FormData {
    channels: Array<{
        zone: string;
        channel: string;
        function: string;
        frequencyRx: string;
        frequencyTx: string;
        mode: string;
        remarks?: string;
    }>;
    specialInstructions?: string;
}

/**
 * ICS-206 Medical Plan Form Data Structure
 */
export interface Ics206FormData {
    medicalAidStations: Array<{
        name: string;
        location: string;
        contact: string;
        paramedicsOnSite: boolean;
    }>;
    transportationAmbulances: Array<{
        name: string;
        location: string;
        contact: string;
        level: string; // ALS/BLS
    }>;
    hospitals: Array<{
        name: string;
        address: string;
        phone: string;
        travelTime: string;
        helipad: boolean;
        burnCenter: boolean;
        traumaCenter: boolean;
    }>;
    medicalEmergencyProcedures?: string;
}

/**
 * ICS-207 Incident Organization Chart Form Data Structure
 */
export interface Ics207FormData {
    orgChartImageUrl?: string;
    positions: Array<{
        title: string;
        name: string;
        agency?: string;
        parentPosition?: string;
    }>;
}

/**
 * ICS-209 Incident Status Summary Form Data Structure
 */
export interface Ics209FormData {
    incidentType?: string;
    incidentCause?: string;
    startDate?: string;
    percentContained?: number;
    expectedContainmentDate?: string;
    sizeArea?: string;
    threatsToLife?: string[];
    threatsToProperty?: string[];
    currentThreats?: string;
    criticalNeeds?: string[];
    significantEvents?: string[];
    plannedActions?: string;
    projectedMilestones?: string[];
    costToDate?: number;
    injuries?: number;
    fatalities?: number;
    evacuations?: number;
    structuresThreatened?: number;
    structuresDestroyed?: number;
}

/**
 * ICS-213 General Message Form Data Structure
 */
export interface Ics213FormData {
    to: string;
    toPosition?: string;
    from: string;
    fromPosition?: string;
    subject: string;
    dateTime: string;
    message: string;
    replyRequired: boolean;
    replyText?: string;
    repliedBy?: string;
    repliedAt?: string;
}

/**
 * ICS-214 Activity Log Form Data Structure
 */
export interface Ics214FormData {
    unitName: string;
    unitLeader: string;
    personnelAssigned: Array<{
        name: string;
        icPosition: string;
        homeAgency: string;
    }>;
    activityLog: Array<{
        time: string;
        majorEvents: string;
    }>;
}
