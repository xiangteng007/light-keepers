/**
 * NGO Coordinator Roles Service
 * NGO 協調者角色服務
 * 
 * Phase 4 進階功能：
 * - Cluster Lead (叢集領導)
 * - NGO Liaison (NGO 聯絡官)
 * - OCHA Coordinator (OCHA 協調員)
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 擴展角色
 */
export enum NgoRole {
    // 現有角色 (對照)
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    COMMANDER = 'COMMANDER',
    COORDINATOR = 'COORDINATOR',
    FIELD_OPERATOR = 'FIELD_OPERATOR',
    VOLUNTEER = 'VOLUNTEER',
    
    // 新增 NGO 專用角色
    CLUSTER_LEAD = 'CLUSTER_LEAD',           // Cluster 領導 (OCHA)
    NGO_LIAISON = 'NGO_LIAISON',             // NGO 聯絡官
    OCHA_COORDINATOR = 'OCHA_COORDINATOR',   // OCHA 協調員
    DONOR_LIAISON = 'DONOR_LIAISON',         // 捐贈者聯絡
    MEDIA_OFFICER = 'MEDIA_OFFICER',         // 媒體官
    SECURITY_FOCAL = 'SECURITY_FOCAL',       // 安全聯絡人
}

/**
 * Cluster 類型 (依 OCHA 標準)
 */
export enum ClusterType {
    SHELTER = 'shelter',                     // 庇護所
    WASH = 'wash',                           // 供水/衛生
    HEALTH = 'health',                       // 醫療衛生
    FOOD_SECURITY = 'food_security',         // 糧食安全
    NUTRITION = 'nutrition',                 // 營養
    PROTECTION = 'protection',               // 保護
    EDUCATION = 'education',                 // 教育
    EARLY_RECOVERY = 'early_recovery',       // 早期復原
    EMERGENCY_TELECOM = 'emergency_telecom', // 緊急通訊
    LOGISTICS = 'logistics',                 // 後勤
    CAMP_COORDINATION = 'camp_coordination', // 營區協調
}

/**
 * NGO 協調者資訊
 */
export interface NgoCoordinator {
    id: string;
    userId: string;
    role: NgoRole;
    organization: string;
    clusters?: ClusterType[];
    regions?: string[];
    permissions: NgoPermission[];
    assignedAt: Date;
    expiresAt?: Date;
    approvedBy: string;
}

/**
 * NGO 專屬權限
 */
export enum NgoPermission {
    // Cluster Lead
    MANAGE_CLUSTER_MEETINGS = 'manage_cluster_meetings',
    ASSIGN_CLUSTER_MEMBERS = 'assign_cluster_members',
    PUBLISH_CLUSTER_REPORTS = 'publish_cluster_reports',
    COORDINATE_GAPS = 'coordinate_gaps',
    
    // NGO Liaison
    MANAGE_NGO_REGISTRY = 'manage_ngo_registry',
    APPROVE_NGO_PARTICIPATION = 'approve_ngo_participation',
    ISSUE_ACCESS_PASSES = 'issue_access_passes',
    
    // OCHA Coordinator
    MANAGE_3W_MATRIX = 'manage_3w_matrix',
    PUBLISH_SITREPS = 'publish_sitreps',
    COORDINATE_APPEALS = 'coordinate_appeals',
    ACCESS_FINANCIAL_TRACKING = 'access_financial_tracking',
    
    // Cross-cutting
    VIEW_ALL_ORGANIZATIONS = 'view_all_organizations',
    COORDINATE_RESOURCES = 'coordinate_resources',
    MANAGE_SECURITY_INFO = 'manage_security_info',
}

/**
 * Cluster 會議
 */
export interface ClusterMeeting {
    id: string;
    cluster: ClusterType;
    title: string;
    scheduledAt: Date;
    venue: string;
    virtualLink?: string;
    agenda: string[];
    participants: string[];
    minutesUrl?: string;
    actionItems?: Array<{
        description: string;
        assignee: string;
        dueDate: Date;
        status: 'pending' | 'in_progress' | 'completed';
    }>;
}

/**
 * NGO 協調者角色服務
 */
