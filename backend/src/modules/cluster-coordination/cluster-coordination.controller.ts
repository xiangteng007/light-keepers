/**
 * Cluster Coordination Controller
 * 
 * REST API for OCHA Cluster coordination
 */
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { ClusterCoordinationService, ClusterType, FourWEntry } from './cluster-coordination.service';

@ApiTags('Cluster Coordination')
@Controller('api/v1/clusters')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@ApiBearerAuth()
export class ClusterCoordinationController {
    constructor(private readonly clusterService: ClusterCoordinationService) { }

    // ========== Cluster Membership ==========

    @Get()
    @ApiOperation({ summary: 'Get cluster overview with member counts' })
    async getClusterOverview() {
        return this.clusterService.getClusterOverview();
    }

    @Get(':cluster/members')
    @ApiOperation({ summary: 'Get members of a specific cluster' })
    async getClusterMembers(@Param('cluster') cluster: ClusterType) {
        return this.clusterService.getClusterMembers(cluster);
    }

    @Post('join')
    @ApiOperation({ summary: 'Join a cluster as organization' })
    async joinCluster(
        @Body() body: {
            organizationId: string;
            organizationName: string;
            cluster: ClusterType;
            contact: { name: string; email: string; phone?: string };
            role?: 'lead' | 'co-lead' | 'member' | 'observer';
        }
    ) {
        return this.clusterService.joinCluster(
            body.organizationId,
            body.organizationName,
            body.cluster,
            body.contact,
            body.role
        );
    }

    // ========== Meetings ==========

    @Get('meetings')
    @ApiOperation({ summary: 'Get upcoming cluster meetings' })
    async getUpcomingMeetings(@Query('cluster') cluster?: ClusterType) {
        return this.clusterService.getUpcomingMeetings(cluster);
    }

    @Post('meetings')
    @ApiOperation({ summary: 'Schedule a cluster meeting' })
    async scheduleMeeting(
        @Body() body: {
            cluster: ClusterType;
            title: string;
            scheduledAt: string;
            agenda: string[];
            location?: string;
            virtualLink?: string;
        }
    ) {
        return this.clusterService.scheduleMeeting(
            body.cluster,
            body.title,
            new Date(body.scheduledAt),
            body.agenda,
            body.location,
            body.virtualLink
        );
    }

    @Post('meetings/:meetingId/actions')
    @ApiOperation({ summary: 'Add action item to meeting' })
    async addActionItem(
        @Param('meetingId') meetingId: string,
        @Body() body: {
            description: string;
            assignedTo: string;
            dueDate: string;
        }
    ) {
        return this.clusterService.addActionItem(
            meetingId,
            body.description,
            body.assignedTo,
            new Date(body.dueDate)
        );
    }

    @Get('actions/pending')
    @ApiOperation({ summary: 'Get pending action items' })
    async getPendingActions(@Query('organizationId') organizationId?: string) {
        return this.clusterService.getPendingActions(organizationId);
    }

    // ========== 4W Reporting ==========

    @Post('4w')
    @ApiOperation({ summary: 'Submit 4W entry (Who-What-Where-When)' })
    async submitFourW(
        @Body() body: {
            who: string;
            what: string;
            where: string;
            when: { start: string; end?: string };
            beneficiaries: number;
            cluster: ClusterType;
        }
    ) {
        return this.clusterService.submitFourW({
            who: body.who,
            what: body.what,
            where: body.where,
            when: {
                start: new Date(body.when.start),
                end: body.when.end ? new Date(body.when.end) : undefined,
            },
            beneficiaries: body.beneficiaries,
            cluster: body.cluster,
        });
    }

    @Get('4w')
    @ApiOperation({ summary: 'Get 4W summary across all clusters' })
    async getFourWSummary() {
        return this.clusterService.getFourWSummary();
    }

    @Get(':cluster/4w')
    @ApiOperation({ summary: 'Get 4W entries for specific cluster' })
    async getFourWByCluster(@Param('cluster') cluster: ClusterType) {
        return this.clusterService.getFourWByCluster(cluster);
    }
}
