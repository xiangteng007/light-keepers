import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrgChartService } from './org-chart.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('組織架構')
@Controller('org-chart')
// 定級理由：組織樹查詢為全體志工的日常唯讀需求（L1）；節點增修刪與移動等同人事任命與組織管理設定，提升至 L3。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class OrgChartController {
    constructor(private readonly service: OrgChartService) { }

    @Post()
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 管理設定：新增組織節點／任命
    @ApiOperation({ summary: '新增節點' })
    @ApiResponse({ status: 201, description: '節點已建立' })
    @ApiBearerAuth()
    addNode(@Body() body: { id?: string; name: string; type: string; parentId: string | null; managerId?: string; metadata?: any }) {
        return this.service.addNode(body);
    }

    @Get(':id')
    @ApiOperation({ summary: '取得節點' })
    @ApiResponse({ status: 200, description: '節點資料' })
    getNode(@Param('id') id: string) {
        return this.service.getNode(id);
    }

    @Put(':id')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 管理設定：修改組織節點
    @ApiOperation({ summary: '更新節點' })
    @ApiResponse({ status: 200, description: '節點已更新' })
    @ApiBearerAuth()
    updateNode(@Param('id') id: string, @Body() updates: any) {
        return this.service.updateNode(id, updates);
    }

    @Delete(':id')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 管理設定：刪除組織節點（破壞性）
    @ApiOperation({ summary: '刪除節點' })
    @ApiResponse({ status: 200, description: '節點已刪除' })
    @ApiBearerAuth()
    deleteNode(@Param('id') id: string) {
        return { success: this.service.deleteNode(id) };
    }

    @Get(':id/children')
    @ApiOperation({ summary: '取得子節點' })
    @ApiResponse({ status: 200, description: '子節點列表' })
    getChildren(@Param('id') id: string) {
        return this.service.getChildren(id);
    }

    @Get('tree/:rootId')
    @ApiOperation({ summary: '取得樹狀結構' })
    @ApiResponse({ status: 200, description: '樹狀結構資料' })
    getTree(@Param('rootId') rootId: string) {
        return this.service.getTree(rootId);
    }

    @Get(':id/path')
    @ApiOperation({ summary: '取得路徑' })
    @ApiResponse({ status: 200, description: '從根到節點的路徑' })
    getPath(@Param('id') id: string) {
        return this.service.getPath(id);
    }

    @Get()
    @ApiOperation({ summary: '搜尋節點' })
    @ApiResponse({ status: 200, description: '搜尋結果' })
    search(@Query('q') query: string) {
        return this.service.search(query);
    }

    @Put(':id/move')
    @RequiredLevel(ROLE_LEVELS.DIRECTOR) // 管理設定：調整組織隸屬關係
    @ApiOperation({ summary: '移動節點' })
    @ApiResponse({ status: 200, description: '節點已移動' })
    @ApiBearerAuth()
    moveNode(@Param('id') id: string, @Body() body: { newParentId: string }) {
        return { success: this.service.moveNode(id, body.newParentId) };
    }

    @Get('stats')
    @ApiOperation({ summary: '取得統計' })
    @ApiResponse({ status: 200, description: '組織統計' })
    getStats() {
        return this.service.getStats();
    }

    @Get('export/flat')
    @ApiOperation({ summary: '匯出扁平列表' })
    @ApiResponse({ status: 200, description: '扁平列表資料' })
    exportFlat() {
        return this.service.exportFlat();
    }
}
