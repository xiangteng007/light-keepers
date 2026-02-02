import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { RoleLevel } from '../accounts/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LocationShareService } from './location-share.service';
import { StartLocationShareDto, UpdateLocationDto } from './dto';

@ApiTags('Location Share')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@Controller('mission-sessions/:missionSessionId')
export class LocationShareController {
    constructor(private readonly service: LocationShareService) { }

    @Post('location-share/start')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Start location sharing' })
    async start(
        @Param('missionSessionId') missionSessionId: string,
        @Body() dto: StartLocationShareDto,
        @CurrentUser() user: any,
    ) {
        return this.service.start(missionSessionId, dto, user);
    }

    @Post('location-share/stop')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Stop location sharing' })
    async stop(
        @Param('missionSessionId') missionSessionId: string,
        @CurrentUser() user: any,
    ) {
        return this.service.stop(missionSessionId, user);
    }

    @Post('location/update')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Update location (alternative to WebSocket)' })
    async updateLocation(
        @Param('missionSessionId') missionSessionId: string,
        @Body() dto: UpdateLocationDto,
        @CurrentUser() user: any,
    ) {
        const updated = await this.service.updateLocation(missionSessionId, dto, user);
        return { success: updated };
    }

    @Get('live-locations')
    @RequiredLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Get live locations for map layer' })
    async getLiveLocations(
        @Param('missionSessionId') missionSessionId: string,
    ) {
        return this.service.getLiveLocations(missionSessionId);
    }
}
