import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, ForbiddenException } from '@nestjs/common';
import { LabelTemplatesService } from './label-templates.service';

/**
 * 貼紙模板管理 API（幹部專用）
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
     * 創建模板（幹部專用）
     * POST /api/label-templates
     */
    @Post()
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
        @Request() req: any,
    ) {
        const user = req.user;

        // 僅幹部可創建
        if (!user || user.roleLevel < 5) {
            throw new ForbiddenException('僅幹部可創建模板');
        }

        return this.templatesService.create({
            ...body,
            createdBy: user.uid,
        });
    }

    /**
     * 更新模板（幹部專用）
     * PATCH /api/label-templates/:id
     */
    @Patch(':id')
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
        @Request() req: any,
    ) {
        const user = req.user;

        if (!user || user.roleLevel < 5) {
            throw new ForbiddenException('僅幹部可編輯模板');
        }

        return this.templatesService.update(id, body);
    }

    /**
     * 啟用/停用模板
     * PATCH /api/label-templates/:id/active
     */
    @Patch(':id/active')
    async setActive(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @Request() req: any,
    ) {
        const user = req.user;

        if (!user || user.roleLevel < 5) {
            throw new ForbiddenException('僅幹部可啟用/停用模板');
        }

        return this.templatesService.setActive(id, isActive);
    }

    /**
     * 刪除模板（軟刪除）
     * DELETE /api/label-templates/:id
     */
    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @Request() req: any,
    ) {
        const user = req.user;

        if (!user || user.roleLevel < 5) {
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
