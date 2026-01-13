/**
 * Command Chain Controller
 * ICS 指揮鏈 API
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { CommandChainService, AssignRoleDto, ReliefDto } from './command-chain.service';
import { CoreJwtGuard } from '../shared/guards/core-jwt.guard';
import { UnifiedRolesGuard, RequiredLevel } from '../shared/guards/unified-roles.guard';

@Controller('mission-sessions/:sessionId/command-chain')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class CommandChainController {
    constructor(private readonly commandChainService: CommandChainService) { }

    /**
     * 取得任務場次的指揮鏈
     */
    @Get()
    @RequiredLevel(2)
    async getCommandChain(@Param('sessionId') sessionId: string) {
        return this.commandChainService.getActiveCommandChain(sessionId);
    }

    /**
     * 取得指揮鏈歷史 (含已交接)
     */
    @Get('history')
    @RequiredLevel(3)
    async getCommandChainHistory(@Param('sessionId') sessionId: string) {
        return this.commandChainService.getCommandChain(sessionId);
    }

    /**
     * 取得組織圖資料
     */
    @Get('org-chart')
    @RequiredLevel(2)
    async getOrgChart(@Param('sessionId') sessionId: string) {
        return this.commandChainService.getOrgChart(sessionId);
    }

    /**
     * 指派角色
     */
    @Post()
    @RequiredLevel(4) // Manager+ only
    async assignRole(
        @Param('sessionId') sessionId: string,
        @Body() dto: Omit<AssignRoleDto, 'missionSessionId' | 'assignedBy'>,
        @Request() req: any,
    ) {
        return this.commandChainService.assignRole({
            ...dto,
            missionSessionId: sessionId,
            assignedBy: req.user?.id || 'system',
        });
    }

    /**
     * 啟動角色 (開始執勤)
     */
    @Put(':assignmentId/activate')
    @RequiredLevel(4)
    async activateRole(@Param('assignmentId') assignmentId: string) {
        return this.commandChainService.activateRole(assignmentId);
    }

    /**
     * 交接角色
     */
    @Put(':assignmentId/relief')
    @RequiredLevel(3)
    async reliefRole(
        @Param('assignmentId') assignmentId: string,
        @Body() dto: Omit<ReliefDto, 'relievedBy'>,
        @Request() req: any,
    ) {
        return this.commandChainService.reliefRole(assignmentId, {
            ...dto,
            relievedBy: req.user?.id || 'system',
        });
    }

    /**
     * 取得我的角色
     */
    @Get('my-roles')
    @RequiredLevel(2)
    async getMyRoles(
        @Param('sessionId') sessionId: string,
        @Request() req: any,
    ) {
        const userId = req.user?.id;
        if (!userId) {
            return [];
        }
        return this.commandChainService.getUserRoles(sessionId, userId);
    }

    /**
     * 檢查我是否為指揮官
     */
    @Get('am-i-commander')
    @RequiredLevel(2)
    async amICommander(
        @Param('sessionId') sessionId: string,
        @Request() req: any,
    ) {
        const userId = req.user?.id;
        if (!userId) {
            return { isCommander: false };
        }
        const isCommander = await this.commandChainService.isCommander(sessionId, userId);
        return { isCommander };
    }
}
