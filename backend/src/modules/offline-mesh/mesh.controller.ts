/**
 * 網狀網路 Controller
 * 模組 B: REST API
 */

import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MeshSyncService } from './mesh-sync.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('mesh')
@Controller('api/mesh')
// 定級理由：LoRa 節點狀態為斷網現場志工的必要唯讀情境資料（L1）；觸發離線資料同步會回寫正式資料，提升至 L2。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class MeshController {
    constructor(private readonly meshService: MeshSyncService) { }

    @Get('nodes')
    @ApiOperation({ summary: '取得所有 LoRa 節點' })
    async getAllNodes() {
        const nodes = await this.meshService.getAllNodes();
        return {
            success: true,
            data: nodes,
        };
    }

    @Get('nodes/active')
    @ApiOperation({ summary: '取得活躍節點' })
    async getActiveNodes() {
        const nodes = await this.meshService.getActiveNodes();
        return {
            success: true,
            data: nodes,
        };
    }

    @Get('nodes/:nodeId/messages')
    @ApiOperation({ summary: '取得節點的訊息歷史' })
    async getNodeMessages(
        @Param('nodeId') nodeId: string,
        @Query('limit') limit?: string
    ) {
        const messages = await this.meshService.getNodeMessages(
            nodeId,
            parseInt(limit || '50')
        );
        return {
            success: true,
            data: messages,
        };
    }

    @Get('stats')
    @ApiOperation({ summary: '取得網狀網路統計' })
    async getStats() {
        const stats = await this.meshService.getStats();
        return {
            success: true,
            data: stats,
        };
    }

    @Post('sync')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：將離線訊息回寫正式資料
    @ApiOperation({ summary: '觸發離線資料同步' })
    async syncOfflineData() {
        const result = await this.meshService.syncOfflineMessages();
        return {
            success: true,
            data: result,
            message: `已同步 ${result.synced} 筆訊息`,
        };
    }
}
