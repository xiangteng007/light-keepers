import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MobilizationService } from './mobilization.service';
import {
    CreateMobilizationDto,
    RespondMobilizationDto,
    CheckinDto,
    MobilizationResponseDto,
} from './dto/mobilization.dto';
import { MobilizationStatus, MobilizationPriority } from './entities/mobilization.entity';

@ApiTags('Volunteer Mobilization')
@ApiBearerAuth()
@Controller('volunteers/mobilization')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class MobilizationController {
    constructor(private service: MobilizationService) {}

    @Post()
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Create volunteer mobilization order' })
    async create(
        @Body() dto: CreateMobilizationDto,
        @CurrentUser() user: { id: string },
    ) {
        const mobilization = await this.service.create(dto, user.id);
        return { data: mobilization };
    }

    @Get()
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'List all mobilizations' })
    @ApiQuery({ name: 'status', enum: MobilizationStatus, required: false })
    async findAll(@Query('status') status?: MobilizationStatus) {
        const mobilizations = await this.service.findAll(status);
        return {
            data: mobilizations.map(m => this.toResponse(m)),
            total: mobilizations.length,
        };
    }

    @Get('stats')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Get mobilization statistics' })
    @ApiQuery({ name: 'missionSessionId', required: false })
    async getStats(@Query('missionSessionId') missionSessionId?: string) {
        return { data: await this.service.getStats(missionSessionId) };
    }

    @Get(':id')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Get mobilization by ID' })
    @ApiParam({ name: 'id', type: 'string' })
    async findById(@Param('id', ParseUUIDPipe) id: string) {
        const mobilization = await this.service.findById(id);
        return { data: this.toResponse(mobilization) };
    }

    @Post(':id/activate')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Activate mobilization and send notifications' })
    @ApiParam({ name: 'id', type: 'string' })
    async activate(@Param('id', ParseUUIDPipe) id: string) {
        const mobilization = await this.service.activate(id);
        return { data: this.toResponse(mobilization), message: '動員令已發布' };
    }

    @Post(':id/complete')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Complete mobilization' })
    @ApiParam({ name: 'id', type: 'string' })
    async complete(@Param('id', ParseUUIDPipe) id: string) {
        const mobilization = await this.service.complete(id);
        return { data: this.toResponse(mobilization) };
    }

    @Post(':id/cancel')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiOperation({ summary: 'Cancel mobilization' })
    @ApiParam({ name: 'id', type: 'string' })
    async cancel(@Param('id', ParseUUIDPipe) id: string) {
        const mobilization = await this.service.cancel(id);
        return { data: this.toResponse(mobilization) };
    }

    // ==================== Volunteer Response ====================

    @Post(':id/respond')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Respond to mobilization (confirm/decline)' })
    @ApiParam({ name: 'id', type: 'string' })
    async respond(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RespondMobilizationDto,
        @CurrentUser() user: { id: string },
    ) {
        const response = await this.service.respond(id, user.id, dto);
        return { data: response };
    }

    @Post(':id/checkin')
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiOperation({ summary: 'Check in to mobilization location' })
    @ApiParam({ name: 'id', type: 'string' })
    async checkin(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CheckinDto,
        @CurrentUser() user: { id: string },
    ) {
        const response = await this.service.checkin(id, user.id, dto);
        return { data: response };
    }

    @Get(':id/responses')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiOperation({ summary: 'Get all responses for mobilization' })
    @ApiParam({ name: 'id', type: 'string' })
    async getResponses(@Param('id', ParseUUIDPipe) id: string) {
        const responses = await this.service.getResponses(id);
        return { data: responses, total: responses.length };
    }

    // ==================== Helper ====================

    private toResponse(m: { id: string; title: string; priority: MobilizationPriority; status: MobilizationStatus; requiredCount: number; confirmedCount: number; checkedInCount: number }): MobilizationResponseDto {
        return {
            id: m.id,
            title: m.title,
            priority: m.priority,
            status: m.status,
            requiredCount: m.requiredCount,
            confirmedCount: m.confirmedCount,
            checkedInCount: m.checkedInCount,
            fulfillmentRate: m.requiredCount > 0
                ? Math.round((m.confirmedCount / m.requiredCount) * 100)
                : 0,
        };
    }
}
