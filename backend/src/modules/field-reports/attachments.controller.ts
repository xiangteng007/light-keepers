import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinLevel } from '../auth/guards/roles.guard';
import { RoleLevel } from '../accounts/entities/role.entity';
import { AttachmentsService } from './attachments.service';
import { InitiateUploadDto, CompleteUploadDto, PhotoEvidenceQueryDto } from './dto';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AttachmentsController {
    constructor(private readonly service: AttachmentsService) { }

    @Post('reports/:reportId/attachments/initiate')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Initiate attachment upload' })
    async initiate(
        @Param('reportId') reportId: string,
        @Body() dto: InitiateUploadDto,
    ) {
        // TODO: Get missionSessionId from report
        const missionSessionId = ''; // Would be fetched from report
        return this.service.initiate(reportId, missionSessionId, dto);
    }

    @Post('reports/:reportId/attachments/:attachmentId/complete')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Complete attachment upload' })
    async complete(
        @Param('attachmentId') attachmentId: string,
        @Body() dto: CompleteUploadDto,
    ) {
        return this.service.complete(attachmentId, dto);
    }

    @Get('mission-sessions/:missionSessionId/photo-evidence')
    @MinLevel(RoleLevel.OFFICER)
    @ApiOperation({ summary: 'Get photo evidence for map layer' })
    async getPhotoEvidence(
        @Param('missionSessionId') missionSessionId: string,
        @Query() query: PhotoEvidenceQueryDto,
    ) {
        return this.service.findPhotoEvidence(missionSessionId, query);
    }
}
