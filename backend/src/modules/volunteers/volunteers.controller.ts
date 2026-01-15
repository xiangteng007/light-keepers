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
import { VolunteersService, CreateVolunteerDto, UpdateVolunteerDto, VolunteerFilter, EligibilityFilter } from './volunteers.service';
import { VolunteerStatus } from './volunteers.entity';
// Use unified guards from SharedAuthModule
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('volunteers')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard) // 🔐 統一認證 + 權限守衛
@RequiredLevel(ROLE_LEVELS.OFFICER) // 預設需要幹部以上等級
export class VolunteersController {
    constructor(private readonly volunteersService: VolunteersService) { }

    // 🔐 志工註冊 - 需要幹部以上權限（由 class-level decorator 設定）
    @Post()
    async create(@Body() dto: CreateVolunteerDto) {
        const volunteer = await this.volunteersService.create(dto);
        return {
            success: true,
            message: '志工註冊成功',
            data: volunteer,
        };
    }

    // 🆕 進階篩選 - 用於任務派遣 (支援 PostGIS 距離篩選)
    @Post('find-eligible')
    async findEligible(@Body() filter: EligibilityFilter) {
        const volunteers = await this.volunteersService.findEligible(filter);
        return {
            success: true,
            data: volunteers,
            count: volunteers.length,
            filter: {
                skills: filter.skills,
                region: filter.region,
                maxDistanceMeters: filter.maxDistanceMeters,
                hasLocation: !!(filter.centerLat && filter.centerLng),
            },
        };
    }

    // 取得所有志工
    @Get()
    async findAll(
        @Query('status') status?: VolunteerStatus,
        @Query('region') region?: string,
        @Query('skill') skill?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: VolunteerFilter = {
            status,
            region,
            skill,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const volunteers = await this.volunteersService.findAll(filter);
        return {
            success: true,
            data: volunteers,
            count: volunteers.length,
        };
    }

    // 取得可用志工
    @Get('available')
    async findAvailable(
        @Query('region') region?: string,
        @Query('skill') skill?: string,
    ) {
        const volunteers = await this.volunteersService.findAvailable(region, skill);
        return {
            success: true,
            data: volunteers,
            count: volunteers.length,
        };
    }

    // 取得統計
    @Get('stats')
    async getStats() {
        const stats = await this.volunteersService.getStats();
        return {
            success: true,
            data: stats,
        };
    }

    // ===== 審核相關端點 =====

    // 取得待審核志工列表
    @Get('pending')
    async findPending() {
        const volunteers = await this.volunteersService.findPending();
        return {
            success: true,
            data: volunteers,
            count: volunteers.length,
        };
    }

    // 取得待審核數量
    @Get('pending/count')
    async getPendingCount() {
        const count = await this.volunteersService.getPendingCount();
        return {
            success: true,
            data: { count },
        };
    }

    // 取得已審核通過的志工（主志工列表）
    @Get('approved')
    async findApproved(
        @Query('status') status?: VolunteerStatus,
        @Query('region') region?: string,
        @Query('skill') skill?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: VolunteerFilter = {
            status,
            region,
            skill,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        };

        const volunteers = await this.volunteersService.findApproved(filter);
        return {
            success: true,
            data: volunteers,
            count: volunteers.length,
        };
    }

    // 審核通過
    @Post(':id/approve')
    async approve(
        @Param('id') id: string,
        @Body('approvedBy') approvedBy: string,
        @Body('note') note?: string,
    ) {
        const volunteer = await this.volunteersService.approve(id, approvedBy, note);
        return {
            success: true,
            message: '志工申請已核准',
            data: volunteer,
        };
    }

    // 拒絕申請
    @Post(':id/reject')
    async reject(
        @Param('id') id: string,
        @Body('rejectedBy') rejectedBy: string,
        @Body('note') note?: string,
    ) {
        const volunteer = await this.volunteersService.reject(id, rejectedBy, note);
        return {
            success: true,
            message: '志工申請已拒絕',
            data: volunteer,
        };
    }

    // 🔐 取得單一志工完整資料 - 需要幹部以上權限
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const volunteer = await this.volunteersService.findOne(id);
        return {
            success: true,
            data: volunteer,
        };
    }

    // 更新志工資料
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateVolunteerDto,
    ) {
        const volunteer = await this.volunteersService.update(id, dto);
        return {
            success: true,
            message: '更新成功',
            data: volunteer,
        };
    }

    // 更新可用狀態
    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: VolunteerStatus,
    ) {
        const volunteer = await this.volunteersService.updateStatus(id, status);
        return {
            success: true,
            message: `狀態已更新為 ${status}`,
            data: volunteer,
        };
    }

    // 刪除志工
    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.volunteersService.delete(id);
        return {
            success: true,
            message: '志工已刪除',
        };
    }
}