@Injectable()
export class NgoCoordinatorService {
    private readonly logger = new Logger(NgoCoordinatorService.name);
    
    // 協調者登錄
    private coordinators: Map<string, NgoCoordinator> = new Map();
    
    // 會議
    private meetings: Map<string, ClusterMeeting> = new Map();
    
    // 角色權限對應
    private rolePermissions: Map<NgoRole, NgoPermission[]> = new Map([
        [NgoRole.CLUSTER_LEAD, [
            NgoPermission.MANAGE_CLUSTER_MEETINGS,
            NgoPermission.ASSIGN_CLUSTER_MEMBERS,
            NgoPermission.PUBLISH_CLUSTER_REPORTS,
            NgoPermission.COORDINATE_GAPS,
            NgoPermission.VIEW_ALL_ORGANIZATIONS,
        ]],
        [NgoRole.NGO_LIAISON, [
            NgoPermission.MANAGE_NGO_REGISTRY,
            NgoPermission.APPROVE_NGO_PARTICIPATION,
            NgoPermission.ISSUE_ACCESS_PASSES,
            NgoPermission.VIEW_ALL_ORGANIZATIONS,
        ]],
        [NgoRole.OCHA_COORDINATOR, [
            NgoPermission.MANAGE_3W_MATRIX,
            NgoPermission.PUBLISH_SITREPS,
            NgoPermission.COORDINATE_APPEALS,
            NgoPermission.ACCESS_FINANCIAL_TRACKING,
            NgoPermission.VIEW_ALL_ORGANIZATIONS,
            NgoPermission.COORDINATE_RESOURCES,
        ]],
        [NgoRole.SECURITY_FOCAL, [
            NgoPermission.MANAGE_SECURITY_INFO,
            NgoPermission.VIEW_ALL_ORGANIZATIONS,
        ]],
    ]);

    constructor(private readonly eventEmitter: EventEmitter2) {}

    // ==================== 協調者管理 ====================

