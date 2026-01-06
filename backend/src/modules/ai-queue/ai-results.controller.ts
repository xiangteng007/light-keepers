import {
    Controller,
    Post,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinLevel } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleLevel } from '../accounts/entities/role.entity';
import { AiResultsService } from './ai-results.service';
import { AcceptAiResultDto, RejectAiResultDto, AcceptResultResponse, RejectResultResponse } from './dto';

@ApiTags('AI Results')
@ApiBearerAuth()
@Controller('ai/results')
@UseGuards(JwtAuthGuard)
export class AiResultsController {
    constructor(private aiResultsService: AiResultsService) { }

    @Post(':jobId/accept')
    @MinLevel(RoleLevel.OFFICER) // Level 2+ required
    @ApiOperation({ summary: 'Accept AI result and apply action' })
    async acceptResult(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @Body() dto: AcceptAiResultDto,
        @CurrentUser() user: any,
    ): Promise<AcceptResultResponse> {
        return this.aiResultsService.accept(jobId, dto, {
            uid: user.uid,
            roleLevel: user.roleLevel ?? 0,
            displayName: user.displayName,
        });
    }

    @Post(':jobId/reject')
    @MinLevel(RoleLevel.VOLUNTEER) // Level 1+ can reject
    @ApiOperation({ summary: 'Reject AI result' })
    async rejectResult(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @Body() dto: RejectAiResultDto,
        @CurrentUser() user: any,
    ): Promise<RejectResultResponse> {
        return this.aiResultsService.reject(jobId, dto, {
            uid: user.uid,
            roleLevel: user.roleLevel ?? 0,
        });
    }
}
