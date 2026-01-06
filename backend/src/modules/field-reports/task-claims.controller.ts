import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinLevel } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleLevel } from '../accounts/entities/role.entity';
import { TaskClaimsService } from './task-claims.service';

class ClaimTaskDto {
    missionSessionId: string;
}

class ReleaseTaskDto {
    missionSessionId: string;
    reason?: string;
}

class AddProgressDto {
    missionSessionId: string;
    status?: string;
    note?: string;
    percent?: number;
    attachmentId?: string;
}

@ApiTags('Task Claims')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskClaimsController {
    constructor(private taskClaimsService: TaskClaimsService) { }

    @Post(':taskId/claim')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Claim a task' })
    async claimTask(
        @Param('taskId') taskId: string,
        @Body() dto: ClaimTaskDto,
        @CurrentUser() user: any,
    ) {
        const claim = await this.taskClaimsService.claim(taskId, dto.missionSessionId, user);
        return {
            taskId,
            claimedBy: claim.claimedBy,
            claimedAt: claim.claimedAt,
        };
    }

    @Post(':taskId/release')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Release a claimed task' })
    async releaseTask(
        @Param('taskId') taskId: string,
        @Body() dto: ReleaseTaskDto,
        @CurrentUser() user: any,
    ) {
        await this.taskClaimsService.release(taskId, dto.missionSessionId, dto.reason || '', user);
        return { taskId, released: true };
    }

    @Post(':taskId/progress')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Add progress update to task' })
    async addProgress(
        @Param('taskId') taskId: string,
        @Body() dto: AddProgressDto,
        @CurrentUser() user: any,
    ) {
        const progress = await this.taskClaimsService.addProgress(
            taskId,
            dto.missionSessionId,
            { status: dto.status, note: dto.note, percent: dto.percent, attachmentId: dto.attachmentId },
            user,
        );
        return {
            progressId: progress.id,
            taskId,
            status: progress.status,
            createdAt: progress.createdAt,
        };
    }

    @Get(':taskId/progress')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Get progress updates for task' })
    async getProgress(@Param('taskId') taskId: string) {
        return this.taskClaimsService.getProgress(taskId);
    }

    @Get(':taskId/claim')
    @MinLevel(RoleLevel.VOLUNTEER)
    @ApiOperation({ summary: 'Get current claim for task' })
    async getCurrentClaim(@Param('taskId') taskId: string) {
        const claim = await this.taskClaimsService.getCurrentClaim(taskId);
        if (!claim) {
            return { taskId, claimed: false };
        }
        return {
            taskId,
            claimed: true,
            claimedBy: claim.claimedBy,
            claimedAt: claim.claimedAt,
        };
    }
}
