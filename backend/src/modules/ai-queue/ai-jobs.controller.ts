import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleLevel } from '../accounts/entities/role.entity';
import { AiJobsService } from './ai-jobs.service';
import { CreateAiJobDto, AiJobCreatedResponse, AiJobDetailResponse } from './dto';
import { AiJobStatus } from './entities';

@ApiTags('AI Queue')
@ApiBearerAuth()
@Controller('ai/jobs')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class AiJobsController {
    constructor(private aiJobsService: AiJobsService) { }

    @Post()
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Create a new AI job' })
    async createJob(
        @Body() dto: CreateAiJobDto,
        @CurrentUser() user: any,
    ): Promise<AiJobCreatedResponse> {
        // Calculate max role level from roles array
        const roleLevel = user.roles?.reduce((max: number, role: any) =>
            Math.max(max, role.level || 0), 0) || 0;

        return this.aiJobsService.create(dto, {
            uid: user.id,
            roleLevel,
            displayName: user.displayName,
        });
    }

    @Get(':jobId')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Get AI job status and result' })
    async getJob(
        @Param('jobId', ParseUUIDPipe) jobId: string,
    ): Promise<AiJobDetailResponse> {
        return this.aiJobsService.findById(jobId);
    }

    @Post(':jobId/cancel')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Cancel a queued AI job' })
    async cancelJob(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean }> {
        const roleLevel = user.roles?.reduce((max: number, role: any) =>
            Math.max(max, role.level || 0), 0) || 0;
        await this.aiJobsService.cancel(jobId, {
            uid: user.id,
            roleLevel,
        });
        return { success: true };
    }

    @Get()
    @RequiredLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'List AI jobs for a mission' })
    @ApiQuery({ name: 'missionSessionId', required: true })
    @ApiQuery({ name: 'status', required: false, enum: AiJobStatus })
    @ApiQuery({ name: 'limit', required: false })
    async listJobs(
        @Query('missionSessionId') missionSessionId: string,
        @Query('status') status?: AiJobStatus,
        @Query('limit') limit?: number,
    ): Promise<AiJobDetailResponse[]> {
        return this.aiJobsService.findByMission(
            missionSessionId,
            status,
            limit ? parseInt(String(limit), 10) : 50,
        );
    }
}
