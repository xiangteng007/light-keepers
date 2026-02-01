/**
 * Cluster Coordination Service
 * 
 * OCHA Cluster System integration for humanitarian coordination
 * @see https://www.humanitarianresponse.info/en/coordination/clusters
 * 
 * 11 Global Clusters:
 * - Camp Coordination/Management (CCCM)
 * - Early Recovery
 * - Education
 * - Emergency Telecommunications
 * - Food Security
 * - Health
 * - Logistics
 * - Nutrition
 * - Protection
 * - Shelter
 * - Water, Sanitation and Hygiene (WASH)
 */
import { Injectable, Logger } from '@nestjs/common';

export enum ClusterType {
    CCCM = 'Camp Coordination and Camp Management',
    EARLY_RECOVERY = 'Early Recovery',
    EDUCATION = 'Education',
    EMERGENCY_TELECOM = 'Emergency Telecommunications',
    FOOD_SECURITY = 'Food Security',
    HEALTH = 'Health',
    LOGISTICS = 'Logistics',
    NUTRITION = 'Nutrition',
    PROTECTION = 'Protection',
    SHELTER = 'Shelter',
    WASH = 'Water, Sanitation and Hygiene',
}

export interface ClusterMembership {
    id: string;
    organizationId: string;
    organizationName: string;
    cluster: ClusterType;
    role: 'lead' | 'co-lead' | 'member' | 'observer';
    joinedAt: Date;
    contact: {
        name: string;
        email: string;
        phone?: string;
    };
}

export interface ClusterMeeting {
    id: string;
    cluster: ClusterType;
    title: string;
    scheduledAt: Date;
    location?: string;
    virtualLink?: string;
    agenda: string[];
    attendees: string[];
    minutes?: string;
    actionItems: ActionItem[];
}

export interface ActionItem {
    id: string;
    description: string;
    assignedTo: string;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue';
    completedAt?: Date;
}

export interface FourWEntry {
    who: string; // Organization
    what: string; // Activity/Intervention
    where: string; // Location
    when: { start: Date; end?: Date }; // Timeframe
    beneficiaries: number;
    cluster: ClusterType;
    status: 'planned' | 'ongoing' | 'completed';
}

@Injectable()
export class ClusterCoordinationService {
    private readonly logger = new Logger(ClusterCoordinationService.name);

    // In-memory storage (production: use database)
    private readonly memberships = new Map<string, ClusterMembership>();
    private readonly meetings = new Map<string, ClusterMeeting>();
    private readonly fourWEntries: FourWEntry[] = [];

    /**
     * Register organization to a cluster
     */
    async joinCluster(
        organizationId: string,
        organizationName: string,
        cluster: ClusterType,
        contact: ClusterMembership['contact'],
        role: ClusterMembership['role'] = 'member'
    ): Promise<ClusterMembership> {
        const membership: ClusterMembership = {
            id: `mem-${Date.now()}`,
            organizationId,
            organizationName,
            cluster,
            role,
            joinedAt: new Date(),
            contact,
        };

        this.memberships.set(membership.id, membership);
        this.logger.log(`Organization ${organizationName} joined ${cluster} cluster as ${role}`);
        return membership;
    }

    /**
     * Get cluster members
     */
    async getClusterMembers(cluster: ClusterType): Promise<ClusterMembership[]> {
        return Array.from(this.memberships.values())
            .filter(m => m.cluster === cluster)
            .sort((a, b) => {
                const roleOrder = { lead: 0, 'co-lead': 1, member: 2, observer: 3 };
                return roleOrder[a.role] - roleOrder[b.role];
            });
    }

    /**
     * Get all clusters and their membership count
     */
    async getClusterOverview(): Promise<{ cluster: ClusterType; memberCount: number; leadOrg?: string }[]> {
        const overview: Map<ClusterType, { count: number; lead?: string }> = new Map();

        for (const cluster of Object.values(ClusterType)) {
            overview.set(cluster, { count: 0 });
        }

        for (const membership of this.memberships.values()) {
            const current = overview.get(membership.cluster)!;
            current.count++;
            if (membership.role === 'lead') {
                current.lead = membership.organizationName;
            }
        }

        return Array.from(overview.entries()).map(([cluster, data]) => ({
            cluster,
            memberCount: data.count,
            leadOrg: data.lead,
        }));
    }

