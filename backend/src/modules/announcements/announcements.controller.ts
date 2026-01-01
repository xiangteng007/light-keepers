import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    AnnouncementsService,
    CreateAnnouncementDto,
    UpdateAnnouncementDto,
    AnnouncementFilter,
} from './announcements.service';
import { AnnouncementCategory, AnnouncementStatus, AnnouncementPriority } from './announcements.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('announcements')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class AnnouncementsController {
    constructor(private readonly announcementsService: AnnouncementsService) { }

    // ===== 公開 API =====

    // 取得已發布公告列表
    @Get()
    async findPublished(
        @Query('category') category?: AnnouncementCategory,
        @Query('priority') priority?: AnnouncementPriority,
        @Query('tag') tag?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: AnnouncementFilter = {
            category,
            priority,
            tag,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const announcements = await this.announcementsService.findPublished(filter);
        return {
            success: true,
            data: announcements,
            count: announcements.length,
        };
    }

    // 取得分類統計
    @Get('stats/categories')
    async getCategoryStats() {
        const stats = await this.announcementsService.getCategoryStats();
        return {
            success: true,
            data: stats,
        };
    }

    // 取得單一公告（並增加閱讀次數）
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const announcement = await this.announcementsService.findOne(id);

        // 增加閱讀次數
        await this.announcementsService.incrementViewCount(id);

        return {
            success: true,
            data: announcement,
        };
    }

    // ===== 管理員 API =====

    // 取得所有公告（包含草稿）
    @Get('admin/all')
    async findAll(
        @Query('status') status?: AnnouncementStatus,
        @Query('category') category?: AnnouncementCategory,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: AnnouncementFilter = {
            status,
            category,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const announcements = await this.announcementsService.findAll(filter);
        return {
            success: true,
            data: announcements,
            count: announcements.length,
        };
    }

    // 建立公告
    @Post()
    async create(@Body() dto: CreateAnnouncementDto) {
        const announcement = await this.announcementsService.create(dto);
        return {
            success: true,
            message: '公告已建立（草稿）',
            data: announcement,
        };
    }

    // 更新公告
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateAnnouncementDto,
    ) {
        const announcement = await this.announcementsService.update(id, dto);
        return {
            success: true,
            message: '公告已更新',
            data: announcement,
        };
    }

    // 發布公告
    @Patch(':id/publish')
    async publish(@Param('id') id: string) {
        const announcement = await this.announcementsService.publish(id);
        return {
            success: true,
            message: '公告已發布',
            data: announcement,
        };
    }

    // 取消發布
    @Patch(':id/unpublish')
    async unpublish(@Param('id') id: string) {
        const announcement = await this.announcementsService.unpublish(id);
        return {
            success: true,
            message: '公告已取消發布',
            data: announcement,
        };
    }

    // 封存公告
    @Patch(':id/archive')
    async archive(@Param('id') id: string) {
        const announcement = await this.announcementsService.archive(id);
        return {
            success: true,
            message: '公告已封存',
            data: announcement,
        };
    }

    // 切換置頂
    @Patch(':id/pin')
    async togglePin(@Param('id') id: string) {
        const announcement = await this.announcementsService.togglePin(id);
        return {
            success: true,
            message: announcement.isPinned ? '公告已置頂' : '已取消置頂',
            data: announcement,
        };
    }

    // 刪除公告
    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.announcementsService.delete(id);
        return {
            success: true,
            message: '公告已刪除',
        };
    }
}
