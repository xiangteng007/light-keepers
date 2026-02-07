import {
    Controller,
    Post,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleLevel } from '../accounts/entities/role.entity';
import { AiResultsService } from './ai-results.service';
import { AcceptAiResultDto, RejectAiResultDto, AcceptResultResponse, RejectResultResponse } from './dto';
import { JwtPayload } from '../shared/guards/core-jwt.guard';

@ApiTags('AI Results')
@ApiBearerAuth()
@Controller('ai/results')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class AiResultsController {
    constructor(private aiResultsService: AiResultsService) { }

    @Post(':jobId/accept')
    @RequiredLevel(RoleLevel.OFFICER) // Level 2+ required
    @ApiOperation({ summary: 'Accept AI result and apply action' })
    async acceptResult(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @Body() dto: AcceptAiResultDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<AcceptResultResponse> {
        return this.aiResultsService.accept(jobId, dto, {
            uid: user.uid,
            roleLevel: user.roleLevel ?? 0,
            displayName: user.displayName,
        });
    }

    @Post(':jobId/reject')
    @RequiredLevel(RoleLevel.VOLUNTEER) // Level 1+ can reject
    @ApiOperation({ summary: 'Reject AI result' })
    async rejectResult(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @Body() dto: RejectAiResultDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<RejectResultResponse> {
        return this.aiResultsService.reject(jobId, dto, {
            uid: user.uid,
            roleLevel: user.roleLevel ?? 0,
        });
    }
}
