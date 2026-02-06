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
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { RoleLevel } from '../accounts/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OverlaysService } from './overlays.service';
import {
    CreateOverlayDto,
    UpdateOverlayDto,
    QueryOverlaysDto,
    OverlayDto,
} from './dto';

// User payload interface for type safety
interface UserPayload {
    uid?: string;
    id?: string;
}

@ApiTags('Overlays')
@ApiBearerAuth()
@Controller('mission-sessions/:sessionId/overlays')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class OverlaysController {
    constructor(private readonly overlaysService: OverlaysService) { }

    @Get()
    @RequiredLevel(RoleLevel.VOLUNTEER) // Level 1+
    @ApiOperation({ summary: 'List overlays for a session' })
    @ApiResponse({ status: 200, description: 'List of overlays', type: [OverlayDto] })
    async findAll(
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Query() query: QueryOverlaysDto,
    ): Promise<OverlayDto[]> {
        return this.overlaysService.findAll(sessionId, query);
    }

    @Get(':id')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Get a single overlay' })
    @ApiResponse({ status: 200, type: OverlayDto })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<OverlayDto> {
        return this.overlaysService.findOne(id);
    }

    @Post()
    @RequiredLevel(RoleLevel.OFFICER) // Level 2+
    @ApiOperation({ summary: 'Create a new overlay' })
    @ApiResponse({ status: 201, type: OverlayDto })
    async create(
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Body() dto: CreateOverlayDto,
        @CurrentUser() user: UserPayload,
    ): Promise<OverlayDto> {
        return this.overlaysService.create(sessionId, dto, (user.uid || user.id)!);
    }

    @Patch(':id')
    @RequiredLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Update an overlay (with optimistic locking)' })
    @ApiHeader({ name: 'if-match', description: 'Expected version number', required: true })
    @ApiResponse({ status: 200, type: OverlayDto })
    @ApiResponse({ status: 409, description: 'Version conflict' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOverlayDto,
        @Headers('if-match') versionHeader: string,
        @CurrentUser() user: UserPayload,
    ): Promise<OverlayDto> {
        const version = parseInt(versionHeader, 10) || dto.version;
        return this.overlaysService.update(id, dto, version, (user.uid || user.id)!);
    }

    @Post(':id/publish')
    @RequiredLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Publish a draft overlay' })
    @ApiResponse({ status: 200, type: OverlayDto })
    async publish(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserPayload,
    ): Promise<OverlayDto> {
        return this.overlaysService.publish(id, (user.uid || user.id)!);
    }

    @Delete(':id')
    @RequiredLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Soft delete an overlay' })
    @ApiResponse({ status: 204, description: 'Overlay removed' })
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserPayload,
    ): Promise<void> {
        return this.overlaysService.remove(id, (user.uid || user.id)!);
    }

    // Lock endpoints
    @Post(':id/lock')
    @RequiredLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Acquire a lock on an overlay' })
    @ApiResponse({ status: 200, description: 'Lock acquired' })
    @ApiResponse({ status: 409, description: 'Lock held by another user' })
    async acquireLock(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserPayload,
    ): Promise<{ success: boolean; expiresAt: Date }> {
        return this.overlaysService.acquireLock(id, (user.uid || user.id)!);
    }

    @Delete(':id/lock')
    @RequiredLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Release a lock on an overlay' })
    @ApiResponse({ status: 200, description: 'Lock released' })
    async releaseLock(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserPayload,
    ): Promise<{ success: boolean }> {
        return this.overlaysService.releaseLock(id, (user.uid || user.id)!);
    }
}
