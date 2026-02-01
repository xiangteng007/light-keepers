/**
 * Staff Security Controller
 * 
 * REST API for staff safety management
 */
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityIncidentService, CreateIncidentDto } from './services/security-incident.service';
import { StaffCheckInService, CheckInDto, CheckInType } from './services/staff-checkin.service';
import { EvacuationPlanService } from './services/evacuation-plan.service';

@ApiTags('Staff Security')
@Controller('api/v1/staff-security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StaffSecurityController {
    constructor(
        private readonly incidentService: SecurityIncidentService,
        private readonly checkInService: StaffCheckInService,
        private readonly evacuationService: EvacuationPlanService,
    ) { }

    // ========== Incident Endpoints ==========

    @Post('incidents')
    @ApiOperation({ summary: 'Report a security incident' })
    async reportIncident(@Body() dto: CreateIncidentDto) {
        return this.incidentService.reportIncident(dto);
    }

    @Get('incidents/active')
    @ApiOperation({ summary: 'Get active security incidents' })
    async getActiveIncidents() {
        return this.incidentService.getActiveIncidents();
    }

    @Get('incidents/nearby')
    @ApiOperation({ summary: 'Get incidents near location' })
    async getIncidentsNearby(
        @Query('lat') lat: string,
        @Query('lon') lon: string,
        @Query('radius') radius: string = '10'
    ) {
        return this.incidentService.getIncidentsNearLocation(
            parseFloat(lat),
            parseFloat(lon),
            parseFloat(radius)
        );
    }

    @Patch('incidents/:id/status')
    @ApiOperation({ summary: 'Update incident status' })
    async updateIncidentStatus(
        @Param('id') id: string,
        @Body() body: { status: string; resolution?: string }
    ) {
        return this.incidentService.updateStatus(id, body.status, body.resolution);
    }

    // ========== Check-In Endpoints ==========

    @Post('check-in')
    @ApiOperation({ summary: 'Record staff check-in' })
    async checkIn(@Body() dto: CheckInDto, @Request() req: any) {
        return this.checkInService.checkIn({
            ...dto,
            staffId: dto.staffId || req.user?.id,
        });
    }

    @Post('panic')
    @ApiOperation({ summary: 'Trigger panic button' })
    async panicButton(
        @Body() body: { location?: { latitude: number; longitude: number }; message?: string },
        @Request() req: any
    ) {
        return this.checkInService.checkIn({
            staffId: req.user?.id,
            type: CheckInType.PANIC,
            location: body.location,
            message: body.message,
        });
    }

    @Get('check-in/overdue')
    @ApiOperation({ summary: 'Get staff with overdue check-ins' })
    async getOverdueCheckIns(@Query('missionId') missionId?: string) {
        return this.checkInService.getOverdueCheckIns(missionId);
    }

    @Get('check-in/location/:staffId')
    @ApiOperation({ summary: 'Get last known location for staff' })
    async getLastLocation(@Param('staffId') staffId: string) {
        return this.checkInService.getLastKnownLocation(staffId);
    }

    @Get('check-in/history/:staffId')
    @ApiOperation({ summary: 'Get check-in history for staff' })
    async getCheckInHistory(
        @Param('staffId') staffId: string,
        @Query('limit') limit: string = '50'
    ) {
        return this.checkInService.getCheckInHistory(staffId, parseInt(limit));
    }

    // ========== Evacuation Endpoints ==========

    @Post('evacuation/plans')
    @ApiOperation({ summary: 'Create evacuation plan' })
    async createEvacuationPlan(@Body() body: { locationId: string; plan: any }) {
        return this.evacuationService.createPlan(body.locationId, body.plan);
    }

    @Get('evacuation/plans/:locationId')
    @ApiOperation({ summary: 'Get evacuation plans for location' })
    async getEvacuationPlans(@Param('locationId') locationId: string) {
        return this.evacuationService.getPlansForLocation(locationId);
    }

    @Post('evacuation/initiate/:planId')
    @ApiOperation({ summary: 'Initiate evacuation' })
    async initiateEvacuation(
        @Param('planId') planId: string,
        @Body() body: { reason: string },
        @Request() req: any
    ) {
        return this.evacuationService.initiateEvacuation(
            planId,
            req.user?.id || 'system',
            body.reason
        );
    }

    @Get('evacuation/assembly-point/:planId')
    @ApiOperation({ summary: 'Get nearest assembly point' })
    async getNearestAssemblyPoint(
        @Param('planId') planId: string,
        @Query('lat') lat: string,
        @Query('lon') lon: string
    ) {
        return this.evacuationService.getNearestAssemblyPoint(
            planId,
            parseFloat(lat),
            parseFloat(lon)
        );
    }
}
