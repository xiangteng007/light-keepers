import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    Headers,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, MinLevel } from '../auth/guards';
import { RoleLevel } from '../accounts/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OverlaysService } from './overlays.service';
import {
    CreateOverlayDto,
    UpdateOverlayDto,
    QueryOverlaysDto,
    OverlayDto,
} from './dto';

@ApiTags('Overlays')
@ApiBearerAuth()
@Controller('mission-sessions/:sessionId/overlays')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OverlaysController {
    constructor(private readonly overlaysService: OverlaysService) { }

    @Get()
    @MinLevel(RoleLevel.VOLUNTEER) // Level 1+
    @ApiOperation({ summary: 'List overlays for a session' })
    @ApiResponse({ status: 200, description: 'List of overlays', type: [OverlayDto] })
    async findAll(
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Query() query: QueryOverlaysDto,
    ): Promise<OverlayDto[]> {
        return this.overlaysService.findAll(sessionId, query);
    }

    @Get(':id')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Get a single overlay' })
    @ApiResponse({ status: 200, type: OverlayDto })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<OverlayDto> {
        return this.overlaysService.findOne(id);
    }

    @Post()
    @MinLevel(RoleLevel.OFFICER) // Level 2+
    @ApiOperation({ summary: 'Create a new overlay' })
    @ApiResponse({ status: 201, type: OverlayDto })
    async create(
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Body() dto: CreateOverlayDto,
        @CurrentUser() user: any,
    ): Promise<OverlayDto> {
        return this.overlaysService.create(sessionId, dto, user.uid || user.id);
    }

    @Patch(':id')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Update an overlay (with optimistic locking)' })
    @ApiHeader({ name: 'if-match', description: 'Expected version number', required: true })
    @ApiResponse({ status: 200, type: OverlayDto })
    @ApiResponse({ status: 409, description: 'Version conflict' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOverlayDto,
        @Headers('if-match') versionHeader: string,
        @CurrentUser() user: any,
    ): Promise<OverlayDto> {
        const version = parseInt(versionHeader, 10) || dto.version;
        return this.overlaysService.update(id, dto, version, user.uid || user.id);
    }

    @Post(':id/publish')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Publish a draft overlay' })
    @ApiResponse({ status: 200, type: OverlayDto })
    async publish(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ): Promise<OverlayDto> {
        return this.overlaysService.publish(id, user.uid || user.id);
    }

    @Delete(':id')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Soft delete an overlay' })
    @ApiResponse({ status: 204, description: 'Overlay removed' })
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ): Promise<void> {
        return this.overlaysService.remove(id, user.uid || user.id);
    }

    // Lock endpoints
    @Post(':id/lock')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Acquire a lock on an overlay' })
    @ApiResponse({ status: 200, description: 'Lock acquired' })
    @ApiResponse({ status: 409, description: 'Lock held by another user' })
    async acquireLock(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; expiresAt: Date }> {
        return this.overlaysService.acquireLock(id, user.uid || user.id);
    }

    @Delete(':id/lock')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Release a lock on an overlay' })
    @ApiResponse({ status: 200, description: 'Lock released' })
    async releaseLock(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean }> {
        return this.overlaysService.releaseLock(id, user.uid || user.id);
    }
}