    /**
     * Schedule a cluster meeting
     */
    async scheduleMeeting(
        cluster: ClusterType,
        title: string,
        scheduledAt: Date,
        agenda: string[],
        location?: string,
        virtualLink?: string
    ): Promise<ClusterMeeting> {
        const meeting: ClusterMeeting = {
            id: `mtg-${Date.now()}`,
            cluster,
            title,
            scheduledAt,
            location,
            virtualLink,
            agenda,
            attendees: [],
            actionItems: [],
        };

        this.meetings.set(meeting.id, meeting);
        this.logger.log(`Scheduled ${cluster} cluster meeting: ${title}`);
        return meeting;
    }

    /**
     * Add action item from meeting
     */
    async addActionItem(
        meetingId: string,
        description: string,
        assignedTo: string,
        dueDate: Date
    ): Promise<ActionItem | null> {
        const meeting = this.meetings.get(meetingId);
        if (!meeting) return null;

        const actionItem: ActionItem = {
            id: `action-${Date.now()}`,
            description,
            assignedTo,
            dueDate,
            status: 'pending',
        };

        meeting.actionItems.push(actionItem);
        return actionItem;
    }

    /**
     * Submit 4W entry
     */
    async submitFourW(entry: Omit<FourWEntry, 'status'>): Promise<FourWEntry> {
        const fourW: FourWEntry = {
            ...entry,
            status: entry.when.end && entry.when.end < new Date() ? 'completed' : 
                    entry.when.start <= new Date() ? 'ongoing' : 'planned',
        };

        this.fourWEntries.push(fourW);
        this.logger.log(`4W entry submitted: ${entry.who} - ${entry.what} in ${entry.where}`);
        return fourW;
    }

    /**
     * Get 4W report by cluster
     */
    async getFourWByCluster(cluster: ClusterType): Promise<FourWEntry[]> {
        return this.fourWEntries.filter(e => e.cluster === cluster);
    }

    /**
     * Get 4W summary across all clusters
     */
    async getFourWSummary(): Promise<{
        totalActivities: number;
        byCluster: { cluster: ClusterType; count: number; beneficiaries: number }[];
        byStatus: { status: string; count: number }[];
    }> {
        const byCluster = new Map<ClusterType, { count: number; beneficiaries: number }>();
        const byStatus = new Map<string, number>();

        for (const entry of this.fourWEntries) {
            // By cluster
            const clusterData = byCluster.get(entry.cluster) || { count: 0, beneficiaries: 0 };
            clusterData.count++;
            clusterData.beneficiaries += entry.beneficiaries;
            byCluster.set(entry.cluster, clusterData);

            // By status
            byStatus.set(entry.status, (byStatus.get(entry.status) || 0) + 1);
        }

        return {
            totalActivities: this.fourWEntries.length,
            byCluster: Array.from(byCluster.entries()).map(([cluster, data]) => ({
                cluster,
                ...data,
            })),
            byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
                status,
                count,
            })),
        };
    }

    /**
     * Get upcoming meetings
     */
    async getUpcomingMeetings(cluster?: ClusterType): Promise<ClusterMeeting[]> {
        const now = new Date();
        return Array.from(this.meetings.values())
            .filter(m => 
                m.scheduledAt > now && 
                (!cluster || m.cluster === cluster)
            )
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }

    /**
     * Get pending action items
     */
    async getPendingActions(organizationId?: string): Promise<(ActionItem & { meetingId: string; cluster: ClusterType })[]> {
        const actions: (ActionItem & { meetingId: string; cluster: ClusterType })[] = [];

        for (const meeting of this.meetings.values()) {
            for (const action of meeting.actionItems) {
                if (action.status !== 'completed' && (!organizationId || action.assignedTo === organizationId)) {
                    actions.push({
                        ...action,
                        meetingId: meeting.id,
                        cluster: meeting.cluster,
                    });
                }
            }
        }

        return actions.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }
}