    /**
     * 指派協調者角色
     */
    assignCoordinatorRole(
        userId: string,
        role: NgoRole,
        organization: string,
        options: {
            clusters?: ClusterType[];
            regions?: string[];
            expiresAt?: Date;
        },
        approvedBy: string,
    ): NgoCoordinator {
        const coordinator: NgoCoordinator = {
            id: `coord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            userId,
            role,
            organization,
            clusters: options.clusters,
            regions: options.regions,
            permissions: this.rolePermissions.get(role) || [],
            assignedAt: new Date(),
            expiresAt: options.expiresAt,
            approvedBy,
        };

        this.coordinators.set(coordinator.id, coordinator);

        this.eventEmitter.emit('ngo.coordinator.assigned', {
            coordinatorId: coordinator.id,
            userId,
            role,
            organization,
        });

        this.logger.log(`Coordinator assigned: ${userId} as ${role} for ${organization}`);

        return coordinator;
    }

    /**
     * 撤銷協調者角色
     */
    revokeCoordinatorRole(coordinatorId: string, reason: string): boolean {
        const coordinator = this.coordinators.get(coordinatorId);
        if (!coordinator) return false;

        this.coordinators.delete(coordinatorId);

        this.eventEmitter.emit('ngo.coordinator.revoked', {
            coordinatorId,
            userId: coordinator.userId,
            role: coordinator.role,
            reason,
        });

        this.logger.log(`Coordinator revoked: ${coordinatorId}, reason: ${reason}`);

        return true;
    }

    /**
     * 取得使用者的協調者角色
     */
    getUserCoordinatorRoles(userId: string): NgoCoordinator[] {
        return Array.from(this.coordinators.values())
            .filter(c => c.userId === userId && (!c.expiresAt || c.expiresAt > new Date()));
    }

    /**
     * 檢查權限
     */
    hasPermission(userId: string, permission: NgoPermission): boolean {
        const roles = this.getUserCoordinatorRoles(userId);
        return roles.some(r => r.permissions.includes(permission));
    }

    /**
     * 取得 Cluster 的負責人
     */
    getClusterLeads(cluster: ClusterType): NgoCoordinator[] {
        return Array.from(this.coordinators.values())
            .filter(c => 
                c.role === NgoRole.CLUSTER_LEAD && 
                c.clusters?.includes(cluster) &&
                (!c.expiresAt || c.expiresAt > new Date())
            );
    }

    // ==================== Cluster 會議 ====================

    /**
     * 排程 Cluster 會議
     */
    scheduleClusterMeeting(
        cluster: ClusterType,
        meeting: Omit<ClusterMeeting, 'id' | 'cluster'>,
    ): ClusterMeeting {
        const fullMeeting: ClusterMeeting = {
            ...meeting,
            id: `mtg_${Date.now()}`,
            cluster,
        };

        this.meetings.set(fullMeeting.id, fullMeeting);

        this.eventEmitter.emit('ngo.cluster_meeting.scheduled', fullMeeting);

        return fullMeeting;
    }

    /**
     * 取得 Cluster 會議
     */
    getClusterMeetings(cluster: ClusterType): ClusterMeeting[] {
        return Array.from(this.meetings.values())
            .filter(m => m.cluster === cluster)
            .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
    }

    /**
     * 更新會議記錄
     */
    updateMeetingMinutes(meetingId: string, minutesUrl: string, actionItems: ClusterMeeting['actionItems']): boolean {
        const meeting = this.meetings.get(meetingId);
        if (!meeting) return false;

        meeting.minutesUrl = minutesUrl;
        meeting.actionItems = actionItems;

        return true;
    }

    // ==================== 組織協調 ====================

    /**
     * 取得區域內所有協調者
     */
    getRegionalCoordinators(region: string): NgoCoordinator[] {
        return Array.from(this.coordinators.values())
            .filter(c => 
                c.regions?.includes(region) &&
                (!c.expiresAt || c.expiresAt > new Date())
            );
    }

    /**
     * 取得組織的協調者
     */
    getOrganizationCoordinators(organization: string): NgoCoordinator[] {
        return Array.from(this.coordinators.values())
            .filter(c => c.organization === organization);
    }

    /**
     * 產生協調者目錄
     */
    generateCoordinatorDirectory(): {
        byRole: Record<NgoRole, NgoCoordinator[]>;
        byCluster: Record<ClusterType, NgoCoordinator[]>;
        byOrganization: Record<string, NgoCoordinator[]>;
    } {
        const coordinators = Array.from(this.coordinators.values())
            .filter(c => !c.expiresAt || c.expiresAt > new Date());

        const byRole: Record<string, NgoCoordinator[]> = {};
        const byCluster: Record<string, NgoCoordinator[]> = {};
        const byOrganization: Record<string, NgoCoordinator[]> = {};

        for (const coord of coordinators) {
            // By role
            if (!byRole[coord.role]) byRole[coord.role] = [];
            byRole[coord.role].push(coord);

            // By cluster
            for (const cluster of coord.clusters || []) {
                if (!byCluster[cluster]) byCluster[cluster] = [];
                byCluster[cluster].push(coord);
            }

            // By organization
            if (!byOrganization[coord.organization]) byOrganization[coord.organization] = [];
            byOrganization[coord.organization].push(coord);
        }

        return {
            byRole: byRole as Record<NgoRole, NgoCoordinator[]>,
            byCluster: byCluster as Record<ClusterType, NgoCoordinator[]>,
            byOrganization,
        };
    }

    /**
     * 取得統計
     */
    getStats(): {
        totalCoordinators: number;
        byRole: Record<NgoRole, number>;
        activeClusters: number;
        upcomingMeetings: number;
    } {
        const coordinators = Array.from(this.coordinators.values())
            .filter(c => !c.expiresAt || c.expiresAt > new Date());

        const byRole: Record<string, number> = {};
        for (const coord of coordinators) {
            byRole[coord.role] = (byRole[coord.role] || 0) + 1;
        }

        const activeClusters = new Set(
            coordinators.flatMap(c => c.clusters || [])
        ).size;

        const upcomingMeetings = Array.from(this.meetings.values())
            .filter(m => m.scheduledAt > new Date())
            .length;

        return {
            totalCoordinators: coordinators.length,
            byRole: byRole as Record<NgoRole, number>,
            activeClusters,
            upcomingMeetings,
        };
    }
}
