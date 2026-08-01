/**
 * Staff Security Controller
 * 
 * REST API for staff safety management
 */
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { SecurityIncidentService, CreateIncidentDto } from './services/security-incident.service';
import { StaffCheckInService, CheckInDto, CheckInType } from './services/staff-checkin.service';
import { EvacuationPlanService } from './services/evacuation-plan.service';
import { CreateEvacuationPlanDto } from './dto/evacuation-plan.dto';

@ApiTags('Staff Security')
@Controller('api/v1/staff-security')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
// P0 授權定級：現場人員自身的安全動作（回報事件、簽到、緊急按鈕、查附近事件與集合點）
// 必須人人可用 → 類別預設 L1。
// 提升到 L2 的是「看/改別人」的端點：結案事件狀態、逾時未簽到名單、
// 指定人員的最後位置與簽到歷史（他人位置屬個資）、建立與發動撤離。
// ⚠️ 待確認：目前 L2 也擋掉「志工查自己的簽到歷史」；若需開放本人查詢，
// 應改掛 ResourceOwnerGuard（ADR-003）而非降級，屬 P0 之後的工作。
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 改他人回報的事件狀態／結案
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
    async checkIn(@Body() dto: CheckInDto, @Request() req: AuthenticatedRequest) {
        return this.checkInService.checkIn({
            ...dto,
            staffId: dto.staffId || req.user?.id,
        });
    }

    @Post('panic')
    @ApiOperation({ summary: 'Trigger panic button' })
    async panicButton(
        @Body() body: { location?: { latitude: number; longitude: number }; message?: string },
        @Request() req: AuthenticatedRequest
    ) {
        return this.checkInService.checkIn({
            staffId: req.user?.id,
            type: CheckInType.PANIC,
            location: body.location,
            message: body.message,
        });
    }

    @Get('check-in/overdue')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 全員逾時未簽到名單（管理視角）
    @ApiOperation({ summary: 'Get staff with overdue check-ins' })
    async getOverdueCheckIns(@Query('missionId') missionId?: string) {
        return this.checkInService.getOverdueCheckIns(missionId);
    }

    @Get('check-in/location/:staffId')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 指定人員的最後位置＝個資
    @ApiOperation({ summary: 'Get last known location for staff' })
    async getLastLocation(@Param('staffId') staffId: string) {
        return this.checkInService.getLastKnownLocation(staffId);
    }

    @Get('check-in/history/:staffId')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 指定人員的行蹤歷史＝個資
    @ApiOperation({ summary: 'Get check-in history for staff' })
    async getCheckInHistory(
        @Param('staffId') staffId: string,
        @Query('limit') limit: string = '50'
    ) {
        return this.checkInService.getCheckInHistory(staffId, parseInt(limit));
    }

    // ========== Evacuation Endpoints ==========

    @Post('evacuation/plans')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 建立撤離計畫
    @ApiOperation({ summary: 'Create evacuation plan' })
    async createEvacuationPlan(@Body() body: CreateEvacuationPlanDto) {
        return this.evacuationService.createPlan(body.locationId, body.plan);
    }

    @Get('evacuation/plans/:locationId')
    @ApiOperation({ summary: 'Get evacuation plans for location' })
    async getEvacuationPlans(@Param('locationId') locationId: string) {
        return this.evacuationService.getPlansForLocation(locationId);
    }

    @Post('evacuation/initiate/:planId')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 發動撤離＝現場指揮動作
    @ApiOperation({ summary: 'Initiate evacuation' })
    async initiateEvacuation(
        @Param('planId') planId: string,
        @Body() body: { reason: string },
        @Request() req: AuthenticatedRequest
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
