import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { LabelTemplatesService } from './label-templates.service';

/**
 * 貼紙模板管理 API
 *
 * 授權（1.5b 修正：檔頭註解原寫「幹部專用」，實際 inline 檢查是 roleLevel < 5，
 * 也就是 L5 系統擁有者 (OWNER)。本次以宣告式 @RequiredLevel 對齊「實際行為」，
 * 維持 L5 不變，只是把註解與程式碼修成一致）：
 * - 查詢類 (findAll / findOne / getApplicable)：僅需登入（由 APP_GUARD GlobalAuthGuard 提供）
 * - 異動類 (create / update / setActive / delete)：L5 OWNER 系統擁有者
 */
@Controller('label-templates')
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
     * 創建模板（L5 系統擁有者專用）
     * POST /api/label-templates
     */
    @Post()
    @UseGuards(UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OWNER)
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

        return this.templatesService.create({
            ...body,
            createdBy: user.uid || user.id,
        });
    }

    /**
     * 更新模板（L5 系統擁有者專用）
     * PATCH /api/label-templates/:id
     */
    @Patch(':id')
    @UseGuards(UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OWNER)
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
    ) {
        return this.templatesService.update(id, body);
    }

    /**
     * 啟用/停用模板（L5 系統擁有者專用）
     * PATCH /api/label-templates/:id/active
     */
    @Patch(':id/active')
    @UseGuards(UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async setActive(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
    ) {
        return this.templatesService.setActive(id, isActive);
    }

    /**
     * 刪除模板（軟刪除，L5 系統擁有者專用）
     * DELETE /api/label-templates/:id
     */
    @Delete(':id')
    @UseGuards(UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async delete(
        @Param('id') id: string,
    ) {
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
