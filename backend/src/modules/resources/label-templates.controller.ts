import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, ForbiddenException, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { LabelTemplatesService } from './label-templates.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

/**
 * 貼紙模板管理 API（幹部專用）
 */
@Controller('label-templates')
// 定級理由：模板查詢為倉儲列印作業所需（L1）；模板增修刪為管制品標籤設定，宣告 L2（各 handler 內既有的 roleLevel < 5 檢查更嚴，維持不動，兩者取交集）。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class LabelTemplatesController {
    constructor(private readonly templatesService: LabelTemplatesService) { }

    /**
     * 查詢所有模板
     * GET /api/label-templates
     */
    @Get()
    async findAll(
        @Query('isActive') isActive?: string,
        @Query('targetType') targetType?: string,
        @Query('controlLevel') controlLevel?: string,
    ) {
        return this.templatesService.findAll({
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            targetType,
            controlLevel,
        });
    }

    /**
     * 查詢單一模板
     * GET /api/label-templates/:id
     */
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.templatesService.findOne(id);
    }

    /**
     * 創建模板（幹部專用）
     * POST /api/label-templates
     */
    @Post()
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：建立標籤模板
    async create(
        @Body() body: {
            name: string;
            description?: string;
            targetTypes: string[];
            controlLevels: string[];
            width: number;
            height: number;
            layoutConfig: Record<string, any>;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        // 僅幹部可創建
        if (!user || (user.roleLevel ?? 0) < 5) {
            throw new ForbiddenException('僅幹部可創建模板');
        }

        return this.templatesService.create({
            ...body,
            createdBy: user.uid || user.id,
        });
    }

    /**
     * 更新模板（幹部專用）
     * PATCH /api/label-templates/:id
     */
    @Patch(':id')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：修改標籤模板
    async update(
        @Param('id') id: string,
        @Body() body: Partial<{
            name: string;
            description: string;
            targetTypes: string[];
            controlLevels: string[];
            width: number;
            height: number;
            layoutConfig: Record<string, any>;
            isActive: boolean;
        }>,
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user || (user.roleLevel ?? 0) < 5) {
            throw new ForbiddenException('僅幹部可編輯模板');
        }

        return this.templatesService.update(id, body);
    }

    /**
     * 啟用/停用模板
     * PATCH /api/label-templates/:id/active
     */
    @Patch(':id/active')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：啟用／停用模板
    async setActive(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user || (user.roleLevel ?? 0) < 5) {
            throw new ForbiddenException('僅幹部可啟用/停用模板');
        }

        return this.templatesService.setActive(id, isActive);
    }

    /**
     * 刪除模板（軟刪除）
     * DELETE /api/label-templates/:id
     */
    @Delete(':id')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：軟刪除模板
    async delete(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user || (user.roleLevel ?? 0) < 5) {
            throw new ForbiddenException('僅幹部可刪除模板');
        }

        await this.templatesService.delete(id);
        return { message: '模板已刪除' };
    }

    /**
     * 取得適用的模板
     * GET /api/label-templates/applicable
     */
    @Get('applicable/list')
    async getApplicable(
        @Query('targetType') targetType: 'lot' | 'asset' | 'bin',
        @Query('controlLevel') controlLevel: 'controlled' | 'medical' | 'asset',
    ) {
        return this.templatesService.getApplicableTemplates({
            targetType,
            controlLevel,
        });
    }
}
