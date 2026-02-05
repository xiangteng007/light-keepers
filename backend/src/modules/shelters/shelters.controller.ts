import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SheltersService } from './shelters.service';
import {
    CreateShelterDto,
    ActivateShelterDto,
    CheckInEvacueeDto,
    HealthScreeningDto,
    AssignBedDto,
    CreateDailyReportDto,
    ShelterResponseDto,
    EvacueeResponseDto,
    EvacueeQueryResultDto,
} from './dto/shelter.dto';
import { ShelterStatus } from './entities/shelter.entity';

@ApiTags('Shelters')
@ApiBearerAuth()
@Controller('shelters')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class SheltersController {
    constructor(private sheltersService: SheltersService) {}

    // ==================== Shelter CRUD ====================

    @Post()
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Create a new shelter' })
    async create(
        @Body() dto: CreateShelterDto,
    ): Promise<ShelterResponseDto> {
        const shelter = await this.sheltersService.create(dto);
        return this.toShelterResponse(shelter);
    }

    @Get()
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'List all shelters' })
    @ApiQuery({ name: 'status', enum: ShelterStatus, required: false })
    async findAll(
        @Query('status') status?: ShelterStatus,
    ): Promise<ShelterResponseDto[]> {
        const shelters = status
            ? await this.sheltersService.findByStatus(status)
            : await this.sheltersService.findAll();
        return shelters.map(s => this.toShelterResponse(s));
    }

    @Get(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Get shelter by ID' })
    @ApiParam({ name: 'id', type: 'string' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<ShelterResponseDto> {
        const shelter = await this.sheltersService.findById(id);
        return this.toShelterResponse(shelter);
    }

    // ==================== Shelter Operations ====================

    @Post(':id/activate')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Activate a shelter for emergency use' })
    @ApiParam({ name: 'id', type: 'string' })
    async activate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ActivateShelterDto,
        @CurrentUser() user: { id: string },
    ): Promise<ShelterResponseDto> {
        const shelter = await this.sheltersService.activate(id, dto, user.id);
        return this.toShelterResponse(shelter);
    }

    @Post(':id/deactivate')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Deactivate a shelter' })
    @ApiParam({ name: 'id', type: 'string' })
    async deactivate(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<ShelterResponseDto> {
        const shelter = await this.sheltersService.deactivate(id);
        return this.toShelterResponse(shelter);
    }

    // ==================== Evacuee Operations ====================

    @Post(':id/check-in')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Check in an evacuee to shelter' })
    @ApiParam({ name: 'id', type: 'string' })
    async checkIn(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CheckInEvacueeDto,
        @CurrentUser() user: { id: string },
    ): Promise<EvacueeResponseDto> {
        const evacuee = await this.sheltersService.checkIn(id, dto, user.id);
        return this.toEvacueeResponse(evacuee);
    }

    @Post(':id/check-out/:evacueeId')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Check out an evacuee from shelter' })
    @ApiParam({ name: 'id', type: 'string' })
    @ApiParam({ name: 'evacueeId', type: 'string' })
    async checkOut(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('evacueeId', ParseUUIDPipe) evacueeId: string,
        @CurrentUser() user: { id: string },
    ): Promise<EvacueeResponseDto> {
        const evacuee = await this.sheltersService.checkOut(id, evacueeId, user.id);
        return this.toEvacueeResponse(evacuee);
    }

    @Get(':id/evacuees')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'List evacuees in shelter' })
    @ApiParam({ name: 'id', type: 'string' })
    async getEvacuees(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<EvacueeResponseDto[]> {
        const evacuees = await this.sheltersService.getEvacuees(id);
        return evacuees.map(e => this.toEvacueeResponse(e));
    }

    // ==================== Health Screening ====================

    @Post(':id/health-screening/:evacueeId')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Create health screening for evacuee' })
    @ApiParam({ name: 'id', type: 'string' })
    @ApiParam({ name: 'evacueeId', type: 'string' })
    async createHealthScreening(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('evacueeId', ParseUUIDPipe) evacueeId: string,
        @Body() dto: HealthScreeningDto,
        @CurrentUser() user: { id: string },
    ) {
        return this.sheltersService.createHealthScreening(id, evacueeId, dto, user.id);
    }

    @Get(':id/health-screenings')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Get health screenings for shelter' })
    @ApiParam({ name: 'id', type: 'string' })
    @ApiQuery({ name: 'evacueeId', required: false })
    async getHealthScreenings(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('evacueeId') evacueeId?: string,
    ) {
        return this.sheltersService.getHealthScreenings(id, evacueeId);
    }

    // ==================== Bed Assignment ====================

    @Patch(':id/assign-bed/:evacueeId')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Assign bed to evacuee' })
    @ApiParam({ name: 'id', type: 'string' })
    @ApiParam({ name: 'evacueeId', type: 'string' })
    async assignBed(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('evacueeId', ParseUUIDPipe) evacueeId: string,
        @Body() dto: AssignBedDto,
    ): Promise<EvacueeResponseDto> {
        const evacuee = await this.sheltersService.assignBed(id, evacueeId, dto);
        return this.toEvacueeResponse(evacuee);
    }

    // ==================== Daily Reports ====================

    @Post(':id/daily-report')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Create daily shelter report' })
    @ApiParam({ name: 'id', type: 'string' })
    async createDailyReport(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateDailyReportDto,
        @CurrentUser() user: any,
    ) {
        return this.sheltersService.createDailyReport(id, dto, user.id);
    }

    @Get(':id/daily-reports')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Get daily reports for shelter' })
    @ApiParam({ name: 'id', type: 'string' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getDailyReports(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('limit') limit?: number,
    ) {
        return this.sheltersService.getDailyReports(id, limit || 30);
    }

    // ==================== Public Query ====================

    @Get('query/:queryCode')
    @RequiredLevel(ROLE_LEVELS.PUBLIC)
    @ApiOperation({ summary: 'Query evacuee by family query code' })
    @ApiParam({ name: 'queryCode', type: 'string' })
    @ApiResponse({ type: EvacueeQueryResultDto })
    async queryByCode(
        @Param('queryCode') queryCode: string,
    ): Promise<EvacueeQueryResultDto> {
        const result = await this.sheltersService.queryByCode(queryCode);
        
        if (!result.found) {
            return { found: false };
        }

        return {
            found: true,
            shelterName: result.shelter?.name,
            shelterAddress: result.shelter?.address,
            evacueeStatus: result.evacuee?.status,
            checkedInAt: result.evacuee?.checkedInAt?.toISOString(),
        };
    }

    // ==================== Helper Methods ====================

    private toShelterResponse(shelter: Shelter): ShelterResponseDto {
        return {
            id: shelter.id,
            name: shelter.name,
            type: shelter.type,
            address: shelter.address,
            capacity: shelter.capacity,
            currentOccupancy: shelter.currentOccupancy,
            status: shelter.status,
            occupancyRate: shelter.capacity > 0 
                ? Math.round((shelter.currentOccupancy / shelter.capacity) * 100) 
                : 0,
        };
    }

    private toEvacueeResponse(evacuee: ShelterEvacuee): EvacueeResponseDto {
        return {
            id: evacuee.id,
            name: evacuee.name,
            queryCode: evacuee.queryCode,
            status: evacuee.status,
            bedAssignment: evacuee.bedAssignment,
            specialNeeds: evacuee.specialNeeds,
            checkedInAt: evacuee.checkedInAt?.toISOString(),
        };
    }
}
